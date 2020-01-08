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
  BLACK_PAWNS_BASELINE_END,
  BLACK_PAWNS_BASELINE_START,
  Board,
  BOARD_BORDER,
  EMPTY, KNIGHT_PATTERNS, MAX_FIELD_DISTANCE,
  WHITE,
  WHITE_KING_START,
  WHITE_PAWNS_BASELINE_END,
  WHITE_PAWNS_BASELINE_START
} from './board';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from './pieces';
import { differentColor, sameColor, sign, toBitBoardString, toInt32Array } from './util';


const MAX_MOVES = 218;

export const KNIGHT_DIRECTIONS: Int32Array = toInt32Array([21, 19, 12, 8, -12, -21, -19, -8]);
const KING_DIRECTIONS: Int32Array = toInt32Array([1, 10, -1, -10, 9, 11, -9, -11]);


class MoveGenerator {
  private moves: Int32Array = new Int32Array(MAX_MOVES);
  private count: i32;
  private board: Board;
  private occupiedBitBoard: u64;
  private opponentOrEmpty: u64;

  generateMoves(board: Board, activeColor: i32): void {
    this.board = board;
    this.count = 0;
    this.occupiedBitBoard = this.board.getAllPieceBitBoard(WHITE) | this.board.getAllPieceBitBoard(BLACK);
    this.opponentOrEmpty = ~this.board.getAllPieceBitBoard(activeColor);

    let piece = PAWN * activeColor;
    let bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const pos = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      this.generatePawnMoves(activeColor, piece, pos);
    }

