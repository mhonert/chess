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

import { fromFEN, STARTPOS } from '../fen';
import { isValidMove } from '../move-generation';
import { findOpeningMove } from '../opening-book';

describe("Find moves from opening book", () => {
  it("Finds moves for multiple plies", () => {
    const board = fromFEN(STARTPOS);

    for (let ply = 1; ply <= 4; ply++) {
      const openingMove = findOpeningMove(board);
      expect(isValidMove(board, board.getActivePlayer(), openingMove)).toBeTruthy("No move found for ply #" + ply.toString())
      board.performEncodedMove(openingMove);
    }
  })
});
