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

import { BISHOP, KING, KNIGHT, QUEEN, ROOK } from './pieces';
import { sign, toBitBoardString } from './util';
import { KNIGHT_DIRECTIONS } from './move-generation';

const PIECE_VALUES: Array<i32> = [1, 3, 3, 5, 9, 10]; // Pawn, Knight, Bishop, Rook, Queen, King

const HALFMOVE_CLOCK_INDEX = 120;
const HALFMOVE_COUNT_INDEX = 121;
const STATE_INDEX = 122;

export class Board {
  private items: Array<i32>;
  private whiteKingIndex: i32;
  private blackKingIndex: i32;
  private score: i32 = 0;
  private orthogonalPieces: Array<u64> = new Array<u64>(2);
  private diagonalPieces: Array<u64> = new Array<u64>(2);
  private knights: Array<u64> = new Array<u64>(2);

  /* items Array:
     Index 0 - 119: Board representation (10 columns * 12 rows)
     Index 120: Half-move clock (number of halfmoves since last capture or pawn move)
     Index 121: Half-move count (total number of half moves since the beginning of the game)
     Index 122: Encoded board state (en passant option and castling availability)
   */
  constructor(items: Array<i32>) {
    if (items.length < (STATE_INDEX + 1)) {
      throw new Error("Invalid board item length: " + items.length.toString());
    }
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
        this.addPiece(sign(piece), abs(piece), i);
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

    const colIndex = indexFromColor(pieceColor);

    switch (pieceId) {
      case ROOK:
        this.orthogonalPieces[colIndex] |= BOARD_POS_TO_BIT_PATTERN[pos];
        break;

      case BISHOP:
        this.diagonalPieces[colIndex] |= BOARD_POS_TO_BIT_PATTERN[pos];
        break;

      case QUEEN:
        this.orthogonalPieces[colIndex] |= BOARD_POS_TO_BIT_PATTERN[pos];
        this.diagonalPieces[colIndex] |= BOARD_POS_TO_BIT_PATTERN[pos];
        break;

      case KNIGHT:
        this.knights[colIndex] |= BOARD_POS_TO_BIT_PATTERN[pos];
        break;
    }
  }

  removePiece(pos: i32): i32 {
    const piece = this.items[pos];
    if (piece == EMPTY) {
      return EMPTY;
    }
    this.score -= this.calculateScore(pos, sign(piece), abs(piece));
    this.items[pos] = EMPTY;

    const colIndex = indexFromColor(sign(piece));
    switch (abs(piece)) {
      case ROOK:
        this.orthogonalPieces[colIndex] &= BOARD_POS_TO_BIT_NOT_PATTERN[pos];
        break;

      case BISHOP:
        this.diagonalPieces[colIndex] &= BOARD_POS_TO_BIT_NOT_PATTERN[pos];
        break;

      case QUEEN:
        this.orthogonalPieces[colIndex] &= BOARD_POS_TO_BIT_NOT_PATTERN[pos];
        this.diagonalPieces[colIndex] &= BOARD_POS_TO_BIT_NOT_PATTERN[pos];
        break;

      case KNIGHT:
        this.knights[colIndex] &= BOARD_POS_TO_BIT_NOT_PATTERN[pos];
    }

    return piece;
  }

  hasOrthogonalSlidingFigure(color: i32, pos: i32): bool {
    const colIndex = indexFromColor(color);
    return (this.orthogonalPieces[colIndex] & BOARD_POS_TO_BIT_PATTERN[pos]) != 0;
  }

  hasDiagonalSlidingFigure(color: i32, pos: i32): bool {
    const colIndex = indexFromColor(color);
    return (this.diagonalPieces[colIndex] & BOARD_POS_TO_BIT_PATTERN[pos]) != 0;
  }

  hasKnight(color: i32, pos: i32): bool {
    const colIndex = indexFromColor(color);
    return (this.knights[colIndex] & BOARD_POS_TO_BIT_PATTERN[pos]) != 0;
  }

  @inline
  isKnightAttacked(opponentColor: i32, pos: i32): bool {
    const colIndex = indexFromColor(opponentColor);
    const bitIndex = BOARD_POS_TO_BIT_INDEX[pos];

    return (this.knights[colIndex] & KNIGHT_PATTERNS[bitIndex]) != 0;
  }

  @inline
  isHorizontallyAttacked(opponentColor: i32, pos: i32): i32 {
    const colIndex = indexFromColor(opponentColor);
    const bitIndex = BOARD_POS_TO_BIT_INDEX[pos];

    const result = this.orthogonalPieces[colIndex] & HORIZONTAL_PATTERNS[bitIndex];
    if (result == 0) {
      return 0;
    }
    if (result < BOARD_POS_TO_BIT_PATTERN[pos]) {
      return -1;
    }

    return 1;
  }

