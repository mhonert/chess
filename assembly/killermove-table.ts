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

/* Stores moves, which caused a cut-off in a sibling node */
import { TRANSPOSITION_MAX_DEPTH } from './transposition-table';

export class KillerMoveTable {
  private primaryMoves: StaticArray<i32> = new StaticArray<i32>(TRANSPOSITION_MAX_DEPTH);
  private secondaryMoves: StaticArray<i32> = new StaticArray<i32>(TRANSPOSITION_MAX_DEPTH);

  clear(): void {
    for (let i = 0; i < this.primaryMoves.length; i++) {
      unchecked(this.primaryMoves[i] = 0);
      unchecked(this.secondaryMoves[i] = 0);
    }
  }

  @inline
  writeEntry(ply: i32, moveStart: i32, moveEnd: i32, move: i32): void {
    const currentPrimary = unchecked(this.primaryMoves[ply]);
    if (currentPrimary != move) {
      unchecked(this.primaryMoves[ply] = move);
      unchecked(this.secondaryMoves[ply] = currentPrimary);
    }
  }

  @inline
  getPrimaryKiller(ply: i32): i32 {
    return unchecked(this.primaryMoves[ply]);
  }

  @inline
  getSecondaryKiller(ply: i32): i32 {
    return unchecked(this.secondaryMoves[ply]);
  }

}