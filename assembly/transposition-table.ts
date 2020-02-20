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

import { stdio } from './io';

export const MAX_HASH_SIZE_MB = 768;

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
  ALPHA,
  BETA
}

const SCORE_TYPE_BITSHIFT = 15;
const SCORE_TYPE_MASK: u64 = 0b11;

// Bits 14 - 0: Age
const AGE_MASK: u64 = 0b111111111111111;


const DEFAULT_SIZE_MB = 1;
const perEntryByteSize = 8 + 4;

export class TranspositionTable {
  private indexMask: u64;
  private entries: Uint64Array;
  private moves: Int32Array;
  private age: i32;

  constructor() {
    this.resize(DEFAULT_SIZE_MB, true);
  }

  resize(sizeMB: u32, initialize: bool = false): void {
    const byteSize: i64 = sizeMB * 1_048_576;
    const entryCount: i64 = byteSize / perEntryByteSize;
    const indexBits: u32 = u32(Math.log2(f64(entryCount)));

    const size = (1 << indexBits);
    if (initialize || size != this.entries.length) {
      this.indexMask = size - 1;
      this.entries = new Uint64Array(size);
      this.moves = new Int32Array(size);
    }
  }

  increaseAge(): void {
    this.age = (this.age + 1) & i32(AGE_MASK);
  }

  writeEntry(hash: u64, depth: i32, scoredMove: i32, type: ScoreType): void {
    const index = this.calculateIndex(hash);

    const existingEntry = unchecked(this.entries[index]);
    const existingDepth = i32((existingEntry >> DEPTH_BITSHIFT) & DEPTH_MASK);
    const existingAge = i32(existingEntry & AGE_MASK);
    if (existingEntry != 0 && existingAge == this.age && depth < existingDepth) {
      return; // keep existing entry
    }

    let newEntry: u64 = hash & HASHCHECK_MASK;
    newEntry |= (depth << DEPTH_BITSHIFT);
    newEntry |= (type << SCORE_TYPE_BITSHIFT);
    newEntry |= this.age;

    unchecked(this.entries[index] = newEntry);
    unchecked(this.moves[index] = scoredMove);
  }


  // Returns 0 if no move was found
  getScoredMove(hash: u64): i32 {
    const index = this.calculateIndex(hash);

    const entry = unchecked(this.entries[index]);
    const existingAge = i32(entry & AGE_MASK);
    if (entry == 0 || existingAge > this.age || ((entry & HASHCHECK_MASK) != (hash & HASHCHECK_MASK))) {
      return 0;
    }

    return unchecked(this.moves[index]);
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
    return i32(hash & this.indexMask);
  }

  clear(): void {
    this.entries.fill(0, 0, this.entries.length);
    this.moves.fill(0, 0, this.moves.length);
    this.age = 0;
  }

}
