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

/// <reference path="../node_modules/@as-pect/core/types/as-pect.d.ts" />
/// <reference path="../node_modules/@as-pect/core/types/as-pect.portable.d.ts" />

import EngineControl from './engine';
import { decodeEndIndex, decodePiece, decodeStartIndex } from './move-generation';
import { clock, stdio } from './io';

export { _abort } from './io/wasi/abort';

// Entry point for the standalone engine
export function _start(): void {
  stdio.writeLine("Chess engine started ...");

  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  // const board = fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  EngineControl.reset();
  EngineControl.setPosition(fen);

  const start: u64 = clock.currentMillis();
  // const nodes: u64 = perft(board, 6);

  const move = EngineControl.findBestMove(2, 9, 0);

  const duration = clock.currentMillis() - start;
  // const nodesPerSecond: u64 = nodes * 1000 / duration;

  const movePiece = decodePiece(move);
  const moveFrom = decodeStartIndex(move);
  const moveTo = decodeEndIndex(move);
  // Log.info("Result: " + nodes.toString());
  stdio.writeLine("Move " + movePiece.toString() + " from " + moveFrom.toString() + " to " + moveTo.toString());
  stdio.writeLine("Duration (ms)   : " + duration.toString());
  // Log.info("Nodes per second: " + nodesPerSecond.toString());
  const line = stdio.readLine();
  stdio.writeLine(line);
}

