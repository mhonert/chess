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

/* Stores moves, which caused a cut-off in a sibling node */
import { TRANSPOSITION_MAX_DEPTH } from './transposition-table';

export class KillerMoveTable {
  private primaryMoves: Int32Array = new Int32Array(TRANSPOSITION_MAX_DEPTH);
  private secondaryMoves: Int32Array = new Int32Array(TRANSPOSITION_MAX_DEPTH);

  clear(): void {
    this.primaryMoves.fill(0, 0, this.primaryMoves.length);
    this.secondaryMoves.fill(0, 0, this.secondaryMoves.length);
  }

  @inline
  writeEntry(depth: i32, moveStart: i32, moveEnd: i32, move: i32): void {
    const currentPrimary = unchecked(this.primaryMoves[depth]);
    if (currentPrimary != move) {
      unchecked(this.primaryMoves[depth] = move);
      unchecked(this.secondaryMoves[depth] = currentPrimary);
    }
  }

  @inline
  getPrimaryKiller(depth: i32): i32 {
    return unchecked(this.primaryMoves[depth]);
  }

  @inline
  getSecondaryKiller(depth: i32): i32 {
    return unchecked(this.secondaryMoves[depth]);
  }

}