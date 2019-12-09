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

import { KING } from './pieces';
import { sign } from './util';

const PIECE_VALUES: Array<i32> = [1, 3, 3, 5, 9, 10]; // Pawn, Knight, Bishop, Rook, Queen, King

export class Board {
  private items: Array<i32>;
  whiteKingIndex: i32;
  blackKingIndex: i32;
  score: i32 = 0;

  constructor(items: Array<i32>) {
    this.items = items;
    this.whiteKingIndex = items.findIndex(isWhiteKing)
    this.blackKingIndex = items.findIndex(isBlackKing);

    if (this.whiteKingIndex == -1) {
      throw new Error("White king is missing on the board");
    }

    if (this.blackKingIndex == -1) {
      throw new Error("Black king is missing on the board!");
    }

    for (let i: i32 = 21; i <= 98; i++) {
      const piece = this.items[i];
      if (piece != EMPTY && piece != BOARD_BORDER) {
        const pieceId = abs(piece);
        this.score += this.calculateScore(i, sign(piece), pieceId);
      }
    }
  }

  getItem(pos: i32): i32 {
    return this.items[pos];
  }

  isEmpty(pos: i32): bool {
    return this.items[pos] == EMPTY;
  }

  isBorder(pos: i32): bool {
    return this.items[pos] == BOARD_BORDER;
  }

  getScore(): i32 {
    return this.score;
  }

  addPiece(pieceColor: i32, pieceId: i32, pos: i32): void {
    const piece = pieceId * pieceColor;
    this.score += this.calculateScore(pos, pieceColor, pieceId);
    this.items[pos] = piece;
  }

  removePiece(pos: i32): i32 {
    const piece = this.items[pos];
    if (piece == EMPTY) {
      return EMPTY;
    }
    this.score -= this.calculateScore(pos, sign(piece), abs(piece));
    this.items[pos] = EMPTY;
    return piece;
  }

  calculateScore(pos: i32, color: i32, pieceId: i32): i32 {
    if (color == WHITE) {
      return PIECE_VALUES[pieceId - 1] * 10 + WHITE_POSITION_SCORES[pieceId - 1][pos - 20];

    } else {
      return PIECE_VALUES[pieceId - 1] * -10 - BLACK_POSITION_SCORES[pieceId - 1][pos - 20];

    }
  }

  isEnPassentPossible(pieceColor: i32, boardIndex: i32): bool {
    const state = this.getState();

    if (pieceColor == WHITE && boardIndex >= WHITE_ENPASSANT_LINE_START && boardIndex <= WHITE_ENPASSANT_LINE_END) {
      return (state & EN_PASSANT_BITMASKS[boardIndex - WHITE_ENPASSANT_LINE_START]) != 0;

    } else if (pieceColor == BLACK && boardIndex >= BLACK_ENPASSANT_LINE_START && boardIndex <= BLACK_ENPASSANT_LINE_END) {
      return (state & EN_PASSANT_BITMASKS[boardIndex - BLACK_ENPASSANT_LINE_START + 8]) != 0;

    }

    return false;
  };

  setEnPassantPossible(boardIndex: i32): void {
    const enPassentBitIndex = (boardIndex >= WHITE_PAWNS_BASELINE_START)
      ? boardIndex - WHITE_PAWNS_BASELINE_START + 8
      : boardIndex - BLACK_PAWNS_BASELINE_START;

    this.setStateBit(EN_PASSANT_BITMASKS[enPassentBitIndex]);
  }


  clearEnPassentPossible(): void {
    this.items[this.items.length - 1] &= (EN_PASSANT_BITMASKS[0] - 1);
  };

  getState(): i32 {
    return this.items[this.items.length - 1];
  }

  whiteKingMoved(): bool {
    return (this.getState() & WHITE_KING_MOVED) != 0;
  }

  blackKingMoved(): bool {
    return (this.getState() & BLACK_KING_MOVED) != 0;
  }

  whiteLeftRookMoved(): bool {
    return (this.getState() & WHITE_LEFT_ROOK_MOVED) != 0;
  }

  whiteRightRookMoved(): bool {
    return (this.getState() & WHITE_RIGHT_ROOK_MOVED) != 0;
  }

  blackLeftRookMoved(): bool {
    return (this.getState() & BLACK_LEFT_ROOK_MOVED) != 0;
  }

  blackRightRookMoved(): bool {
    return (this.getState() & BLACK_RIGHT_ROOK_MOVED) != 0;
  }

