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

export const PAWN: i32 = 1;
export const KNIGHT: i32 = 2;
export const BISHOP: i32 = 3;
export const ROOK: i32 = 4;
export const QUEEN: i32 = 5;
export const KING: i32 = 6;

const KING_VALUE = 1500;
export let EG_QUEEN_VALUE = 991;
export let QUEEN_VALUE = 1376;
export let EG_ROOK_VALUE = 568;
export let ROOK_VALUE = 659;
export let EG_BISHOP_VALUE = 335;
export let BISHOP_VALUE = 489;
export let EG_KNIGHT_VALUE = 267;
export let KNIGHT_VALUE = 456;
export let EG_PAWN_VALUE = 107;
export let PAWN_VALUE = 102;

export const PIECE_VALUES: StaticArray<i32> = StaticArray.fromArray([0, PAWN_VALUE, KNIGHT_VALUE, BISHOP_VALUE, ROOK_VALUE, QUEEN_VALUE, KING_VALUE]);
export const EG_PIECE_VALUES: StaticArray<i32> = StaticArray.fromArray([0, EG_PAWN_VALUE, EG_KNIGHT_VALUE, EG_BISHOP_VALUE, EG_ROOK_VALUE, EG_QUEEN_VALUE, KING_VALUE]);

export function resetPieceValues(): void {
  unchecked(PIECE_VALUES[PAWN] = PAWN_VALUE);
  unchecked(PIECE_VALUES[KNIGHT] = KNIGHT_VALUE);
  unchecked(PIECE_VALUES[BISHOP] = BISHOP_VALUE);
  unchecked(PIECE_VALUES[ROOK] = ROOK_VALUE);
  unchecked(PIECE_VALUES[QUEEN] = QUEEN_VALUE);
  unchecked(PIECE_VALUES[KING] = KING_VALUE);

  unchecked(EG_PIECE_VALUES[PAWN] = EG_PAWN_VALUE);
  unchecked(EG_PIECE_VALUES[KNIGHT] = EG_KNIGHT_VALUE);
  unchecked(EG_PIECE_VALUES[BISHOP] = EG_BISHOP_VALUE);
  unchecked(EG_PIECE_VALUES[ROOK] = EG_ROOK_VALUE);
  unchecked(EG_PIECE_VALUES[QUEEN] = EG_QUEEN_VALUE);
  unchecked(EG_PIECE_VALUES[KING] = KING_VALUE);
}

export const P = PAWN;
export const N = KNIGHT;
export const B = BISHOP;
export const R = ROOK;
export const Q = QUEEN;
export const K = KING;

export const KNIGHT_DIRECTIONS: StaticArray<i32> = StaticArray.fromArray([17, 15, 10, 6, -10, -6, -15, -17]);
export const KING_DIRECTIONS: StaticArray<i32> = StaticArray.fromArray([1, 8, -1, -8, 7, 9, -7, -9]);

export const BISHOP_DIRECTIONS: StaticArray<i32> = StaticArray.fromArray([-7, -9, 7, 9]);

export const WHITE_QUEEN_SIDE_ROOK_START = 56;
export const WHITE_KING_SIDE_ROOK_START = 63;
export const BLACK_QUEEN_SIDE_ROOK_START = 0;
export const BLACK_KING_SIDE_ROOK_START = 7;

export const WHITE_PAWNS_BASELINE_START = 48;
export const WHITE_PAWNS_BASELINE_END = 55;
export const BLACK_PAWNS_BASELINE_START = 8;
export const BLACK_PAWNS_BASELINE_END = 15;

export const WHITE_ENPASSANT_LINE_START = 16;
export const WHITE_ENPASSANT_LINE_END = 23
export const BLACK_ENPASSANT_LINE_START = 40;
export const BLACK_ENPASSANT_LINE_END = 47


