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

import { Board } from './board';
import { openingBookData } from './opening-book-data';
import { Random } from './random';
import { clock } from './io';

const rnd = new Random();

// Returns an encoded opening move the current position or 0 if none exists
export function findOpeningMove(board: Board): i32 {
  const ply = board.getHalfMoveCount();
  const maxPly = i32(unchecked(openingBookData[0]));
  if (ply >= maxPly) {
    return 0;
  }

  const startIndex = i32(unchecked(openingBookData[ply + 1]));
  let entriesLeft = i32(unchecked(openingBookData[startIndex]));

  const boardLowHash = board.getHash() & 0xFFFFFFFF;
  const boardHighHash = board.getHash() >> 32;

  let index = startIndex + 1;
  do {
    const moveCount = i32(unchecked(openingBookData[index + 2]));

    if (boardLowHash == unchecked(openingBookData[index]) && boardHighHash == unchecked(openingBookData[index + 1])) {
      const selectedMoveNum = rnd.rand32() % moveCount;
      return i32(openingBookData[index + 3 + selectedMoveNum]);
    }

    index += moveCount + 3;
    entriesLeft--;
  } while (entriesLeft > 0);

  // No move found
  return 0;
}

export function randomizeOpeningBookMoves(): void {
  rnd.updateSeed(u64(clock.currentMillis()));
}