  setWhiteKingMoved(): void {
    this.setStateBit(WHITE_KING_MOVED);
  };

  setBlackKingMoved(): void {
    this.setStateBit(BLACK_KING_MOVED);
  };

  setWhiteLeftRookMoved(): void {
    this.setStateBit(WHITE_LEFT_ROOK_MOVED);
  };

  setWhiteRightRookMoved(): void {
    this.setStateBit(WHITE_RIGHT_ROOK_MOVED);
  };

  setBlackLeftRookMoved(): void {
    this.setStateBit(BLACK_LEFT_ROOK_MOVED);
  };

  setBlackRightRookMoved(): void {
    this.setStateBit(BLACK_RIGHT_ROOK_MOVED);
  };

  setStateBit(bitMask: i32): void {
    this.items[this.items.length - 1] |= bitMask;
  }

  clearStateBit(bitMask: i32): void {
    this.items[this.items.length - 1] &= ~bitMask;
  }

  findKingPosition(playerColor: i32): i32 {
    if (playerColor == WHITE) {
      return this.whiteKingIndex;
    } else {
      return this.blackKingIndex;
    }
  }

  setState(state: i32): void {
    this.items[this.items.length - 1] = state;
  }

  updateKingPosition(playerColor: i32, boardIndex: i32): void {
    if (playerColor == WHITE) {
      this.whiteKingIndex = boardIndex;
    } else {
      this.blackKingIndex = boardIndex;
    }
  }

  log(): void {
    trace("Board");
    for (let i = 21; i < 99; i++) {
      if (this.items[i] < 0) {
        const item = this.items[i];
        trace("Piece", 2, i, item);
      } else if (this.items[i] > 0 && this.items[i] < 10) {
        const item = this.items[i];
        trace("Piece", 2, i, item);
      }
    }
  }

}

function isWhiteKing(piece: i32, index: i32, board: Array<i32>): bool {
  return piece == KING;
}

function isBlackKing(piece: i32, index: i32, board: Array<i32>): bool {
  return piece == -KING;
}

export const BLACK: i32 = -1;
export const WHITE: i32 = 1;

export const BOARD_BORDER: i32 = 99;
export const EMPTY: i32 = 0;

export const __ = BOARD_BORDER;

// Bit-Patterns for Board state
export const WHITE_KING_MOVED: i32 = 1 << 7;
export const BLACK_KING_MOVED: i32 = 1 << 8;
export const WHITE_LEFT_ROOK_MOVED: i32 = 1 << 9;
export const WHITE_RIGHT_ROOK_MOVED: i32 = 1 << 10;
export const BLACK_LEFT_ROOK_MOVED: i32 = 1 << 11;
export const BLACK_RIGHT_ROOK_MOVED: i32 = 1 << 12;


// Encode 'en passant' move possibilities for
// white pawns in bits 13 to 20 and for
// black pawns in bits 21 to 28

const BITS: Array<i32> = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
const EN_PASSANT_BITMASKS: Array<i32> = BITS.map<i32>(calculateEnPassantBitMask);

function calculateEnPassantBitMask(bit: i32, index: i32, array: Array<i32>): i32 {
  return 1 << bit;
}

export const WHITE_PAWNS_BASELINE_START = 81;
export const WHITE_PAWNS_BASELINE_END = 88;
export const BLACK_PAWNS_BASELINE_START = 31;
export const BLACK_PAWNS_BASELINE_END = 38;

const WHITE_ENPASSANT_LINE_START = 41;
const WHITE_ENPASSANT_LINE_END = 48
const BLACK_ENPASSANT_LINE_START = 71;
const BLACK_ENPASSANT_LINE_END = 78


export const PAWN_POSITION_SCORES: Array<i32> = [
  __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  __, 10, 10, 10, 10, 10, 10, 10, 10, __,
  __,  2,  2,  4,  6,  6,  4,  2,  2, __,
  __,  1,  1,  2,  5,  5,  2,  1,  1, __,
  __,  0,  0,  0,  4,  4,  0,  0,  0, __,
  __,  1, -1, -2,  0,  0, -2, -1,  1, __,
  __,  1,  2,  2, -4, -4,  2,  2,  1, __,
  __,  0,  0,  0,  0,  0,  0,  0,  0, __
];

