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

export const PIECE_RNG_NUMBERS: Uint64Array = randArray(13 * 64);

export const PLAYER_RNG_NUMBER = rand64();
export const EN_PASSANT_RNG_NUMBERS: Uint64Array = randArray(16);

// Optimization: setting the last element to 0 allows to remove some branching (xor with 0 does not change the hash)
export const CASTLING_RNG_NUMBERS: Uint64Array = lastElementZero(randArray(16));

function randArray(count: i32): Uint64Array {
  const numbers = new Uint64Array(count);

  for (let i = 0; i < count; i++) {
    numbers[i] = rand64();
  }

  return numbers;
}

function lastElementZero(elements: Uint64Array): Uint64Array {
  elements[elements.length - 1] = 0;
  return elements;
}

// Create pseudo random numbers using a "Permuted Congruential Generator" (see https://en.wikipedia.org/wiki/Permuted_congruential_generator)
let state: u64 = 0x4d595df4d0f33173;
const multiplier: u64 = 6364136223846793005;
const increment: u64 = 1442695040888963407;

export function rand32(): u32 {
  let x = state;
  const count: u32 = u32(x >> u64(59));
  state = x * multiplier + increment;
  x ^= x >> 18;

  return rotr(u32(x >> 27), count);
}

export function rand64(): u64 {
  return (u64(rand32()) << 32) | u64(rand32());
}
