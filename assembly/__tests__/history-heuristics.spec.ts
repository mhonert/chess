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

import { HistoryHeuristics } from '../history-heuristics';
import { encodeMove } from '../move-generation';
import { QUEEN, ROOK } from '../pieces';
import { WHITE } from '../board';

describe("Killer move table", () => {

  it("Sets primary and secondary killer move entries correctly", () => {
    const table = new HistoryHeuristics();
    const moveA = encodeMove(QUEEN, 1, 2);
    const moveB = encodeMove(ROOK, 4, 5);
    table.update(1, WHITE, 1, 2, moveA);
    table.update(1, WHITE, 4, 5, moveB);

    const primaryKiller = table.getPrimaryKiller(1);
    const secondaryKiller = table.getSecondaryKiller(1);

    expect(primaryKiller).toBe(moveB, "primary move set");
    expect(secondaryKiller).toBe(moveA, "secondary move set");
  })

  it("Same move is not stored in primary and secondary slot", () => {
    const table = new HistoryHeuristics();
    const moveA = encodeMove(QUEEN, 1, 2);
    const moveB = encodeMove(ROOK, 4, 5);
    table.update(1, WHITE, 4, 5, moveB);
    table.update(1, WHITE, 1, 2, moveA);
    table.update(1, WHITE, 1, 2, moveA);

    const primaryKiller = table.getPrimaryKiller(1);
    const secondaryKiller = table.getSecondaryKiller(1);

    expect(primaryKiller).toBe(moveA, "primary move set");
    expect(secondaryKiller).toBe(moveB, "secondary move set");
  })

});

