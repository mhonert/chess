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
  UPPER_BOUND,
  LOWER_BOUND
}

const SCORE_TYPE_BITSHIFT = 15;
const SCORE_TYPE_MASK: u64 = 0b11;

// Bits 14 - 0: Age
const AGE_MASK: u64 = 0b111111111111111;


export const DEFAULT_SIZE_MB = 32;
const perEntryByteSize = 8 + 4;

export class TranspositionTable {
  private indexMask: u64;
  private entries: StaticArray<u64> = new StaticArray<u64>(0);
  private moves: StaticArray<i32> = new StaticArray<i32>(0);
  private age: i32;

  constructor() {
    this.resize(DEFAULT_SIZE_MB, true);
  }

  resize(sizeInMB: u32, initialize: bool = false): void {
    // Calculate table size as close to the desired sizeInMB as possible, but never above it
    const sizeInBytes = sizeInMB * 1_048_576;
    const entryCount = sizeInBytes / perEntryByteSize;
    const indexBitCount = 31 - clz(entryCount | 1);

    const size = (1 << indexBitCount);
    if (initialize || size != this.entries.length) {
      this.indexMask = size - 1;
      this.entries = new StaticArray<u64>(size);
      this.moves = new StaticArray<i32>(size);
    }
  }

  increaseAge(): void {
    this.age = (this.age + 1) & i32(AGE_MASK);
  }

  writeEntry(hash: u64, depth: i32, scoredMove: i32, type: ScoreType): void {
    const index = this.calculateIndex(hash);

    const entry = unchecked(this.entries[index]);
    if (entry != 0 && i32(entry & AGE_MASK) == this.age && depth < i32((entry >> DEPTH_BITSHIFT) & DEPTH_MASK)) {
      return;
    }

    let newEntry: u64 = hash & HASHCHECK_MASK;
    newEntry |= (depth << DEPTH_BITSHIFT);
    newEntry |= (type << SCORE_TYPE_BITSHIFT);
    newEntry |= this.age;

    unchecked(this.entries[index] = newEntry);
    unchecked(this.moves[index] = scoredMove);
  }

  getEntry(hash: u64): u64 {
    const index = this.calculateIndex(hash);

    const entry = unchecked(this.entries[index]);
    const ageDiff = this.age - i32(entry & AGE_MASK);

    if (entry == 0 || ageDiff < 0 || ageDiff > 1 || (entry & HASHCHECK_MASK) != (hash & HASHCHECK_MASK)) {
      return 0;
    }

    return u64(unchecked(this.moves[index])) << 32 | (entry & ~HASHCHECK_MASK);
  }

  private calculateIndex(hash: u64): i32 {
    return i32(hash & this.indexMask);
  }

  clear(): void {
    for (let i = 0; i < this.entries.length; i++) {
      unchecked(this.entries[i] = 0);
      unchecked(this.moves[i] = 0);
    }
    this.age = 0;
  }

}


export function getScoredMove(entry: u64): i32 {
  return i32(entry >> 32);
}

export function getDepth(entry: u64): i32 {
  return i32((entry >> DEPTH_BITSHIFT) & DEPTH_MASK);
}

export function getScoreType(entry: u64): ScoreType {
  return i32((entry >> SCORE_TYPE_BITSHIFT) & SCORE_TYPE_MASK);
}

