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

// The entry file of your WebAssembly module.
/// <reference path="../node_modules/@as-pect/core/types/as-pect.d.ts" />
/// <reference path="../node_modules/@as-pect/core/types/as-pect.portable.d.ts" />
import { generateMoves } from './move-generation';

export const INT32ARRAY_ID = idof<Int32Array>();

export function calculateMove(board: Int32Array, color: i32, depth: i32): i32 {
  trace("Calculation started");

  const boardArray: Array<i32> = new Array<i32>();
  for (let i: i32 = 0; i < board.length; i++) {
    boardArray.push(board[i]);
  }

  const moves = generateMoves(boardArray, color);
  trace("Moves generated", 1, moves.length);

  return moves[0];
}