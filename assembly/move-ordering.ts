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

import { decodeScore } from './move-generation';

const CAPTURE_ORDER_SCORES = createCaptureOrderScores();

// Returns a higher score for capturing more valuable victims using less valuable attackers (MVV-LVA).
@inline
export function getCaptureOrderScore(attackerPieceId: i32, victimPieceId: i32): i32 {
  return unchecked(CAPTURE_ORDER_SCORES[((attackerPieceId - 1) * 8 + (victimPieceId - 1))]);
}

@inline
export function sortByScoreDescending(moves: StaticArray<i32>): void {
  // Basic insertion sort
  for (let i = 1; i < moves.length; i++) {
    const x = unchecked(moves[i]);
    const xScore = decodeScore(x);
    let j = i - 1;
    while (j >= 0) {
      const y = unchecked(moves[j]);
      if (decodeScore(y) >= xScore) {
        break;
      }
      unchecked(moves[j + 1] = y);
      j--;
    }
    unchecked(moves[j + 1] = x);
  }
}

@inline
export function sortByScoreAscending(moves: StaticArray<i32>): void {
  // Basic insertion sort
  for (let i = 1; i < moves.length; i++) {
    const x = unchecked(moves[i]);
    const xScore = decodeScore(x);
    let j = i - 1;
    while (j >= 0) {
      const y = unchecked(moves[j]);
      if (decodeScore(y) <= xScore) {
        break;
      }
      unchecked(moves[j + 1] = y);
      j--;
    }
    unchecked(moves[j + 1] = x);
  }
}


// Order capture moves first by most valuable victim and then by least valuable attacker (MVV-LVA)
function createCaptureOrderScores(): StaticArray<i32> {
  const scores = new StaticArray<i32>(5 + 5 * 8 + 1);

  let orderScore: i32 = 0;
  for (let victim = 0; victim <= 5; victim++) {
    for (let attacker = 5; attacker >= 0; attacker--) {
      scores[victim + attacker * 8] = orderScore * 64;
      orderScore++;
    }
  }

  return scores;
}

