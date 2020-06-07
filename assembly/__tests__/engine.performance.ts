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

import { fromFEN } from '../fen';
import EngineControl from '../engine';
import { calculatePieceSquareTables } from '../board';

describe('Engine performance', () => {
  it('plays against itself', () => {
    const start = Date.now();
    let nodeCount: u64 = 0;
    nodeCount += measureEnginePerformance("2r2rk1/1b3p1p/p5p1/q2pb3/Pp6/3BP2P/1P1NQPP1/3R1RK1 w - - 0 1", 12); //  bm Nf3
    nodeCount += measureEnginePerformance("2rq1rk1/p2nbppp/b1p1p3/8/2pPP3/2B3P1/P2N1PBP/R2QR1K1 w - - 0 1", 12); // bm Qa4
    nodeCount += measureEnginePerformance("r1qr2k1/p3bppp/1p1Bpn2/1P6/2PQb3/5NP1/P3PPBP/R2R2K1 w - - 0 1", 12); // bm c5
    nodeCount += measureEnginePerformance("r1r2k2/pp2ppbp/3pb1p1/3N4/2P1P1n1/1P6/P2BBPPP/1R3RK1 w - - 0 1", 12); // bm Bg5
    nodeCount += measureEnginePerformance("r1r3k1/1p1nppbp/p2pb1p1/8/N1P1P3/1P2BP2/P2KB1PP/2R4R w - - 0 1", 12); // bm g4
    nodeCount += measureEnginePerformance("r1r3k1/2q1bppp/pn1p1n2/4pP2/2b1P3/1NN1B3/1PP1B1PP/R2Q1R1K w - - 0 1", 12); // bm Na5
    nodeCount += measureEnginePerformance("r2q1k1r/pb3pp1/4p2p/1BnnP3/1p6/5N2/PP3PPP/R1BQ1RK1 w - - 0 1", 12); // bm a3
    nodeCount += measureEnginePerformance("r2q1nk1/pp2r1pp/1np1bp2/3p4/3P1P2/2NBPN2/PPQ3PP/4RRK1 w - - 0 1", 12); // bm Kh1
    nodeCount += measureEnginePerformance("r2q1r1k/pb1nbppB/2p1p2p/4P3/1p1P4/5N2/PPQ2PPP/R1B2RK1 w - - 0 1", 12); // bm Be4

    const duration = Date.now() - start;
    trace("-------------------------------------------------------");
    trace("Total nodes     : " + nodeCount.toString());
    trace("Duration (ms)   : " + duration.toString());
    const nodesPerSecond = duration > 0 ? nodeCount * 1000 / duration : 0;
    trace("Nodes per second: " + nodesPerSecond.toString());

  });

});


function measureEnginePerformance(fen: string, depth: i32): u64 {
  calculatePieceSquareTables();
  EngineControl.reset();
  EngineControl.setBoard(fromFEN(fen));
  const move = EngineControl.findBestMove(depth, 0, true);

  return EngineControl.getNodeCount();
}


