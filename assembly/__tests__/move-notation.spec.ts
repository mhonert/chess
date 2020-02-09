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

import { QUEEN } from '../pieces';
import { UCIMove } from '../uci-move-notation';

describe("UCIMove.fromUCINotation", () => {
  it("reads standard move", () => {
    const move = UCIMove.fromUCINotation("e2e4");
    expect(move.start).toBe(52, "start")
    expect(move.end).toBe(36, "end");
    expect(move.promotionPiece).toBe(0, "promotion piece");
  });

  it("reads promotion move", () => {
    const move = UCIMove.fromUCINotation("a7a8q");
    expect(move.start).toBe(8, "start")
    expect(move.end).toBe(0, "end");
    expect(move.promotionPiece).toBe(QUEEN, "promotion piece");
  });
});

describe("UCIMove.toUCINotation", () => {
  it("writes standard move", () => {
    const move = new UCIMove(52, 36);
    expect(move.toUCINotation()).toBe("e2e4");
  });

  it("writes promotion move", () => {
    const move = new UCIMove(8, 0, QUEEN);
    expect(move.toUCINotation()).toBe("a7a8q");
  });
});
