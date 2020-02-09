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
import { clock, stdio } from './io';
import { STARTPOS } from './fen';
import { UCIMove } from './uci-move-notation';
import { TRANSPOSITION_MAX_DEPTH } from './transposition-table';

export { _abort } from './io/wasi/abort';

const AFTER_GO = "go".length;
const AFTER_POSITION = "position".length;
const AFTER_PERFT = "perft".length;

// Entry point for the standalone engine
export function _start(): void {
  let isRunning = true;

  do {
    const line: string = stdio.readLine();
    const command = line.trim();
    if (command.startsWith("ucinewgame")) {
      uciNewGame();
    } else if (command.startsWith("uci")) {
      uci();
    } else if (command.startsWith("isready")) {
      isReady();
    } else if (command.startsWith("position")) {
      position(command.substring(AFTER_POSITION).trimLeft());
    } else if (command.startsWith("go")) {
      go(command.substring(AFTER_GO).trimLeft());
    } else if (command.startsWith("quit")) {
      isRunning = false;
    } else if (command.startsWith("perft")) {
      perft(command.substring(AFTER_PERFT).trimLeft());
    }
  } while (isRunning);

}

function uci(): void {
  stdio.writeLine("id name Wasabi 1.0.0");
  stdio.writeLine("id author mhonert");
  stdio.writeLine("uciok");
}

function isReady(): void {
  EngineControl.init();
  stdio.writeLine("readyok");
}

function uciNewGame(): void {
  EngineControl.reset();
}

const MOVES_LENGTH = "moves".length;
const FEN_LENGTH = "fen".length;

function position(parameters: string): void {
  const movesStart = parameters.indexOf("moves");

  const fenStart = parameters.indexOf("fen");

  let fen: string;
  if (fenStart >= 0) {
    if (movesStart >= 0) {
      fen = parameters.substring(fenStart + FEN_LENGTH, movesStart - 1);
    } else {
      fen = parameters.substring(fenStart + FEN_LENGTH);
    }
  } else if (parameters.startsWith("startpos")) {
    fen = STARTPOS;
  } else {
    throw new Error("Invalid position parameters: " + parameters);
  }

  const fenTrimmed = fen.trim();

  EngineControl.setPosition(fenTrimmed);

  if (movesStart == -1) {
    return;
  }

  const board = EngineControl.getBoard();
  const movesStr = parameters.substring(movesStart + MOVES_LENGTH).trimLeft();
  const moves = movesStr.split(' ');
  for (let i = 0; i < moves.length; i++) {
    const move = UCIMove.fromUCINotation(moves[i]);
    EngineControl.performMove(move.toEncodedMove(board));
  }
}

function go(parameters: string): void {
  const move = EngineControl.findBestMove(2, 8, 500);
  stdio.writeLine("bestmove " + UCIMove.fromEncodedMove(EngineControl.getBoard(), move).toUCINotation());
}

function perft(parameter: string): void {
  const depth = I32.parseInt(parameter);
  if (depth < 0 || depth > TRANSPOSITION_MAX_DEPTH) {
    throw new Error("Invalid perft parameter: " + parameter);
  }

  const start: u64 = clock.currentMillis();

  const nodes: u64 = EngineControl.perft(depth);

  const duration = clock.currentMillis() - start;
  const nodesPerSecond: u64 = nodes * 1000 / duration;

  stdio.writeLine("Nodes: " + nodes.toString());
  stdio.writeLine("Duration (ms)   : " + duration.toString());
  stdio.writeLine("Nodes per second: " + nodesPerSecond.toString());
}
