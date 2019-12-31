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


import { rand64 } from './util';


// Random numbers to be used for calculating Zobrist hashes for board positions (see https://www.chessprogramming.org/Zobrist_Hashing):

// Note: the incremental calculation of the Zobrist hashes takes place in the Board class (see board.ts), so
// the unit tests for the hash calculation can be found in the board.spec.ts file
export const PIECE_RNG_NUMBERS: Array<Array<u64>> = randArrayArray(13, 64);
export const PLAYER_RNG_NUMBER = rand64();
export const EN_PASSANT_RNG_NUMBERS: Array<u64> = randArray(16);

// Optimization: setting the first element to 0 allows to remove some branching (xor with 0 does not change the hash)
export const CASTLING_RNG_NUMBERS: Array<u64> = firstElementZero(randArray(64));

function randArray(count: i32): Array<u64> {
  const numbers = new Array<u64>(count);

  for (let i = 0; i < count; i++) {
    numbers[i] = rand64();
  }

  return numbers;
}

function randArrayArray(count1: i32, count2: i32): Array<Array<u64>> {
  const arrays = new Array<Array<u64>>(count1);

  for (let i = 0; i < count1; i++) {
    arrays[i] = randArray(count2);
  }

  return arrays;
}

function firstElementZero(elements: Array<u64>): Array<u64> {
  elements[0] = 0;
  return elements;
}

