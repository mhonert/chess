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

const TRANSPOSITION_INDEX_BITS = 21;
export const TRANSPOSITION_INDEX_BITMASK = (1 << TRANSPOSITION_INDEX_BITS) - 1;
export const TRANSPOSITION_TABLE = new Array<u64>(1 << TRANSPOSITION_INDEX_BITS);
export const TRANSPOSITION_MAX_DEPTH = 64;

// Transposition entry
// Bits 63 - 21: 43 highest bits of the hash
export const HASH_BITSIZE = 43;
const HASH_BITMASK: u64 = 0xFFFFFFFFFFE00000;

// Bits 20 - 15: Depth
const DEPTH_BITSHIFT = 15;
const DEPTH_BITMASK: u64 = 0b111111;

// Bit 14: Score sign (1 = -, 0 = +)
const SCORE_SIGN_BITMASK: u64 = 0b100000000000000;

// Bits 13 -  0 : Score
const SCORE_BITMASK: u64 = 0b11111111111111;


export function decodeTranspositionDepth(entry: u64): i32 {
  return i32((entry >> DEPTH_BITSHIFT) & DEPTH_BITMASK) + 1;
}

export function matchesTranspositionHash(entry: u64, hash: u64): bool {
  return (entry & HASH_BITMASK) == (hash & HASH_BITMASK);
}

export function decodeTranspositionScore(entry: u64): i32 {
  return i32((entry & SCORE_SIGN_BITMASK) != 0
    ? -(entry & SCORE_BITMASK)
    : (entry & SCORE_BITMASK));
}

/**
 * @param hash Zobrist hash
 * @param depth Must be >=1 and <= TRANSPOSITION_MAX_DEPTH
 * @param score Must be >= MIN_SCORE and <= MAX_SCORE
 */
export function encodeTranspositionEntry(hash: u64, depth: i32, score: i32): u64 {
  let entry = hash & HASH_BITMASK
  entry |= ((depth - 1) << DEPTH_BITSHIFT);

  if (score < 0) {
    entry |= SCORE_SIGN_BITMASK;
    entry |= -score;
  } else {
    entry |= score;
  }

  return entry;
}

export function resetTranspositionTable(): void {
  TRANSPOSITION_TABLE.fill(0, 0, TRANSPOSITION_TABLE.length);
}
