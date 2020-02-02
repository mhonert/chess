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

import { Board } from '../board';
import { fromFEN } from '../fen';
import { findBestMoveIncrementally, reset } from '../engine';
import { isCheckMate } from '../move-generation';

describe('Engine performance', () => {
  it('plays against itself #engine', () => {
    const start = Date.now();
    measureEnginePerformance("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 2, 7, 20);
    measureEnginePerformance("r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1", 2, 9, 2);
    measureEnginePerformance("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 2, 9, 1);
    measureEnginePerformance("r2q2k1/1ppb2pp/2npp3/5r2/3PNn2/2BB4/PPPQ1PPP/R3R1K1 w - - 0 1", 2, 7, 1);
    measureEnginePerformance("r4rk1/1pp3p1/1n4qp/1P1pR3/3P4/PB2Q3/2P2PPP/R5K1 w - - 0 1", 2, 9, 3);
    measureEnginePerformance("8/Q7/1R3q2/5k1p/8/7P/2P2PP1/6K1 w - - 0 1", 2, 10, 1);

    const duration = Date.now() - start;
    trace("Duration (ms)   : " + duration.toString());
  });
});


function measureEnginePerformance(fen: string, startingDepth: i32, depth: i32, moveLimit: i32): void {
  reset();
  playAgainstSelf(fromFEN(fen), startingDepth, depth, moveLimit);
}


function playAgainstSelf(board: Board, startingDepth: i32, depth: i32, moveLimit: i32): void {
  while (board.getFullMoveCount() <= moveLimit) {
    const move = findBestMoveIncrementally(board, board.getActivePlayer(), startingDepth, depth, 0);
    board.performEncodedMove(move);
    if (isCheckMate(board, board.getActivePlayer())) {
      trace("Player " + board.getActivePlayer().toString() + " is checkmate");
      return;
    }
  }
}

