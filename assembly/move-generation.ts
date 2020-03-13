/*
 * A free and open source chess game using AssemblyScript and React
 * Copyright (C) 2020 mhonert (https://github.com/mhonert)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  BLACK,
  BLACK_KING_START,
  Board, EMPTY,
  indexFromColor,
  WHITE,
  WHITE_KING_START
} from './board';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from './pieces';
import {
  antiDiagonalAttacks,
  BLACK_BIG_CASTLING_BIT_PATTERN,
  BLACK_SMALL_CASTLING_BIT_PATTERN,
  diagonalAttacks,
  horizontalAttacks,
  KING_PATTERNS,
  KNIGHT_PATTERNS,
  PAWN_DOUBLE_MOVE_LINE,
  verticalAttacks,
  WHITE_BIG_CASTLING_BIT_PATTERN,
  WHITE_SMALL_CASTLING_BIT_PATTERN
} from './bitboard';
import { sign } from './util';


const MAX_MOVES = 218;

class MoveGenerator {
  private moves: StaticArray<i32> = new StaticArray<i32>(MAX_MOVES);
  private count: i32;
  private board: Board;
  private occupiedBitBoard: u64;
  private emptyBitBoard: u64;
  private opponentBitBoard: u64;
  private opponentOrEmptyBitboard: u64; // only available when counting moves


  generateMoves(board: Board, activeColor: i32): void {
    this.board = board;
    this.count = 0;
    this.occupiedBitBoard = this.board.getAllPieceBitBoard(WHITE) | this.board.getAllPieceBitBoard(BLACK);
    this.opponentBitBoard = this.board.getAllPieceBitBoard(-activeColor);
    this.emptyBitBoard = ~this.occupiedBitBoard;

    if (activeColor == WHITE) {
      const kingPos = board.findKingPosition(WHITE);
      this.generateWhiteKingMoves(kingPos);
      this.generateWhitePawnMoves();

    } else {
      const kingPos = board.findKingPosition(BLACK);
      this.generateBlackKingMoves(kingPos);
      this.generateBlackPawnMoves();
    }

    let piece = KNIGHT * activeColor;
    let bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateKnightMoves(activeColor, pos);
    }

    piece = BISHOP * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateBishopMoves(activeColor, piece, pos);
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateRookMoves(activeColor, piece, pos);
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateQueenMoves(activeColor, piece, pos);
    }

  }

  generateCaptureMoves(board: Board, activeColor: i32): void {
    this.board = board;
    this.count = 0;
    this.occupiedBitBoard = this.board.getAllPieceBitBoard(WHITE) | this.board.getAllPieceBitBoard(BLACK);
    this.opponentBitBoard = this.board.getAllPieceBitBoard(-activeColor);
    this.emptyBitBoard = ~this.occupiedBitBoard;

    if (activeColor == WHITE) {
      const kingPos = board.findKingPosition(WHITE);
      const kingTargets = unchecked(KING_PATTERNS[kingPos]);
      this.generateMovesFromBitboard(KING, kingPos, kingTargets & this.opponentBitBoard);

      const pawns = this.board.getBitBoard(PAWN + 6);
      this.generateWhiteAttackPawnMoves(pawns);

    } else {
      const kingPos = board.findKingPosition(BLACK);
      const kingTargets = unchecked(KING_PATTERNS[kingPos]);
      this.generateMovesFromBitboard(KING, kingPos, kingTargets & this.opponentBitBoard);

      const pawns = this.board.getBitBoard(-PAWN + 6);
      this.generateBlackAttackPawnMoves(pawns);
    }

    let piece = KNIGHT * activeColor;
    let bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const knightTargets = unchecked(KNIGHT_PATTERNS[pos]);
      // Captures
      this.generateMovesFromBitboard(KNIGHT, pos, knightTargets & this.opponentBitBoard);
    }

    piece = BISHOP * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos);
      // Captures
      this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const attacks = horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);
      // Captures
      this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos) |
                      horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);
      // Captures
      this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);
    }
  }

  mainPieceMoveCount(board: Board, activeColor: i32): i32 {
    this.board = board;
    this.occupiedBitBoard = this.board.getAllPieceBitBoard(WHITE) | this.board.getAllPieceBitBoard(BLACK);
    this.opponentBitBoard = this.board.getAllPieceBitBoard(-activeColor);
    this.emptyBitBoard = ~this.occupiedBitBoard;
    this.opponentOrEmptyBitboard = this.opponentBitBoard | this.emptyBitBoard;

    let count: i32 = 0;
    let piece = KNIGHT * activeColor;
    let bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      count += this.countKnightMoves(activeColor, pos);
    }

    piece = BISHOP * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      count += this.countBishopMoves(activeColor, pos);
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      count += this.countRookMoves(activeColor, pos);
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      count += this.countQueenMoves(activeColor, pos);
    }

    return count;
  }

  @inline
  isLikelyValidMove(board: Board, activeColor: i32, move: i32): bool {
    const start = decodeStartIndex(move);
    const piece = board.getItem(start);
    if (piece == EMPTY || sign(piece) != activeColor) {
      return false;
    }

    const end = decodeEndIndex(move);
    const targetPiece = board.getItem(end);

    return (targetPiece == EMPTY || sign(targetPiece) != activeColor);
  }

  getGeneratedMoves(): StaticArray<i32> {
    return StaticArray.slice(this.moves, 0, this.count);
  }


  // Filters out any moves that would leave the own king in check.
  getFilteredGeneratedMoves(activeColor: i32): StaticArray<i32> {
    const filteredMoves: StaticArray<i32> = new StaticArray<i32>(this.moves.length);

    let index = 0;
    for (let i = 0; i < this.count; i++) {
      const startIndex = decodeStartIndex(this.moves[i]);
      if (DEFAULT_INSTANCE.moveResultsInCheck(decodePiece(this.moves[i]), startIndex, decodeEndIndex(this.moves[i]), activeColor)) {
        continue;
      }

      unchecked(filteredMoves[index++] = this.moves[i]);
    }

    return StaticArray.slice(filteredMoves, 0, index);
  }


  @inline
  generateWhitePawnMoves(): void {
    const pawns = this.board.getBitBoard(PAWN + 6);

    this.generateWhiteStraightPawnMoves(pawns);
    this.generateWhiteAttackPawnMoves(pawns);
    this.generateWhiteEnPassantPawnMoves(pawns);
  }


  @inline
  generateWhiteStraightPawnMoves(pawns: u64): void {
    // Single move
    pawns >>= 8;

    let bitboard = pawns & this.emptyBitBoard;
    this.generatePawnMovesFromBitboard(bitboard, 8);

    // Double move
    bitboard &= unchecked(PAWN_DOUBLE_MOVE_LINE[indexFromColor(WHITE)]);
    bitboard >>= 8;

    bitboard &= this.emptyBitBoard;
    this.generatePawnMovesWithoutPromotion(bitboard, 16);
  }

  @inline
  generateWhiteAttackPawnMoves(pawns: u64): void {
    let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
    attackToLeft >>= 9;

    attackToLeft &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToLeft, 9);

    let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
    attackToRight >>= 7;

    attackToRight &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToRight, 7);
  }


  @inline
  generateWhiteEnPassantPawnMoves(pawns: u64): void {
    let enPassant = this.board.getEnPassantStateBits() & 0xff;

    if (enPassant != 0) {
      const end = 16 + ctz(enPassant);
      if (enPassant != 0b10000000) {
        const start = end + 9;
        if ((pawns & (1 << start)) != 0) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }

      if (enPassant != 0b00000001) {
        const start = end + 7
        if ((pawns & (1 << start)) != 0) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }
    }
  }


  @inline
  generateBlackPawnMoves(): void {
    const pawns = this.board.getBitBoard(-PAWN + 6);

    this.generateBlackStraightPawnMoves(pawns);
    this.generateBlackAttackPawnMoves(pawns);
    this.generateBlackEnPassantPawnMoves(pawns);
  }

  @inline
  generateBlackStraightPawnMoves(pawns: u64): void {
    // Single move
    pawns <<= 8;

    let bitboard = pawns & this.emptyBitBoard;
    this.generatePawnMovesFromBitboard(bitboard, -8);

    // Double move
    bitboard &= unchecked(PAWN_DOUBLE_MOVE_LINE[indexFromColor(BLACK)]);
    bitboard <<= 8;

    bitboard &= this.emptyBitBoard;
    this.generatePawnMovesWithoutPromotion(bitboard, -16);
  }

  @inline
  generateBlackAttackPawnMoves(pawns: u64): void {
    let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
    attackToLeft <<= 7;

    attackToLeft &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToLeft, -7);

    let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
    attackToRight <<= 9;

    attackToRight &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToRight, -9);
  }


  @inline
  generateBlackEnPassantPawnMoves(pawns: u64): void {
    let enPassant = this.board.getEnPassantStateBits() >> 8;

    if (enPassant != 0) {
      const end = 40 + ctz(enPassant);
      if (enPassant != 0b00000001) {
        const start = end - 9;
        if ((pawns & (1 << start)) != 0) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }

      if (enPassant != 0b10000000) {
        const start = end - 7;
        if ((pawns & (1 << start)) != 0) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }
    }
  }


  @inline
  private generatePawnMovesFromBitboard(bitboard: u64, direction: i32): void {
    while (bitboard != 0) {
      const end: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << end; // unset bit
      const start = end + direction;

      if (end <= 7 || end >= 56) {
        // Promotion
        unchecked(this.moves[this.count++] = encodeMove(KNIGHT, start, end));
        unchecked(this.moves[this.count++] = encodeMove(BISHOP, start, end));
        unchecked(this.moves[this.count++] = encodeMove(ROOK, start, end));
        unchecked(this.moves[this.count++] = encodeMove(QUEEN, start, end));
      } else {
        // Normal move
        unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
      }
    }
  }

  @inline
  private generatePawnMovesWithoutPromotion(bitboard: u64, direction: i32): void {
    while (bitboard != 0) {
      const end: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << end; // unset bit
      const start = end + direction;

      // Normal move
      unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
    }
  }

  @inline
  generateKnightMoves(activeColor: i32, start: i32): void {
    const knightTargets = unchecked(KNIGHT_PATTERNS[start]);

    // Captures
    this.generateMovesFromBitboard(KNIGHT, start, knightTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(KNIGHT, start, knightTargets & this.emptyBitBoard);

  };

  @inline
  countKnightMoves(activeColor: i32, start: i32): i32 {
    const knightTargets = unchecked(KNIGHT_PATTERNS[start]);

    return i32(popcnt(knightTargets & this.opponentOrEmptyBitboard));
  };

  @inline
  generateMovesFromBitboard(piece: i32, start: i32, bitboard: u64): void {
    while (bitboard != 0) {
      const end: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << end; // unset bit
      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
    }
  }


  @inline
  generateBishopMoves(activeColor: i32, piece: i32, pos: i32): void {
    const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos);

    // Captures
    this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, pos, attacks & this.emptyBitBoard);
  };

  @inline
  countBishopMoves(activeColor: i32, pos: i32): i32 {
    const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos);
    return i32(popcnt(attacks & this.opponentOrEmptyBitboard));
  };

  @inline
  generateRookMoves(activeColor: i32, piece: i32, pos: i32): void {
    const attacks = horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);

    // Captures
    this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, pos, attacks & this.emptyBitBoard);
  };

  @inline
  countRookMoves(activeColor: i32, pos: i32): i32 {
    const attacks = horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);
    return i32(popcnt(attacks & this.opponentOrEmptyBitboard));
  };

  @inline
  generateQueenMoves(activeColor: i32, piece: i32, pos: i32): void {
    this.generateRookMoves(activeColor, piece, pos);
    this.generateBishopMoves(activeColor, piece, pos);
  };

  @inline
  countQueenMoves(activeColor: i32, pos: i32): i32 {
    return this.countBishopMoves(activeColor, pos) + this.countRookMoves(activeColor, pos);
  };

  @inline
  isValidWhiteSmallCastlingMove(): bool {
    return ((this.emptyBitBoard & WHITE_SMALL_CASTLING_BIT_PATTERN) == WHITE_SMALL_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START + 1) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START + 2);
  }

  @inline
  isValidWhiteBigCastlingMove(): bool {
    return ((this.emptyBitBoard & WHITE_BIG_CASTLING_BIT_PATTERN) == WHITE_BIG_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START - 1) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START - 2);
  }

  @inline
  isValidBlackSmallCastlingMove(): bool {
    return ((this.emptyBitBoard & BLACK_SMALL_CASTLING_BIT_PATTERN) == BLACK_SMALL_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START + 1) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START + 2);
  }

  @inline
  isValidBlackBigCastlingMove(): bool {
    return ((this.emptyBitBoard & BLACK_BIG_CASTLING_BIT_PATTERN) == BLACK_BIG_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START - 1) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START - 2);
  }


  @inline
  generateWhiteKingMoves(start: i32): void {
    const kingTargets = unchecked(KING_PATTERNS[start]);

    // Captures
    this.generateMovesFromBitboard(KING, start, kingTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(KING, start, kingTargets & this.emptyBitBoard);

    // Castling moves
    if (start != WHITE_KING_START || this.board.whiteKingMoved()) {
      return;
    }

    if (!this.board.whiteRightRookMoved() && this.isValidWhiteSmallCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start + 2));
    }

    if (!this.board.whiteLeftRookMoved() && this.isValidWhiteBigCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start - 2));
    }
  };


  @inline
  generateBlackKingMoves(start: i32): void {
    const kingTargets = unchecked(KING_PATTERNS[start]);

    // Captures
    this.generateMovesFromBitboard(KING, start, kingTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(KING, start, kingTargets & this.emptyBitBoard);

    if (start != BLACK_KING_START || this.board.blackKingMoved()) {
      return;
    }

    if (!this.board.blackRightRookMoved() && this.isValidBlackSmallCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start + 2));
    }

    if (!this.board.blackLeftRookMoved() && this.isValidBlackBigCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start - 2));
    }
  };


  @inline
  private moveResultsInCheck(pieceId: i32, start: i32, end: i32, activeColor: i32): bool {
    const previousPiece = this.board.getItem(start); // might be different from piece in case of pawn promotions

    const removedFigure = this.board.performMove(pieceId, start, end);
    const check = this.board.isInCheck(activeColor);

    this.board.undoMove(previousPiece, start, end, removedFigure);

    return check;
  };

  hasValidMoves(board: Board, activeColor: i32): bool {
    this.board = board;
    this.count = 0;
    this.occupiedBitBoard = this.board.getAllPieceBitBoard(WHITE) | this.board.getAllPieceBitBoard(BLACK);
    this.opponentBitBoard = this.board.getAllPieceBitBoard(-activeColor);
    this.emptyBitBoard = ~this.occupiedBitBoard;

    if (activeColor == WHITE) {
      const kingPos = board.findKingPosition(WHITE);
      this.generateWhiteKingMoves(kingPos);
      if (this.anyMovesAllowCheckEvasion(activeColor)) {
        return true;
      }

    } else {
      const kingPos = board.findKingPosition(BLACK);
      this.generateBlackKingMoves(kingPos);
      if (this.anyMovesAllowCheckEvasion(activeColor)) {
        return true;
      }
    }

    let piece = BISHOP * activeColor;
    let bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateBishopMoves(activeColor, piece, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateRookMoves(activeColor, piece, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateQueenMoves(activeColor, piece, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    piece = KNIGHT * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateKnightMoves(activeColor, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    if (activeColor == WHITE) {
      this.generateWhitePawnMoves();
      return this.anyMovesAllowCheckEvasion(activeColor);

    } else {
      this.generateBlackPawnMoves();
      return this.anyMovesAllowCheckEvasion(activeColor);

    }
  }

  @inline
  private anyMovesAllowCheckEvasion(activeColor: i32): bool {
    for (let i = 0; i < this.count; i++) {
      const move = unchecked(this.moves[i]);
      if (!this.moveResultsInCheck(decodePiece(move), decodeStartIndex(move), decodeEndIndex(move), activeColor)) {
        return true;
      }
    }

    this.count = 0;
    return false;
  }

}


const DEFAULT_INSTANCE = new MoveGenerator();
const MATE_CHECK_INSTANCE = new MoveGenerator();

@inline
export function generateMoves(board: Board, activeColor: i32): StaticArray<i32> {
  DEFAULT_INSTANCE.generateMoves(board, activeColor);
  return DEFAULT_INSTANCE.getGeneratedMoves();
}

// Generates and filters out any moves that would leave the own king in check.
export function generateFilteredMoves(board: Board, activeColor: i32): StaticArray<i32> {
  DEFAULT_INSTANCE.generateMoves(board, activeColor);
  return DEFAULT_INSTANCE.getFilteredGeneratedMoves(activeColor);
}

@inline
export function generateCaptureMoves(board: Board, activeColor: i32): StaticArray<i32> {
  DEFAULT_INSTANCE.generateCaptureMoves(board, activeColor);
  return DEFAULT_INSTANCE.getGeneratedMoves();
}

@inline
export function mainPieceMoveCount(board: Board, activeColor: i32): i32 {
  return DEFAULT_INSTANCE.mainPieceMoveCount(board, activeColor);
}

@inline
export function isLikelyValidMove(board: Board, activeColor: i32, move: i32): bool {
  return DEFAULT_INSTANCE.isLikelyValidMove(board, activeColor, move);
}

@inline
export function isCheckMate(board: Board, activeColor: i32): bool {
  if (!board.isInCheck(activeColor)) {
    return false;
  }

  return !MATE_CHECK_INSTANCE.hasValidMoves(board, activeColor);
}


// Helper functions

@inline
export function encodeMove(piece: i32, start: i32, end: i32): i32 {
  return abs(piece) | (start << 3) | (end << 10);
}

@inline
export function decodePiece(encodedMove: i32): i32 {
  return encodedMove & 0x7;
}

@inline
export function decodeStartIndex(encodedMove: i32): i32 {
  return (encodedMove >> 3) & 0x7F;
}

@inline
export function decodeEndIndex(encodedMove: i32): i32 {
  return (encodedMove >> 10) & 0x7F;
}


@inline
export function encodeScoredMove(move: i32, score: i32): i32 {
  if (score < 0) {
    return move | 0x80000000 | (-score << 17);

  } else {
    return move | (score << 17);
  }
}

@inline
export function decodeScore(scoredMove: i32): i32 {
  return (scoredMove & 0x80000000) != 0
    ? -((scoredMove & 0x7FFE0000) >>> 17)
    : scoredMove >>> 17;
}

@inline
export function decodeMove(scoredMove: i32): i32 {
  return scoredMove & 0x1FFFF;
}
