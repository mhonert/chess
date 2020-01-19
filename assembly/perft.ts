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
import {
  decodeEndIndex,
  decodePiece,
  decodeStartIndex,
  generateMoves,
} from './move-generation';


/* Perft (performance test, move path enumeration) test helper function to verify the move generator.
   It generates all possible moves up to the specified depth and counts the number of leaf nodes.
   This number can then be compared to precalculated numbers that are known to be correct
   (see __tests__/perft.spec.ts).

   Another use for this function is to test the performance of the move generator (see __tests__/perft.performance.ts).
 */
export function perft(board: Board, depth: i32): u64 {
  if (depth == 0) {
    return 1
  }

  let nodes: u64 = 0;

  const activePlayer = board.getActivePlayer();
  const moves = generateMoves(board, activePlayer);

  for (let i: i32 = 0; i < moves.length; i++) {
    const move = unchecked(moves[i]);

    const targetPieceId = decodePiece(move);
    const moveStart = decodeStartIndex(move);
    const moveEnd = decodeEndIndex(move);
    const previousPiece = board.getItem(moveStart);

    const removedPiece = board.performMove(targetPieceId, moveStart, moveEnd);

    if (!board.isInCheck(activePlayer)) {
      nodes += perft(board, depth - 1);
    }
    board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
  }

  return nodes;
}