    piece = KNIGHT * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
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
      this.generateBishopMoves(activeColor, piece, pos);
    }

    piece = ROOK * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const pos = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      this.generateRookMoves(activeColor, piece, pos);
    }

    piece = QUEEN * activeColor;
    bitboard = this.board.getBitBoard(piece + 6);
    while (bitboard != 0) {
      const bitPos: u32 = u32(ctz(bitboard));
      bitboard ^= 1 << bitPos; // unset bit
      const pos = 21 + (bitPos & 7) + ((bitPos >> 3) * 10); // calculate letter board position from bit index
      this.generateQueenMoves(activeColor, piece, pos);
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


  generatePawnMoves(activeColor: i32, piece: i32, start: i32): void {
    const moveDirection = -activeColor;

    if ((activeColor == WHITE && start < 39) || (activeColor == BLACK && start > 80)) {
      this.generateDiagonalPawnMove(activeColor, piece, start, start + 9 * moveDirection, true);
      this.generateStraightPawnMove(activeColor, piece, start, start + 10 * moveDirection, true);
      this.generateDiagonalPawnMove(activeColor, piece, start, start + 11 * moveDirection, true);
      return;
    }

    this.generateDiagonalPawnMove(activeColor, piece, start, start + 9 * moveDirection, false);
    this.generateStraightPawnMove(activeColor, piece, start, start + 10 * moveDirection, false);
    this.generateDiagonalPawnMove(activeColor, piece, start, start + 11 * moveDirection, false);

    if (activeColor == WHITE && start >= WHITE_PAWNS_BASELINE_START && start <= WHITE_PAWNS_BASELINE_END) {
      this.generateStraightDoublePawnMove(activeColor, piece, start, start + 20 * moveDirection);
    } else if (activeColor == BLACK && start >= BLACK_PAWNS_BASELINE_START && start <= BLACK_PAWNS_BASELINE_END) {
      this.generateStraightDoublePawnMove(activeColor, piece, start, start + 20 * moveDirection);
    }
  };


  generateStraightPawnMove(activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): void {
    if (!this.board.isEmpty(end)) {
      return;
    }

    if (createPromotions) {
      unchecked(this.moves[this.count++] = encodeMove(KNIGHT, start, end));
      unchecked(this.moves[this.count++] = encodeMove(BISHOP, start, end));
      unchecked(this.moves[this.count++] = encodeMove(ROOK, start, end));
      unchecked(this.moves[this.count++] = encodeMove(QUEEN, start, end));

    } else {
      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));

    }
  }

  generateStraightDoublePawnMove(activeColor: i32, piece: i32, start: i32, end: i32): void {
    if (!this.board.isEmpty(end)) {
      return;
    }

    const direction = -activeColor;
    if (!this.board.isEmpty(start + direction * 10)) {
      return;
    }

    unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
  }

  generateDiagonalPawnMove(activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): void {
    const targetPiece = this.board.getItem(end);
    if (targetPiece == BOARD_BORDER) {
      return;
    }

    if (targetPiece == EMPTY) {
      if (!this.board.isEnPassentPossible(activeColor, end)) {
        return;
      }
    } else if (!differentColor(targetPiece, activeColor)) {
      return;
    }

    if (createPromotions) {
      unchecked(this.moves[this.count++] = encodeMove(KNIGHT, start, end));
      unchecked(this.moves[this.count++] = encodeMove(BISHOP, start, end));
      unchecked(this.moves[this.count++] = encodeMove(ROOK, start, end));
      unchecked(this.moves[this.count++] = encodeMove(QUEEN, start, end));

    } else {
      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));

    }
  }

  generateKnightMoves(activeColor: i32, piece: i32, bitStartPos: i32, start: i32): void {
    const knightTargets = unchecked(KNIGHT_PATTERNS[bitStartPos]);
    let bitboard = knightTargets & this.opponentOrEmpty;

    while (bitboard != 0) {
      const bitPos: u64 = ctz(bitboard);
      bitboard ^= 1 << bitPos; // unset bit
      const end = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
    }
  };


  @inline
  generateBishopMoves(activeColor: i32, piece: i32, start: i32): void {
    this.generateSlidingPieceMoves(activeColor, piece, start, 9);
    this.generateSlidingPieceMoves(activeColor, piece, start, 11);
    this.generateSlidingPieceMoves(activeColor, piece, start, -9);
    this.generateSlidingPieceMoves(activeColor, piece, start, -11);
  };

  @inline
  generateRookMoves(activeColor: i32, piece: i32, start: i32): void {
    this.generateSlidingPieceMoves(activeColor, piece, start, 1);
    this.generateSlidingPieceMoves(activeColor, piece, start, 10);
    this.generateSlidingPieceMoves(activeColor, piece, start, -1);
    this.generateSlidingPieceMoves(activeColor, piece, start, -10);
  };


  generateSlidingPieceMoves(activeColor: i32, piece: i32, start: i32, direction: i32): void {
    for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
      const end = start + direction * distance;

      const targetPiece = this.board.getItem(end);
      if (targetPiece == EMPTY) {
        unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
        continue;
      }

      if (sameColor(targetPiece, activeColor)) {
        return;
      }

      if (targetPiece == BOARD_BORDER) {
        return;
      }

      unchecked(this.moves[this.count++] = encodeMove(piece, start, end));
      return;
    }

  }

  generateQueenMoves(activeColor: i32, piece: i32, start: i32): void {
    // reuse move generators
    this.generateBishopMoves(activeColor, piece, start);
    this.generateRookMoves(activeColor, piece, start);
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

export function encodeMove(piece: i32, start: i32, end: i32): i32 {
  return abs(piece) | (start << 3) | (end << 10);
}

export function decodePiece(encodedMove: i32): i32 {
  return encodedMove & 0x7;
}

export function decodeStartIndex(encodedMove: i32): i32 {
  return (encodedMove >> 3) & 0x7F;
}

export function decodeEndIndex(encodedMove: i32): i32 {
  return (encodedMove >> 10) & 0x7F;
}


export function encodeScoredMove(move: i32, score: i32): i32 {
  if (score < 0) {
    return move | 0x80000000 | (-score << 17);

  } else {
    return move | (score << 17);
  }
}

export function decodeScore(scoredMove: i32): i32 {
  return (scoredMove & 0x80000000) != 0
    ? -((scoredMove & 0x7FFE0000) >>> 17)
    : scoredMove >>> 17;
}

export function decodeMove(scoredMove: i32): i32 {
  return scoredMove & 0x1FFFF;
}
