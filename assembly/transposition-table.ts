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

import { encodeScoredMove } from './move-generation';


const HASH_BITSIZE = 64;

// Transposition table entry
// Bits 63 - 23: 41 highest bits of the hash
const HASHCHECK_BITSIZE = 41;
const HASHCHECK_MASK: u64 = 0b1111111111111111111111111111111111111111100000000000000000000000;

// Bits 22 - 17: Depth
export const TRANSPOSITION_MAX_DEPTH = 63;
const DEPTH_BITSHIFT = 17;
const DEPTH_MASK: u64 = 0b111111;

// Bits 16 - 15: Score Type
export enum ScoreType {
  EXACT = 0,
  CUTOFF
}

const SCORE_TYPE_BITSHIFT = 15;
const SCORE_TYPE_MASK: u64 = 0b11;

// Bit 14: Score sign (1 = -, 0 = +)
const SCORE_SIGN_BITMASK: u64 = 0b100000000000000;

// Bits 13 - 0 : Score
const SCORE_BITMASK: u64 = 0b11111111111111;



// Transposition data
const TRANSPOSITION_INDEX_BITS = 21;
export const TRANSPOSITION_INDEX_MASK: u64 = (1 << TRANSPOSITION_INDEX_BITS) - 1;

export class TranspositionTable {
  private entries: Uint64Array = new Uint64Array(1 << TRANSPOSITION_INDEX_BITS);
  private moves: Int32Array = new Int32Array(1 << TRANSPOSITION_INDEX_BITS);


  writeEntry(hash: u64, depth: i32, move: i32, score: i32, type: ScoreType): void {
    const index = this.calculateIndex(hash);

    const existingEntry = unchecked(this.entries[index]);
    const existingType = i32((existingEntry >> SCORE_TYPE_BITSHIFT) & SCORE_TYPE_MASK);
    const existingDepth = i32((existingEntry >> DEPTH_BITSHIFT) & DEPTH_MASK);
    if (existingEntry != 0 && (existingEntry & HASHCHECK_MASK) == (hash & HASHCHECK_MASK) && type < existingType && depth <= existingDepth) {
      return; // keep existing entry
    }

    let newEntry: u64 = hash & HASHCHECK_MASK;
    newEntry |= (depth << DEPTH_BITSHIFT);
    newEntry |= (type << SCORE_TYPE_BITSHIFT);
    if (score < 0) {
      newEntry |= SCORE_SIGN_BITMASK;
      newEntry |= -score;
    } else {
      newEntry |= score;
    }

    unchecked(this.entries[index] = newEntry);
    unchecked(this.moves[index] = move);
  }


  // Returns 0 if no move was found
  getScoredMove(hash: u64): i32 {
    const index = this.calculateIndex(hash);

    const entry = unchecked(this.entries[index]);
    if (entry == 0 || ((entry & HASHCHECK_MASK) != (hash & HASHCHECK_MASK))) {
      return 0;
    }

    const score = i32((entry & SCORE_SIGN_BITMASK) != 0
      ? -(entry & SCORE_BITMASK)
      : (entry & SCORE_BITMASK));

    return encodeScoredMove(unchecked(this.moves[index]), score);
  }


  @inline
  getDepth(hash: u64): i32 {
    const index = this.calculateIndex(hash);
    return i32((unchecked(this.entries[index]) >> DEPTH_BITSHIFT) & DEPTH_MASK);
  }

  @inline
  getScoreType(hash: u64): ScoreType {
    const index = this.calculateIndex(hash);
    return i32((unchecked(this.entries[index]) >> SCORE_TYPE_BITSHIFT) & SCORE_TYPE_MASK);
  }

  @inline
  private calculateIndex(hash: u64): i32 {
    return i32(hash & TRANSPOSITION_INDEX_MASK);
  }

  clear(): void {
    this.entries.fill(0, 0, this.entries.length);
    this.moves.fill(0, 0, this.moves.length);
  }

}
