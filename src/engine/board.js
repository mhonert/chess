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

export const BLACK = -1;
export const WHITE = 1;

export const BOARD_BORDER = 99;
export const EMPTY = 0;

export const __ = BOARD_BORDER;

// Bit-Patterns for Board state
export const WHITE_KING_MOVED = 1 << 7;
export const BLACK_KING_MOVED = 1 << 8;
export const WHITE_LEFT_ROOK_MOVED = 1 << 9;
export const WHITE_RIGHT_ROOK_MOVED = 1 << 10;
export const BLACK_LEFT_ROOK_MOVED = 1 << 11;
export const BLACK_RIGHT_ROOK_MOVED = 1 << 12;
export const EN_PASSANT = [...Array(16).keys()].map(i => 1 << (i + 13));

export const getState = board => board[board.length - 1];

export const whiteKingMoved = board =>
  (getState(board) & WHITE_KING_MOVED) !== 0;
export const blackKingMoved = board =>
  (getState(board) & BLACK_KING_MOVED) !== 0;
export const whiteLeftRookMoved = board =>
  (getState(board) & WHITE_LEFT_ROOK_MOVED) !== 0;
export const whiteRightRookMoved = board =>
  (getState(board) & WHITE_RIGHT_ROOK_MOVED) !== 0;
export const blackLeftRookMoved = board =>
  (getState(board) & BLACK_LEFT_ROOK_MOVED) !== 0;
export const blackRightRookMoved = board =>
  (getState(board) & BLACK_RIGHT_ROOK_MOVED) !== 0;

export const setWhiteKingMoved = board => {
  board[board.length - 1] = getState(board) | WHITE_KING_MOVED;
};

export const setBlackKingMoved = board => {
  board[board.length - 1] = getState(board) | BLACK_KING_MOVED;
};

export const setWhiteLeftRookMoved = board => {
  board[board.length - 1] = getState(board) | WHITE_LEFT_ROOK_MOVED;
};

export const setWhiteRightRookMoved = board => {
  board[board.length - 1] = getState(board) | WHITE_RIGHT_ROOK_MOVED;
};

export const setBlackLeftRookMoved = board => {
  board[board.length - 1] = getState(board) | BLACK_LEFT_ROOK_MOVED;
};

export const setBlackRightRookMoved = board => {
  board[board.length - 1] = getState(board) | BLACK_RIGHT_ROOK_MOVED;
};
