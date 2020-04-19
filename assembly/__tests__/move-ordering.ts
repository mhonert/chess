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

import { decodeScore, encodeScoredMove } from '../move-generation';
import { sortByScoreAscending, sortByScoreDescending } from '../move-ordering';

describe("Move list sorting", () => {

  it("sorts moves descending by score", () => {
    const moves: StaticArray<i32> = StaticArray.fromArray([encodeScoredMove(0, 12), encodeScoredMove(1, 5), encodeScoredMove(2, 27), encodeScoredMove(3, 15)]);

    sortByScoreDescending(moves);

    expect(decodeScore(moves[0])).toBe(27);
    expect(decodeScore(moves[1])).toBe(15);
    expect(decodeScore(moves[2])).toBe(12);
    expect(decodeScore(moves[3])).toBe(5);
  });

  it("sorts empty move list descending", () => {
    sortByScoreDescending(new StaticArray<i32>(0));
  });

  it("sorts moves with 1 element descending", () => {
    const moves: StaticArray<i32> = StaticArray.fromArray([encodeScoredMove(0, 12)]);
    sortByScoreDescending(moves);

    expect(decodeScore(moves[0])).toBe(12);
  });

  it("sorts moves with 2 elements descending", () => {
    const moves: StaticArray<i32> = StaticArray.fromArray([encodeScoredMove(0, 5), encodeScoredMove(1, 12)]);
    sortByScoreDescending(moves);

    expect(decodeScore(moves[0])).toBe(12);
    expect(decodeScore(moves[1])).toBe(5);
  });

  it("sorts moves ascending by score for black player", () => {
    const moves: StaticArray<i32> = StaticArray.fromArray([encodeScoredMove(0, 12), encodeScoredMove(1, 5), encodeScoredMove(2, 27), encodeScoredMove(3, 15)]);

    sortByScoreAscending(moves);

    expect(decodeScore(moves[0])).toBe(5);
    expect(decodeScore(moves[1])).toBe(12);
    expect(decodeScore(moves[2])).toBe(15);
    expect(decodeScore(moves[3])).toBe(27);
  });

  it("sorts empty move list ascending", () => {
    sortByScoreAscending(new StaticArray<i32>(0));
  });

  it("sorts moves with 1 element ascending", () => {
    const moves: StaticArray<i32> = StaticArray.fromArray([encodeScoredMove(0, 12)]);
    sortByScoreAscending(moves);

    expect(decodeScore(moves[0])).toBe(12);
  });

  it("sorts moves with 2 elements ascending", () => {
    const moves: StaticArray<i32> = StaticArray.fromArray([encodeScoredMove(0, 12), encodeScoredMove(1, 5)]);
    sortByScoreAscending(moves);

    expect(decodeScore(moves[0])).toBe(5);
    expect(decodeScore(moves[1])).toBe(12);
  });
});