const KNIGHT_POSITION_SCORES: Array<i32> = [
  __, -10, -8, -6, -6, -6, -6, -8,-10, __,
  __,  -8, -4,  0,  0,  0,  0, -4, -8, __,
  __,  -6,  0,  2,  3,  3,  2,  0, -6, __,
  __,  -6,  1,  3,  4,  4,  3,  1, -6, __,
  __,  -6,  0,  3,  4,  4,  3,  0, -6, __,
  __,  -6,  1,  2,  3,  3,  2,  1, -6, __,
  __,  -8, -4,  0,  1,  1,  0, -4, -8, __,
  __, -10, -8, -6, -6, -6, -6, -8,-10, __,
]

const BISHOP_POSITION_SCORES: Array<i32> = [
  __, -4, -2, -2, -2, -2, -2, -2, -4, __,
  __, -2,  0,  0,  0,  0,  0,  0, -2, __,
  __, -2,  0,  1,  2,  2,  1,  0, -2, __,
  __, -2,  1,  1,  2,  2,  1,  1, -2, __,
  __, -2,  0,  2,  2,  2,  2,  0, -2, __,
  __, -2,  2,  2,  2,  2,  2,  2, -2, __,
  __, -2,  1,  0,  0,  0,  0,  1, -2, __,
  __, -4, -2, -2, -2, -2, -2, -2, -4, __
]

const ROOK_POSITION_SCORES: Array<i32> = [
  __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  __,  1,  2,  2,  2,  2,  2,  2,  1, __,
  __, -1,  0,  0,  0,  0,  0,  0, -1, __,
  __, -1,  0,  0,  0,  0,  0,  0, -1, __,
  __, -1,  0,  0,  0,  0,  0,  0, -1, __,
  __, -1,  0,  0,  0,  0,  0,  0, -1, __,
  __, -1,  0,  0,  0,  0,  0,  0, -1, __,
  __,  0,  0,  0,  1,  1,  0,  0,  0, __
]

const QUEEN_POSITION_SCORES: Array<i32> = [
  __, -4, -2, -2, -1, -1, -2, -2, -4, __,
  __, -2,  0,  0,  0,  0,  0,  0, -2, __,
  __, -2,  0,  1,  1,  1,  1,  0, -2, __,
  __, -1,  0,  1,  1,  1,  1,  0, -1, __,
  __,  0,  0,  1,  1,  1,  1,  0, -1, __,
  __, -2,  1,  1,  1,  1,  1,  0, -2, __,
  __, -2,  0,  1,  0,  0,  0,  0, -2, __,
  __, -4, -2, -2, -1, -1, -2, -2, -4, __
]

const KING_POSITION_SCORES: Array<i32> = [
  __, -6, -8, -8, -10, -10, -8, -8, -6, __,
  __, -6, -8, -8, -10, -10, -8, -8, -6, __,
  __, -6, -8, -8, -10, -10, -8, -8, -6, __,
  __, -6, -8, -8, -10, -10, -8, -8, -6, __,
  __, -4, -6, -6,  -8,  -8, -6, -6, -4, __,
  __, -2, -4, -4,  -4,  -4, -4, -4, -2, __,
  __,  4,  4,  0,   0,   0,  0,  4,  4, __,
  __,  4,  6,  2,   0,   0,  2,  6,  4, __
]

const WHITE_POSITION_SCORES: Array<Array<i32>> = [PAWN_POSITION_SCORES, KNIGHT_POSITION_SCORES, BISHOP_POSITION_SCORES,
                                                  ROOK_POSITION_SCORES, QUEEN_POSITION_SCORES, KING_POSITION_SCORES];

const BLACK_POSITION_SCORES: Array<Array<i32>> = [mirrored(PAWN_POSITION_SCORES), mirrored(KNIGHT_POSITION_SCORES), mirrored(BISHOP_POSITION_SCORES),
                                                  mirrored(ROOK_POSITION_SCORES), mirrored(QUEEN_POSITION_SCORES), mirrored(KING_POSITION_SCORES)];

export function mirrored(input: Array<i32>): Array<i32> {
  let output = input.slice(0);
  for (let column: i32 = 0; column < 10; column++) {
    for (let row: i32 = 0; row < 4; row++) {
      const oppositeRow = 7 - row;
      const pos = column + row * 10;
      const oppositePos = column + oppositeRow * 10;
      const value = output[pos];
      output[pos] = output[oppositePos];
      output[oppositePos] = value;
    }
  }

  return output;
}
