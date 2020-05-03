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

import { TRANSPOSITION_MAX_DEPTH } from './transposition-table';
import { WHITE } from './board';

const PLAYED_MOVE_THRESHOLDS = calculateMoveThresholds();

/* Stores information about non-capture moves, which caused a cut-off during search */
export class HistoryHeuristics {
  private primaryKillers: StaticArray<i32> = new StaticArray<i32>(TRANSPOSITION_MAX_DEPTH);
  private secondaryKillers: StaticArray<i32> = new StaticArray<i32>(TRANSPOSITION_MAX_DEPTH);
  private cutOffHistory: StaticArray<u64> = new StaticArray<u64>(2 * 64 * 64);
  private playedMoveHistory: StaticArray<u64> = new StaticArray<u64>(2 * 64 * 64);

  clear(): void {
    for (let i = 0; i < this.primaryKillers.length; i++) {
      unchecked(this.primaryKillers[i] = 0);
      unchecked(this.secondaryKillers[i] = 0);
    }
    this.clearHistory();
  }

  clearHistory(): void {
    for (let i = 0; i < this.cutOffHistory.length; i++) {
      unchecked(this.cutOffHistory[i] = 0);
      unchecked(this.playedMoveHistory[i] = 0);
    }
  }

  @inline
  getPrimaryKiller(ply: i32): i32 {
    return unchecked(this.primaryKillers[ply]);
  }

  @inline
  getSecondaryKiller(ply: i32): i32 {
    return unchecked(this.secondaryKillers[ply]);
  }

  @inline
  update(ply: i32, color: i32, moveStart: i32, moveEnd: i32, move: i32): void {
      const colOffset = color == WHITE ? 0 : 64 * 64;
      unchecked(this.cutOffHistory[colOffset + moveStart + moveEnd * 64]++);

      this.updateKillerMoveHistory(ply, move);
  }

  @inline
  private updateKillerMoveHistory(ply: i32, move: i32): void {
    const currentPrimary = unchecked(this.primaryKillers[ply]);
    if (currentPrimary != move) {
      unchecked(this.primaryKillers[ply] = move);
      unchecked(this.secondaryKillers[ply] = currentPrimary);
    }
  }

  @inline
  updatePlayedMoves(color: i32, moveStart: i32, moveEnd: i32): void {
    const colOffset = color == WHITE ? 0 : 64 * 64;
    unchecked(this.playedMoveHistory[colOffset + moveStart + moveEnd * 64]++);
  }

  // Returns a score between 0 and 512, which indicates how likely it is to cause a cut-off during search (higher scores = more likely).
  @inline
  getHistoryScore(color: i32, moveStart: i32, moveEnd: i32): i32 {
    const colOffset = color == WHITE ? 0 : 64 * 64;
    const index = colOffset + moveStart + moveEnd * 64;
    const playedMoveCount = unchecked(this.playedMoveHistory[index]);
    if (playedMoveCount == 0) {
      return 0;
    }

    return i32(unchecked(this.cutOffHistory[index]) * 512 / playedMoveCount);
  }

  // Returns true, if the history contains sufficient information about the given move, to indicate
  // that it is very unlikely to cause a cut-off during search
  @inline
  hasNegativeHistory(color: i32, depth: i32, moveStart: i32, moveEnd: i32): bool {
    const colOffset = color == WHITE ? 0 : 64 * 64;
    const index = colOffset + moveStart + moveEnd * 64;

    const playedMoveCount = unchecked(this.playedMoveHistory[index]);
    if (playedMoveCount < unchecked(PLAYED_MOVE_THRESHOLDS[depth])) {
      return false;
    }

    return (unchecked(this.cutOffHistory[index]) * 512 / playedMoveCount) == 0;
  }
}

function calculateMoveThresholds(): StaticArray<u64> {
  const thresholds = new StaticArray<u64>(TRANSPOSITION_MAX_DEPTH);
  let threshold: f32 = 2;
  for (let depth = 0; depth < TRANSPOSITION_MAX_DEPTH; depth++) {
    unchecked(thresholds[depth] = u64(threshold));
    threshold *= 1.6;
  }

  return thresholds;
}


