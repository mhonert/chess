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
import { perft } from '../perft';


describe('Perft - Performance Test', () => {
  it('calculates correct moves for performance test', () => {
    expect(measurePerft("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 6)).toBe(119_060_324);
    expect(measurePerft("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 5)).toBe(193_690_690);
  });
});

function measurePerft(fen: string, depth: i32): u64 {
  const board = fromFEN(fen);

  const start = Date.now();
  const result = perft(board, depth);

  const duration = Date.now() - start;
  const nodesPerSecond = result * 1000 / duration;

  trace(fen + ": Duration (ms)   : " + duration.toString());
  trace(fen + ": Nodes per second: " + nodesPerSecond.toString());

  return result;
}


