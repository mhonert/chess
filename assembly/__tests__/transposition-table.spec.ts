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

import {
  decodeTranspositionDepth,
  decodeTranspositionScore,
  encodeTranspositionEntry,
  HASH_BITSIZE,
  matchesTranspositionHash,
  TRANSPOSITION_MAX_DEPTH
} from '../transposition-table';
import { MAX_SCORE, MIN_SCORE } from '../engine';

describe("Transposition table", () => {

  it("encodes entries correctly", () => {
    const hash: u64 = u64.MAX_VALUE;
    const depth = TRANSPOSITION_MAX_DEPTH;
    const score: u32 = 10;

    const entry = encodeTranspositionEntry(hash, depth, score);

    expect(matchesTranspositionHash(entry, hash)).toBeTruthy("Hash does not match");
    expect(decodeTranspositionDepth(entry)).toBe(depth, "Depth does not match");
    expect(decodeTranspositionScore(entry)).toBe(score, "Score does not match");
  });

  it("encodes hash code correctly", () => {
    const hashA: u64 = 0xFFFFFFFFFFFFFFFF;

    for (let bitIndex = 64 - HASH_BITSIZE; bitIndex < 64; bitIndex++) {
      const hashB = hashA ^ (1 << bitIndex); // set Bit at index to 0
      const entry = encodeTranspositionEntry(hashA, 1, 0);
      expect(matchesTranspositionHash(entry, hashB)).toBeFalsy("Different hash must not match: " + bitIndex.toString());
    }
  });

  it("encodes negative score correctly", () => {
    const score: u32 = MIN_SCORE;

    const entry = encodeTranspositionEntry(0, 1, score);

    expect(decodeTranspositionScore(entry)).toBe(score, "Score does not match");
  });

  it("encodes positive score correctly", () => {
    const score: u32 = MAX_SCORE;

    const entry = encodeTranspositionEntry(0, 1, score);

    expect(decodeTranspositionScore(entry)).toBe(score, "Score does not match");
  });

});

