/*
 * Chess App using React and Web Workers
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

export const getState = (board: Array<i32>): i32 => board[board.length - 1];

export const whiteKingMoved = (board: Array<i32>): bool =>
  (getState(board) & WHITE_KING_MOVED) != 0;
export const blackKingMoved = (board: Array<i32>): bool =>
  (getState(board) & BLACK_KING_MOVED) != 0;
export const whiteLeftRookMoved = (board: Array<i32>): bool =>
  (getState(board) & WHITE_LEFT_ROOK_MOVED) != 0;
export const whiteRightRookMoved = (board: Array<i32>): bool =>
  (getState(board) & WHITE_RIGHT_ROOK_MOVED) != 0;
export const blackLeftRookMoved = (board: Array<i32>): bool =>
  (getState(board) & BLACK_LEFT_ROOK_MOVED) != 0;
export const blackRightRookMoved = (board: Array<i32>): bool =>
  (getState(board) & BLACK_RIGHT_ROOK_MOVED) != 0;


export const setWhiteKingMoved = (board: Array<i32>): void => {
  setStateBit(board, WHITE_KING_MOVED);
};

export const setBlackKingMoved = (board: Array<i32>): void => {
  setStateBit(board, BLACK_KING_MOVED);
};

export const setWhiteLeftRookMoved = (board: Array<i32>): void => {
  setStateBit(board, WHITE_LEFT_ROOK_MOVED);
};

export const setWhiteRightRookMoved = (board: Array<i32>): void => {
  setStateBit(board, WHITE_RIGHT_ROOK_MOVED);
};

export const setBlackLeftRookMoved = (board: Array<i32>): void => {
  setStateBit(board, BLACK_LEFT_ROOK_MOVED);
};

export const setBlackRightRookMoved = (board: Array<i32>): void => {
  setStateBit(board, BLACK_RIGHT_ROOK_MOVED);
};

export function setStateBit(board: Array<i32>, bitMask: i32): void {
  board[board.length - 1] |= bitMask;
}

export function clearStateBit(board: Array<i32>, bitMask: i32): void {
  board[board.length - 1] &= ~bitMask;
}

// Encode 'en passant' move possibilities for
// white pawns in bits 13 to 20 and for
// black pawns in bits 21 to 28

const BITS: Array<i32> = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
export const EN_PASSANT_BITMASKS: Array<i32> = BITS.map<i32>(calculateEnPassantBitMask);

function calculateEnPassantBitMask(bit: i32, index: i32, array: Array<i32>): i32 {
  return 1 << bit;
}

const WHITE_ENPASSANT_LINE_START = 41;
const WHITE_ENPASSANT_LINE_END = 48
const BLACK_ENPASSANT_LINE_START = 71;
const BLACK_ENPASSANT_LINE_END = 78

export function isEnPassentPossible(board: Array<i32>, pieceColor: i32, boardIndex: i32): bool {
  const state = getState(board);
  if (boardIndex >= WHITE_ENPASSANT_LINE_START && boardIndex <= WHITE_ENPASSANT_LINE_END && pieceColor == WHITE) {
    return (state & EN_PASSANT_BITMASKS[boardIndex - WHITE_ENPASSANT_LINE_START]) != 0;
  } else if (boardIndex >= BLACK_ENPASSANT_LINE_START && boardIndex <= BLACK_ENPASSANT_LINE_END && pieceColor == BLACK) {
    return (state & EN_PASSANT_BITMASKS[boardIndex - BLACK_ENPASSANT_LINE_START + 8]) != 0;
  }

  return false;
};

export const setEnPassentPossible = (board: Array<i32>, boardIndex: i32): void => {
  const enPassentBitIndex = (boardIndex >= BLACK_ENPASSANT_LINE_START)
    ? boardIndex - BLACK_ENPASSANT_LINE_START + 8
    : boardIndex - WHITE_ENPASSANT_LINE_START;

  setStateBit(board, EN_PASSANT_BITMASKS[enPassentBitIndex]);
}
