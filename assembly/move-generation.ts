/*
 * A free and open source chess game using AssemblyScript and React
 * Copyright (C) 2019 mhonert (https://github.com/mhonert)
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
  Board,
  BOARD_BORDER,
  EMPTY,
  indexFromColor,
  MAX_FIELD_DISTANCE,
  WHITE,
  WHITE_KING_START
} from './board';
import { BISHOP, KING, KING_DIRECTIONS, KNIGHT, PAWN, QUEEN, ROOK } from './pieces';
import { sameColor, toBitBoardString } from './util';
import {
  antiDiagonalAttacks,
  diagonalAttacks,
  horizontalAttacks,
  KNIGHT_PATTERNS,
  PAWN_DOUBLE_MOVE_LINE, verticalAttacks
} from './bitboard';


const MAX_MOVES = 218;

class MoveGenerator {
  private moves: Int32Array = new Int32Array(MAX_MOVES);
  private count: i32;
  private board: Board;
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
      this.generateWhitePawnMoves();
    } else {
      this.generateBlackPawnMoves();
    }

    let piece = KNIGHT * activeColor;
    let bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u32 = u32(ctz(bitboard));
      bitboard ^= 1 << bitPos; // unset bit
      const pos = 21 + (bitPos & 7) + ((bitPos >> 3) * 10) // calculate letter board position from bit index
      this.generateKnightMoves(activeColor, piece, bitPos, pos);
    }

    piece = BISHOP * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const pos = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      this.generateBishopMoves(activeColor, piece, pos, i32(bitPos));
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const pos = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      this.generateRookMoves(activeColor, piece, pos, i32(bitPos));
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u32 = u32(ctz(bitboard));
      bitboard ^= 1 << bitPos; // unset bit
      const pos = 21 + (bitPos & 7) + ((bitPos >> 3) * 10); // calculate letter board position from bit index
      this.generateQueenMoves(activeColor, piece, pos, i32(bitPos));
    }

    // King moves
    const pos = board.findKingPosition(activeColor);
    this.generateKingMoves(activeColor, KING * activeColor, pos);

  }

  getGeneratedMoves(): Int32Array {
    return this.moves.slice(0, this.count);
  }


  // Filters out any moves that would leave the own king in check.
  getFilteredGeneratedMoves(activeColor: i32): Int32Array {
    const filteredMoves: Int32Array = new Int32Array(this.moves.length);

    let index = 0;
    for (let i = 0; i < this.count; i++) {
      const startIndex = decodeStartIndex(this.moves[i]);
      if (DEFAULT_INSTANCE.moveResultsInCheck(decodePiece(this.moves[i]), startIndex, decodeEndIndex(this.moves[i]), activeColor)) {
        continue;
      }

      unchecked(filteredMoves[index++] = this.moves[i]);
    }

    return filteredMoves.subarray(0, index);
  }


  @inline
  generateWhitePawnMoves(): void {
    const pawns = this.board.getBitBoard(PAWN + 6);

    this.generateWhiteStraightPawnMoves(pawns);
    this.generateWhiteAttackPawnMoves( pawns);
    this.generateWhiteEnPassantPawnMoves();
  }


  generateWhiteStraightPawnMoves(pawns: u64): void {
    // Single move
    pawns >>= 8;

    let bitboard = pawns & this.emptyBitBoard;
    this.generatePawnMovesFromBitboard(bitboard, 10);

    // Double move
    bitboard &= unchecked(PAWN_DOUBLE_MOVE_LINE[indexFromColor(WHITE)]);
    bitboard >>= 8;

    bitboard &= this.emptyBitBoard;
    this.generatePawnMovesWithoutPromotion(bitboard, 20);
  }

  generateWhiteAttackPawnMoves(pawns: u64): void {
    let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
    attackToLeft >>= 9;

    attackToLeft &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToLeft, 11);

    let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
    attackToRight >>= 7;

    attackToRight &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToRight, 9);
  }


  generateWhiteEnPassantPawnMoves(): void {
    let enPassant = this.board.getEnPassantStateBits() & 0xff;

    if (enPassant != 0) {
      const end = 41 + ctz(enPassant);
      if (enPassant != 0b10000000) {
        const start = end + 11;
        if (this.board.getItem(start) == PAWN) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }

      if (enPassant != 0b00000001) {
        const start = end + 9
        if (this.board.getItem(start) == PAWN) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }
    }
  }


  @inline
  generateBlackPawnMoves(): void {
    const pawns = this.board.getBitBoard(-PAWN + 6);

    this.generateBlackStraightPawnMoves(pawns);
    this.generateBlackAttackPawnMoves( pawns);
    this.generateBlackEnPassantPawnMoves();
  }

  generateBlackStraightPawnMoves(pawns: u64): void {
    // Single move
    pawns <<= 8;

    let bitboard = pawns & this.emptyBitBoard;
    this.generatePawnMovesFromBitboard(bitboard, -10);

    // Double move
    bitboard &= unchecked(PAWN_DOUBLE_MOVE_LINE[indexFromColor(BLACK)]);
    bitboard <<= 8;

    bitboard &= this.emptyBitBoard;
    this.generatePawnMovesWithoutPromotion(bitboard, -20);
  }

  generateBlackAttackPawnMoves(pawns: u64): void {
    let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
    attackToLeft <<= 7;

    attackToLeft &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToLeft, -9);

    let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
    attackToRight <<= 9;

    attackToRight &= this.opponentBitBoard;
    this.generatePawnMovesFromBitboard(attackToRight, -11);
  }


  generateBlackEnPassantPawnMoves(): void {
    let enPassant = this.board.getEnPassantStateBits() >> 8;

    if (enPassant != 0) {
      const end = 71 + ctz(enPassant);
      if (enPassant != 0b00000001) {
        const start = end - 11;
        if (this.board.getItem(start) == -PAWN) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }

      if (enPassant != 0b10000000) {
        const start = end - 9;
        if (this.board.getItem(start) == -PAWN) {
          unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
        }
      }
    }
  }


  @inline
  private generatePawnMovesFromBitboard(bitboard: u64, direction: i32): void {
    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const end = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      const start = end + direction;

      if (end <= 28 || end >= 91) {
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
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const end = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      const start = end + direction;

      // Normal move
      unchecked(this.moves[this.count++] = encodeMove(PAWN, start, end));
    }
  }

  generateKnightMoves(activeColor: i32, piece: i32, bitStartPos: i32, start: i32): void {
    const knightTargets = unchecked(KNIGHT_PATTERNS[bitStartPos]);

    // Captures
    this.generateMovesFromBitboard(piece, start, knightTargets & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, start, knightTargets & this.emptyBitBoard);

  };

  @inline
  generateMovesFromBitboard(piece: i32, start: i32, bitboard: u64): void {
    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const end = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
    }
  }


  @inline
  generateBishopMoves(activeColor: i32, piece: i32, start: i32, pos: i32): void {
    let attacks = diagonalAttacks(this.occupiedBitBoard, pos) | antiDiagonalAttacks(this.occupiedBitBoard, pos);

    // Captures
    this.generateMovesFromBitboard(piece, start, attacks & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, start, attacks & this.emptyBitBoard);
  };

  @inline
  generateRookMoves(activeColor: i32, piece: i32, start: i32, pos: i32): void {
    let attacks = horizontalAttacks(this.occupiedBitBoard, pos) | verticalAttacks(this.occupiedBitBoard, pos);

    // Captures
    this.generateMovesFromBitboard(piece, start, attacks & this.opponentBitBoard);

    // Normal moves
    this.generateMovesFromBitboard(piece, start, attacks & this.emptyBitBoard);
  };


  generateQueenMoves(activeColor: i32, piece: i32, start: i32, pos: i32): void {
    // reuse move generators
    this.generateBishopMoves(activeColor, piece, start, pos);
    this.generateRookMoves(activeColor, piece, start, pos);
  };


  @inline
  isValidWhiteSmallCastlingMove(): bool {
    return (this.board.isEmpty(WHITE_KING_START + 1) && this.board.isEmpty(WHITE_KING_START + 2)) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START + 1) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START + 2);
  }

  @inline
  isValidWhiteBigCastlingMove(): bool {
    return this.board.isEmpty(WHITE_KING_START - 1) && this.board.isEmpty(WHITE_KING_START - 2) &&
      this.board.isEmpty(WHITE_KING_START - 3) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START - 1) &&
      !this.board.isAttacked(BLACK, WHITE_KING_START - 2);
  }

  @inline
  isValidBlackSmallCastlingMove(): bool {
    return this.board.isEmpty(BLACK_KING_START + 1) && this.board.isEmpty(BLACK_KING_START + 2) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START + 1) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START + 2);
  }

  @inline
  isValidBlackBigCastlingMove(): bool {
    return this.board.isEmpty(BLACK_KING_START - 1) && this.board.isEmpty(BLACK_KING_START - 2) && this.board.isEmpty(BLACK_KING_START - 3) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START - 1) &&
      !this.board.isAttacked(WHITE, BLACK_KING_START - 2);
  }


  generateKingMoves(activeColor: i32, piece: i32, start: i32): void {
    for (let i = 0; i < KING_DIRECTIONS.length; i++) {
      const end = start + unchecked(KING_DIRECTIONS[i]);

      const targetPiece = this.board.getItem(end);
      if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
        continue;
      }

      if (targetPiece == BOARD_BORDER) {
        continue;
      }

      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
    }

    if (activeColor == WHITE && start == WHITE_KING_START && !this.board.whiteKingMoved()) {
      if (!this.board.whiteRightRookMoved() && this.isValidWhiteSmallCastlingMove()) {
        unchecked(this.moves[this.count++] = encodeMove(piece, start, start + 2));
      }

      if (!this.board.whiteLeftRookMoved() && this.isValidWhiteBigCastlingMove()) {
        unchecked(this.moves[this.count++] = encodeMove(piece, start, start - 2));
      }

    } else if (activeColor == BLACK && start == BLACK_KING_START && !this.board.blackKingMoved()) {
      if (!this.board.blackRightRookMoved() && this.isValidBlackSmallCastlingMove()) {
        unchecked(this.moves[this.count++] = encodeMove(piece, start, start + 2));
      }

      if (!this.board.blackLeftRookMoved() && this.isValidBlackBigCastlingMove()) {
        unchecked(this.moves[this.count++] = encodeMove(piece, start, start - 2));
      }
    }
  };


  moveResultsInCheck(pieceId: i32, start: i32, end: i32, activeColor: i32): bool {
    const previousPiece = this.board.getItem(start); // might be different from piece in case of pawn promotions

    const removedFigure = this.board.performMove(pieceId, start, end);
    const check = this.board.isInCheck(activeColor);

    this.board.undoMove(previousPiece, start, end, removedFigure);

    return check;
  };

  hasNoValidMoves(activeColor: i32): bool {
    for (let i = 0; i < this.count; i++) {
      const move = unchecked(this.moves[i]);
      if (!this.moveResultsInCheck(decodePiece(move), decodeStartIndex(move), decodeEndIndex(move), activeColor)) {
        return false;
      }
    }
    return true;
  }

}


const DEFAULT_INSTANCE = new MoveGenerator();
const MATE_CHECK_INSTANCE = new MoveGenerator();

@inline
export function generateMoves(board: Board, activeColor: i32): Int32Array {
  DEFAULT_INSTANCE.generateMoves(board, activeColor);
  return DEFAULT_INSTANCE.getGeneratedMoves();
}

// Generates and filters out any moves that would leave the own king in check.
export function generateFilteredMoves(board: Board, activeColor: i32): Int32Array {
  DEFAULT_INSTANCE.generateMoves(board, activeColor);
  return DEFAULT_INSTANCE.getFilteredGeneratedMoves(activeColor);
}


@inline
export function isCheckMate(board: Board, activeColor: i32): bool {
  if (!board.isInCheck(activeColor)) {
    return false;
  }

  MATE_CHECK_INSTANCE.generateMoves(board, activeColor);
  return MATE_CHECK_INSTANCE.hasNoValidMoves(activeColor);
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
