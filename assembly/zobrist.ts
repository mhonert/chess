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


// Random numbers to be used for calculating Zobrist hashes for board positions (see https://www.chessprogramming.org/Zobrist_Hashing):

// Note: the incremental calculation of the Zobrist hashes takes place in the Board class (see board.ts), so
// the unit tests for the hash calculation can be found in the board.spec.ts file

import { Random } from './random';

const zobristRnd = new Random();

export const PIECE_RNG_NUMBERS: StaticArray<u64> = randArray(13 * 64);

export const PLAYER_RNG_NUMBER = zobristRnd.rand64();
export const EN_PASSANT_RNG_NUMBERS: StaticArray<u64> = randArray(16);

// Optimization: setting the last element to 0 allows to remove some branching (xor with 0 does not change the hash)
export const CASTLING_RNG_NUMBERS: StaticArray<u64> = lastElementZero(randArray(16));

function randArray(count: i32): StaticArray<u64> {
  const numbers = new StaticArray<u64>(count);

  for (let i = 0; i < count; i++) {
    numbers[i] = zobristRnd.rand64();
  }

  return numbers;
}

function lastElementZero(elements: StaticArray<u64>): StaticArray<u64> {
  elements[elements.length - 1] = 0;
  return elements;
}

