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

import { ScoreType, TRANSPOSITION_MAX_DEPTH, TranspositionTable } from '../transposition-table';
import { decodeScore, encodeMove, encodeScoredMove } from '../move-generation';
import { MAX_SCORE, MIN_SCORE } from '../engine';

describe("Transposition table", () => {

  it("writes entry correctly", () => {
    const hash: u64 = u64.MAX_VALUE;
    const depth = TRANSPOSITION_MAX_DEPTH;
    const move = encodeMove(5, 32, 33);
    const score: i32 = -10;
    const type = ScoreType.CUTOFF;

    const tt = new TranspositionTable();
    tt.writeEntry(hash, depth, move, score, type);

    expect(tt.getScoredMove(hash)).toBe(encodeScoredMove(move, score), "move does not match");
    expect(tt.getDepth(hash)).toBe(depth, "Depth does not match");
    expect(tt.getScoreType(hash)).toBe(type, "Type does not match");
  });

  it("encodes negative score correctly", () => {
    const hash: u64 = u64.MAX_VALUE;
    const score: i32 = MIN_SCORE;

    const tt = new TranspositionTable();
    tt.writeEntry(hash, 1, 0, score, ScoreType.NO_CUTOFF);

    expect(decodeScore(tt.getScoredMove(hash))).toBe(score, "Score does not match");
  });

  it("encodes positive score correctly", () => {
    const hash: u64 = u64.MAX_VALUE;
    const score: i32 = MAX_SCORE;

    const tt = new TranspositionTable();
    tt.writeEntry(hash, 1, 0, score, ScoreType.NO_CUTOFF);

    expect(decodeScore(tt.getScoredMove(hash))).toBe(score, "Score does not match");
  });

});