  @inline
  isVerticallyAttacked(opponentColor: i32, pos: i32): i32 {
    const colIndex = indexFromColor(opponentColor);
    const bitIndex = BOARD_POS_TO_BIT_INDEX[pos];

    const result = this.orthogonalPieces[colIndex] & VERTICAL_PATTERNS[bitIndex];

    if (result == 0) {
      return 0;
    }
    if (result < BOARD_POS_TO_BIT_PATTERN[pos]) {
      return -10;
    }

    return 10;
  }

  @inline
  isDiagonallyDownAttacked(opponentColor: i32, pos: i32): i32 {
    const colIndex = indexFromColor(opponentColor);
    const bitIndex = BOARD_POS_TO_BIT_INDEX[pos];

    const result = this.diagonalPieces[colIndex] & DIAGONAL_DOWN_PATTERNS[bitIndex];
    if (result == 0) {
      return 0;
    }
    if (result < BOARD_POS_TO_BIT_PATTERN[pos]) {
      return -11;
    }

    return 11;
  }

  @inline
  isDiagonallyUpAttacked(opponentColor: i32, pos: i32): i32 {
    const colIndex = indexFromColor(opponentColor);
    const bitIndex = BOARD_POS_TO_BIT_INDEX[pos];

    const result = this.diagonalPieces[colIndex] & DIAGONAL_UP_PATTERNS[bitIndex];
    if (result == 0) {
      return 0;
    }
    if (result < BOARD_POS_TO_BIT_PATTERN[pos]) {
      return -9;
    }

    return 9;
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

  increaseHalfMoveCount(): void {
    this.items[HALFMOVE_COUNT_INDEX]++;
    this.items[HALFMOVE_CLOCK_INDEX]++;
  }

  setHalfMoveCount(value: i32): void {
    this.items[HALFMOVE_COUNT_INDEX] = value;
  }

  setHalfMoveClock(value: i32): void {
    this.items[HALFMOVE_CLOCK_INDEX] = value;
  }

  resetHalfMoveClock(): void {
    this.items[HALFMOVE_CLOCK_INDEX] = 0;
  }

  restorePreviousHalfMoveState(newValue: i32): void {
    this.items[HALFMOVE_COUNT_INDEX]--;
    this.items[HALFMOVE_CLOCK_INDEX] = newValue;
  }

  getHalfMoveClock(): i32 {
    return this.items[HALFMOVE_CLOCK_INDEX];
  }

  getHalfMoveCount(): i32 {
    return this.items[HALFMOVE_COUNT_INDEX];
  }

  getFullMoveCount(): i32 {
    return this.items[HALFMOVE_COUNT_INDEX] / 2 + 1;
  }

  getActivePlayer(): i32 {
    return (this.items[HALFMOVE_COUNT_INDEX] & 1) === 0 ? WHITE : BLACK;
  }

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

    let str = "";
    for (let i = 21; i < 100; i++) {
      if (this.items[i] == 99) {
        if (str != "") {
          trace(str);
        }
        str = "";
        continue;
      }

      const item = this.items[i];
      if (item == 0) {
        str += "[  ]"

      } else if (item < 0) {
        str += "[-" + pieces[abs(item)] + "]";

      } else {
        str += "[+" + pieces[item] + "]";

      }
    }
  }

  logBitBoards(color: i32): void {
    trace("Orthogonal: " + toBitBoardString(this.orthogonalPieces[indexFromColor(color)]));
    trace("Diagonal  : " + toBitBoardString(this.diagonalPieces[indexFromColor(color)]));
  }

}

const pieces: Array<String> = ["_", "P", "N", "B", "R", "Q", "K"];


// Return index 0 for BLACK (-1) and 1 for WHITE (+1)
@inline
function indexFromColor(color: i32): i32 {
  return (color + 1) >> 1;
}

function isWhiteKing(piece: i32, index: i32, board: Array<i32>): bool {
  return piece == KING;
}

function isBlackKing(piece: i32, index: i32, board: Array<i32>): bool {
  return piece == -KING;
}

/* Convert from array board position to bitboard index.
 * Bitboard representation maps the upper left corner of the board to bit index 0 and the lower right corner to 63.
 * Array representation maps the upper left corner of the board to array index 21 and the lower right corner to 98.
 *
 */
function calculateBoardPosToBitIndex(): Array<i32> {
  const bitIndices: Array<i32> = new Array<i32>();
  for (let i: i32 = 0; i < 99; i++) {
    const col = (i - 21) % 10;
    const row = (i - 21) / 10;
    if (col >= 0 && row >= 0 && col < 8) {
      bitIndices.push(row * 8 + col);
    } else {
      bitIndices.push(-1);
    }
  }

  return bitIndices;
}

