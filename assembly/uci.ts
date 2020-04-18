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

/// <reference path="../node_modules/@as-pect/core/types/as-pect.d.ts" />
/// <reference path="../node_modules/@as-pect/core/types/as-pect.portable.d.ts" />

import EngineControl from './engine';
import { clock, stdio } from './io';
import { STARTPOS } from './fen';
import { UCIMove } from './uci-move-notation';
import { DEFAULT_SIZE_MB, MAX_HASH_SIZE_MB, TRANSPOSITION_MAX_DEPTH } from './transposition-table';
import {
  KING_SHIELD_BONUS,
  WHITE
} from './board';
import { randomizeOpeningBookMoves } from './opening-book';

export { _abort } from './io/wasi/abort';

// Option names
const HASH_OPTION = "Hash";
const OWNBOOK_OPTION = "OwnBook"

// Options
let transpositionTableSizeChanged: bool = false;
let transpositionTableSizeInMB: u32 = 1;


// Entry point for the standalone engine
export function _start(): void {
  let isRunning = true;
  let isPositionSet: bool = false;

  EngineControl.setUseOpeningBook(false);

  do {
    const line: string = stdio.readLine();
    const tokens = tokenize(line);

    for (let i = 0; i < tokens.length; i++) {
      const command = tokens[i];

      if (command == "ucinewgame") {
        uciNewGame();
        break;

      } else if (command == "uci") {
        uci();
        break;

      } else if (command == "isready") {
        isReady();
        break;

      } else if (command == "position" && (i + 1) < tokens.length) {
        isPositionSet = position(tokens.slice(i + 1));
        break;

      } else if (isPositionSet && command == "go" && (i + 1) < tokens.length) {
        go(tokens.slice(i + 1));
        break;

      } else if (isPositionSet && command == "perft" && (i + 1) < tokens.length) {
        perft(tokens[i + 1]);
        break;

      } else if (command == "setoption" && (i + 1) < tokens.length) {
        setOption(tokens.slice(i + 1));
        break;

      } else if (command == 'quit') {
        isRunning = false;
        break;
      }

    }
  } while (isRunning);

}

function uci(): void {
  stdio.writeLine("id name Wasabi 1.1.1");
  stdio.writeLine("id author mhonert");
  stdio.writeLine("option name Hash type spin default " + DEFAULT_SIZE_MB.toString() + " min 1 max " + MAX_HASH_SIZE_MB.toString());
  stdio.writeLine("option name OwnBook type check default false");
  stdio.writeLine("option name UCI_EngineAbout type string default Wasabi Chess Engine (https://github.com/mhonert/chess)");

  stdio.writeLine("uciok");
}

function isReady(): void {
  if (transpositionTableSizeChanged) {
    EngineControl.resizeTranspositionTable(transpositionTableSizeInMB);
    transpositionTableSizeChanged = false;
  }
  stdio.writeLine("readyok");
}

function uciNewGame(): void {
  EngineControl.reset();
}


function position(parameters: Array<string>): bool {
  const movesStart: i32 = parameters.indexOf("moves");

  let fen: string;
  if (parameters[0] == "startpos") {
    fen = STARTPOS;
  } else if (parameters[0] == "fen") {

    const fenEnd = movesStart == -1 ? parameters.length : movesStart;
    fen = parameters.slice(1, fenEnd).join(' ');

  } else {
    stdio.writeError("Invalid position parameter: " + parameters[0]);
    return false;
  }

  EngineControl.setPosition(fen);

  if (movesStart == -1 || (movesStart + 1) == parameters.length) {
    return true;
  }

  const board = EngineControl.getBoard();
  const moves = parameters.slice(movesStart + 1);
  for (let i = 0; i < moves.length; i++) {
    const move = UCIMove.fromUCINotation(moves[i]);
    EngineControl.performMove(move.toEncodedMove(board), false);
  }

  return true;
}

