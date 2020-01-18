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
class Perft {
  private board: Board;

  constructor(board: Board) {
    this.board = board;
  }

  run(depth: i32): u64 {
    if (depth == 0) {
      return 1
    }

    let nodes: u64 = 0;

    const activePlayer = this.board.getActivePlayer();
    const moves = generateMoves(this.board, activePlayer);

    for (let i = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);

      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);

      if (!this.board.isInCheck(activePlayer)) {
        nodes += this.run(depth - 1);
      }
      this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
    }

    return nodes;
  }
}

export function perft(board: Board, depth: i32): u64 {
  const perft = new Perft(board);
  return perft.run(depth);
}