const BOARD_POS_TO_BIT_INDEX = calculateBoardPosToBitIndex();

function calculateBoardPosToBitPattern(bitIndices: Array<i32>): Array<u64> {
  const bitPatterns = new Array<u64>(bitIndices.length);
  for (let i = 0; i < bitIndices.length; i++) {
    if (bitIndices[i] != -1) {
      bitPatterns[i] = 1 << u64(bitIndices[i]);
    } else {
      bitPatterns[i] = 0;
    }
  }
  return bitPatterns;
}

export const BOARD_POS_TO_BIT_PATTERN: Array<u64> = calculateBoardPosToBitPattern(BOARD_POS_TO_BIT_INDEX);

function calculateBoardPosToNotBitPattern(boardPosToBitPattern: Array<u64>): Array<u64> {
  const bitPatterns = new Array<u64>(boardPosToBitPattern.length);
  for (let i = 0; i < boardPosToBitPattern.length; i++) {
    bitPatterns[i] = ~boardPosToBitPattern[i];
  }
  return bitPatterns;
}

const BOARD_POS_TO_BIT_NOT_PATTERN: Array<u64> = calculateBoardPosToNotBitPattern(BOARD_POS_TO_BIT_PATTERN);


function calculateHorizontalPatterns(): Array<u64> {
  const patterns = new Array<u64>(64);
  for (let bit = 0; bit < 64; bit++) {
    const pattern: u64 = 0xFF << ((bit >> 3) << 3)
    patterns[bit] = pattern;
  }

  return patterns
}

export const HORIZONTAL_PATTERNS: Array<u64> = calculateHorizontalPatterns();

function calculateVerticalPatterns(): Array<u64> {
  const patterns = new Array<u64>(64);
  const startPattern: u64 = 0x0101010101010101;
  for (let bit = 0; bit < 64; bit++) {
    const pattern: u64 = startPattern << (bit & 0x7);
    patterns[bit] = pattern;
  }

  return patterns
}

export const VERTICAL_PATTERNS: Array<u64> = calculateVerticalPatterns();

function calculateDiagonalUpPatterns(): Array<u64> {
  const patterns = new Array<u64>(64);
  for (let bit = 0; bit < 64; bit++) {
    const startCol = bit % 8;
    const startRow = bit / 8;

    let pattern: u64 = 0;

    for (let distance = -7; distance <= 7; distance++) {
      let col = startCol - distance;
      let row = startRow + distance;
      if (col >= 0 && row >= 0 && col <= 7 && row <= 7) {
        const patternIndex = row * 8 + col;
        pattern |= (1 << patternIndex);
      }
    }
    patterns[bit] = pattern;
  }

  return patterns
}

export const DIAGONAL_UP_PATTERNS: Array<u64> = calculateDiagonalUpPatterns();

function calculateDiagonalDownPatterns(): Array<u64> {
  const patterns = new Array<u64>(64);
  for (let bit = 0; bit < 64; bit++) {
    const startCol = bit % 8;
    const startRow = bit / 8;

    let pattern: u64 = 0;

    for (let distance = -7; distance <= 7; distance++) {
      let col = startCol + distance;
      let row = startRow + distance;
      if (col >= 0 && row >= 0 && col <= 7 && row <= 7) {
        const patternIndex = row * 8 + col;
        pattern |= (1 << patternIndex);
      }
    }
    patterns[bit] = pattern;
  }

  return patterns
}

export const DIAGONAL_DOWN_PATTERNS: Array<u64> = calculateDiagonalDownPatterns();


export function isBorder(boardPos: i32): bool {
  if (boardPos < 21 || boardPos > 98) {
    return true;
  }

  return boardPos % 10 == 0 || boardPos % 10 == 9;
}

function calculateKnightPatterns(): Array<u64> {
  const patterns = new Array<u64>();
  for (let boardPos = 21; boardPos <= 98; boardPos++) {
    if (isBorder(boardPos)) {
      continue;
    }

    let pattern: u64 = 0;
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const dir = KNIGHT_DIRECTIONS[i];
      const targetPos = boardPos + dir;
      if (!isBorder(targetPos)) {
        pattern |= BOARD_POS_TO_BIT_PATTERN[targetPos];
      }
    }

    patterns.push(pattern);
  }

  return patterns;
}

export const KNIGHT_PATTERNS: Array<u64> = calculateKnightPatterns();

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

export const WHITE_ENPASSANT_LINE_START = 41;
export const WHITE_ENPASSANT_LINE_END = 48
export const BLACK_ENPASSANT_LINE_START = 71;
export const BLACK_ENPASSANT_LINE_END = 78


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
