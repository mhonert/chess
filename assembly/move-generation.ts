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
  BLACK_QUEEN_SIDE_CASTLING_BIT_PATTERN,
  BLACK_KING_SIDE_CASTLING_BIT_PATTERN,
  diagonalAttacks,
  horizontalAttacks,
  KING_PATTERNS,
  KNIGHT_PATTERNS,
  PAWN_DOUBLE_MOVE_LINE,
  verticalAttacks,
  WHITE_QUEEN_SIDE_CASTLING_BIT_PATTERN,
  WHITE_KING_SIDE_CASTLING_BIT_PATTERN
} from './bitboard';
import { sign } from './util';
import { fromFEN, STARTPOS } from './fen';


const MAX_MOVES = 218;

class MoveGenerator {
  private moves: StaticArray<i32> = new StaticArray<i32>(MAX_MOVES);
  private count: i32;
  private board: Board = fromFEN(STARTPOS);
  private occupiedBitBoard: u64;
  private emptyBitBoard: u64;
  private opponentBitBoard: u64;

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
    let bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateKnightMoves(activeColor, pos);
    }

    piece = BISHOP * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateBishopMoves(activeColor, piece, pos);
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateRookMoves(activeColor, piece, pos);
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece);
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

      const pawns = this.board.getBitBoard(PAWN);
      this.generateWhiteAttackPawnMoves(pawns);

    } else {
      const kingPos = board.findKingPosition(BLACK);
      const kingTargets = unchecked(KING_PATTERNS[kingPos]);
      this.generateMovesFromBitboard(KING, kingPos, kingTargets & this.opponentBitBoard);

      const pawns = this.board.getBitBoard(-PAWN);
      this.generateBlackAttackPawnMoves(pawns);
    }

    let piece = KNIGHT * activeColor;
    let bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const knightTargets = unchecked(KNIGHT_PATTERNS[pos]);
      // Captures
      this.generateMovesFromBitboard(KNIGHT, pos, knightTargets & this.opponentBitBoard);
    }

    piece = BISHOP * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos);
      // Captures
      this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const attacks = horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);
      // Captures
      this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos) |
                      horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);
      // Captures
      this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);
    }
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


  private generateWhitePawnMoves(): void {
    const pawns = this.board.getBitBoard(PAWN);

    this.generateWhiteStraightPawnMoves(pawns);
    this.generateWhiteAttackPawnMoves(pawns);
    this.generateWhiteEnPassantPawnMoves(pawns);
  }


  private generateWhiteStraightPawnMoves(pawns: u64): void {
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

  private generateWhiteAttackPawnMoves(pawns: u64): void {
    let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
    attackToLeft >>= 9;

    attackToLeft &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToLeft, 9);

    let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
    attackToRight >>= 7;

    attackToRight &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToRight, 7);
  }


  private generateWhiteEnPassantPawnMoves(pawns: u64): void {
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


  private generateBlackPawnMoves(): void {
    const pawns = this.board.getBitBoard(-PAWN);

    this.generateBlackStraightPawnMoves(pawns);
    this.generateBlackAttackPawnMoves(pawns);
    this.generateBlackEnPassantPawnMoves(pawns);
  }

  @inline
  private generateBlackStraightPawnMoves(pawns: u64): void {
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
  private generateBlackAttackPawnMoves(pawns: u64): void {
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
  private generateBlackEnPassantPawnMoves(pawns: u64): void {
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
  private generateKnightMoves(activeColor: i32, start: i32): void {
    const knightTargets = unchecked(KNIGHT_PATTERNS[start]);

    // Captures
    this.generateMovesFromBitboard(KNIGHT, start, knightTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(KNIGHT, start, knightTargets & this.emptyBitBoard);

  };

  @inline
  private generateMovesFromBitboard(piece: i32, start: i32, bitboard: u64): void {
    while (bitboard != 0) {
      const end: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << end; // unset bit
      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
    }
  }


  @inline
  private generateBishopMoves(activeColor: i32, piece: i32, pos: i32): void {
    const attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos);

    // Captures
    this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, pos, attacks & this.emptyBitBoard);
  };

  @inline
  private generateRookMoves(activeColor: i32, piece: i32, pos: i32): void {
    const attacks = horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);

    // Captures
    this.generateMovesFromBitboard(piece, pos, attacks & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, pos, attacks & this.emptyBitBoard);
  };

  @inline
  private generateQueenMoves(activeColor: i32, piece: i32, pos: i32): void {
    this.generateRookMoves(activeColor, piece, pos);
    this.generateBishopMoves(activeColor, piece, pos);
  };

  @inline
  private isValidWhiteKingSideCastlingMove(): bool {
    return ((this.emptyBitBoard & WHITE_KING_SIDE_CASTLING_BIT_PATTERN) == WHITE_KING_SIDE_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START + 1) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START + 2);
  }

  @inline
  private isValidWhiteQueenSideCastlingMove(): bool {
    return ((this.emptyBitBoard & WHITE_QUEEN_SIDE_CASTLING_BIT_PATTERN) == WHITE_QUEEN_SIDE_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START - 1) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START - 2);
  }

  @inline
  private isValidBlackKingSideCastlingMove(): bool {
    return ((this.emptyBitBoard & BLACK_KING_SIDE_CASTLING_BIT_PATTERN) == BLACK_KING_SIDE_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START + 1) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START + 2);
  }

  @inline
  private isValidBlackQueenSideCastlingMove(): bool {
    return ((this.emptyBitBoard & BLACK_QUEEN_SIDE_CASTLING_BIT_PATTERN) == BLACK_QUEEN_SIDE_CASTLING_BIT_PATTERN) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START - 1) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START - 2);
  }


  @inline
  private generateWhiteKingMoves(start: i32): void {
    const kingTargets = unchecked(KING_PATTERNS[start]);

    // Captures
    this.generateMovesFromBitboard(KING, start, kingTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(KING, start, kingTargets & this.emptyBitBoard);

    // Castling moves
    if (start != WHITE_KING_START) {
      return;
    }

    if (this.board.canWhiteCastleKingSide() && this.isValidWhiteKingSideCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start + 2));
    }

    if (this.board.canWhiteCastleQueenSide() && this.isValidWhiteQueenSideCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start - 2));
    }
  };


  @inline
  private generateBlackKingMoves(start: i32): void {
    const kingTargets = unchecked(KING_PATTERNS[start]);

    // Captures
    this.generateMovesFromBitboard(KING, start, kingTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(KING, start, kingTargets & this.emptyBitBoard);

    if (start != BLACK_KING_START) {
      return;
    }

    if (this.board.canBlackCastleKingSide() && this.isValidBlackKingSideCastlingMove()) {
      unchecked(this.moves[this.count++] = encodeMove(KING, start, start + 2));
    }

    if (this.board.canBlackCastleQueenSide() && this.isValidBlackQueenSideCastlingMove()) {
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

  @inline
  isValidMove(board: Board, activeColor: i32, move: i32): bool {
    this.board = board;
    this.count = 0;
    this.occupiedBitBoard = this.board.getAllPieceBitBoard(WHITE) | this.board.getAllPieceBitBoard(BLACK);
    this.opponentBitBoard = this.board.getAllPieceBitBoard(-activeColor);
    this.emptyBitBoard = ~this.occupiedBitBoard;

    const start = decodeStartIndex(move);
    const piece = this.board.getItem(start);
    if (piece == EMPTY || sign(piece) != activeColor) {
      return false;
    }

    switch (piece * activeColor) {
      case PAWN:
        if (activeColor == WHITE) {
          this.generateWhitePawnMoves();
        } else {
          this.generateBlackPawnMoves();
        }
        break;

      case KNIGHT:
        this.generateKnightMoves(activeColor, start);
        break;

      case BISHOP:
        this.generateBishopMoves(activeColor, BISHOP, start);
        break;

      case ROOK:
        this.generateRookMoves(activeColor, ROOK, start);
        break;

      case QUEEN:
        this.generateRookMoves(activeColor, QUEEN, start);
        this.generateBishopMoves(activeColor, QUEEN, start);
        break;

      case KING:
        if (activeColor == WHITE) {
          this.generateWhiteKingMoves(start);
        } else {
          this.generateBlackKingMoves(start);
        }
        break;

      default:
        throw new Error("Unexpected piece ID " + piece.toString());
    }

    return this.moves.includes(move);
  }

  @inline
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
    let bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateBishopMoves(activeColor, piece, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateRookMoves(activeColor, piece, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece);
    while (bitboard != 0) {
      const pos: i32 = i32(ctz(bitboard));
      bitboard ^= 1 << pos; // unset bit
      this.generateQueenMoves(activeColor, piece, pos);
    }
    if (this.anyMovesAllowCheckEvasion(activeColor)) {
      return true;
    }

    piece = KNIGHT * activeColor;
    bitboard = this.board.getBitBoard(piece);
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
export function isValidMove(board: Board, activeColor: i32, move: i32): bool {
  return DEFAULT_INSTANCE.isValidMove(board, activeColor, move);
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
