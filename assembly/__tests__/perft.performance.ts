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

import { fromFEN } from '../fen';
import { perft } from '../perft';


describe('Perft - Performance Test', () => {
  it('calculates correct moves for #full performance test', () => {
    measurePerft("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 6, 119_060_324);
    measurePerft("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 5, 193_690_690);
  });

  it('calculates correct moves for #quick performance test', () => {
    measurePerft("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 5, 4_865_609);
    measurePerft("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 4, 4_085_603);
  });
});

function measurePerft(fen: string, depth: i32, expectedResult: u64): void {
  const board = fromFEN(fen);

  const start = Date.now();
  expect(perft(board, depth)).toBe(expectedResult, "Depth: " + depth.toString());
  const duration = Date.now() - start;
  const nodesPerSecond = expectedResult / (duration / 1000);

  trace(fen + ": Duration (ms)   : " + duration.toString());
  trace(fen + ": Nodes per second: " + nodesPerSecond.toString());
}