function go(parameters: Array<string>): void {
  const wtime = extractIntegerValue(parameters, "wtime", 0);
  const btime = extractIntegerValue(parameters, "btime", 0);
  const winc = extractIntegerValue(parameters, "winc", 0);
  const binc = extractIntegerValue(parameters, "binc", 0);
  const movetime = extractIntegerValue(parameters, "movetime", 0);
  const movesToGo = extractIntegerValue(parameters, "movestogo", 40);

  const timeLimitMillis: i32 = (EngineControl.getBoard().getActivePlayer() == WHITE)
    ? calculateTimeLimit(movetime, wtime, winc, movesToGo)
    : calculateTimeLimit(movetime, btime, binc, movesToGo);

  const move = EngineControl.findBestMove(3, timeLimitMillis);
  stdio.writeLine("bestmove " + UCIMove.fromEncodedMove(EngineControl.getBoard(), move).toUCINotation());
}

function calculateTimeLimit(movetime: i32, timeLeftMillis: i32, timeIncrementMillis: i32, movesToGo: i32): i32 {
  if (movetime > 0) {
    return movetime;
  }

  const timeForMove = timeLeftMillis / max(1, movesToGo);
  const timeBonusFromIncrement = timeIncrementMillis / 2;

  if (timeForMove + timeBonusFromIncrement >= timeLeftMillis) {
    return max(0, timeForMove);
  }

  return max(0, timeForMove + timeBonusFromIncrement);
}

function perft(depthStr: string): void {
  if (depthStr.length == 0) {
    stdio.writeError("Invalid perft parameter: " + depthStr);
    return;
  }
  const depth = I32.parseInt(depthStr);
  if (depth < 0 || depth > TRANSPOSITION_MAX_DEPTH) {
    stdio.writeError("Invalid perft parameter: " + depthStr);
    return;
  }

  const start: u64 = clock.currentMillis();

  const nodes: u64 = EngineControl.perft(depth);
  stdio.writeLine("Nodes: " + nodes.toString());

  const duration = clock.currentMillis() - start;

  stdio.writeLine("Duration (ms)   : " + duration.toString());
  if (duration > 0) {
    const nodesPerSecond: u64 = nodes * 1000 / duration;
    stdio.writeLine("Nodes per second: " + nodesPerSecond.toString());
  }
}

function setOption(params: Array<string>): void {
  if (params.length < 4) {
    stdio.writeLine("Missing parameters for setoption");
    return;
  }

  if (params[0] != "name") {
    stdio.writeError("Missing 'name' in setoption");
    return;
  }

  const name = params[1];
  if (params[2] != "value") {
    stdio.writeError("Missing 'value' in setoption");
    return;
  }

  if (name == HASH_OPTION) {
    const sizeInMB = I32.parseInt(params[3]);
    if (sizeInMB >= 1 && sizeInMB != transpositionTableSizeInMB) {
      transpositionTableSizeInMB = min(sizeInMB, MAX_HASH_SIZE_MB);
      transpositionTableSizeChanged = true;
    }

  } else if (name == 'KingShieldBonus') {
    KING_SHIELD_BONUS = I32.parseInt(params[3]);

  } else if (name == OWNBOOK_OPTION) {
    const useBook = "true" == params[3].toLowerCase();
    EngineControl.setUseOpeningBook(useBook);
    if (useBook) {
      randomizeOpeningBookMoves();
    }
  }
}

// Helper functions
function tokenize(str: string): Array<string> {
  const parts = str.split(' ', 65536);
  const tokens = new Array<string>();
  for (let i = 0; i < parts.length; i++) {
    const subParts = parts[i].split('\t', 65536);
    for (let j = 0; j < subParts.length; j++) {
      if (subParts[j] != '') {
        tokens.push(subParts[j]);
      }
    }
  }
  return tokens;
}

function extractIntegerValue(tokens: Array<string>, name: string, defaultValue: i32): i32 {
  const nameIndex = tokens.indexOf(name);
  if (nameIndex < 0 || (nameIndex + 1) == tokens.length) {
    return defaultValue;
  }

  return I32.parseInt(tokens[nameIndex + 1]);
}

