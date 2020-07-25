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

import { EG_QUEEN_MOB_BONUS } from './board';
import { EG_ROOK_MOB_BONUS } from './board';
import { EG_BISHOP_MOB_BONUS } from './board';
import { EG_KNIGHT_MOB_BONUS } from './board';
import { EG_QUEEN_POSITION_SCORES } from './board';
import { QUEEN_POSITION_SCORES } from './board';
import { EG_ROOK_POSITION_SCORES } from './board';
import { ROOK_POSITION_SCORES } from './board';
import { EG_BISHOP_POSITION_SCORES } from './board';
import { BISHOP_POSITION_SCORES } from './board';
import { EG_KNIGHT_POSITION_SCORES } from './board';
import { KNIGHT_POSITION_SCORES } from './board';
import { EG_PAWN_POSITION_SCORES } from './board';
import { EG_KING_POSITION_SCORES } from './board';
import { KING_POSITION_SCORES } from './board';
import { PAWN_POSITION_SCORES } from './board';
import { QUEEN_MOB_BONUS } from './board';
import { ROOK_MOB_BONUS } from './board';
import { BISHOP_MOB_BONUS } from './board';
import { KNIGHT_MOB_BONUS } from './board';
import { KING_DANGER_PIECE_PENALTY } from './board';
import EngineControl from './engine';
import { TIMEEXT_MULTIPLIER } from './engine';
import { fromFEN } from './fen';
import { clock, stdio } from './io';
import { STARTPOS } from './fen';
import { UCIMove } from './uci-move-notation';
import { DEFAULT_SIZE_MB, MAX_HASH_SIZE_MB, TRANSPOSITION_MAX_DEPTH } from './transposition-table';
import { calculatePieceSquareTables, WHITE } from './board';
import { randomizeOpeningBookMoves } from './opening-book';
import { VERSION } from '../version';
import { isValidMove } from './move-generation';
import {
  BISHOP_VALUE,
  EG_BISHOP_VALUE, EG_KNIGHT_VALUE, EG_PAWN_VALUE,
  EG_QUEEN_VALUE,
  EG_ROOK_VALUE, KNIGHT_VALUE, PAWN_VALUE,
  QUEEN_VALUE,
  resetPieceValues,
  ROOK_VALUE
} from './pieces';

export { _abort } from './io/wasi/abort';

// Option names
const HASH_OPTION = "hash";
const OWNBOOK_OPTION = "ownbook"

// Options
let transpositionTableSizeChanged: bool = false;
let transpositionTableSizeInMB: u32 = 1;
let pieceValuesChanged: bool = false;

// Entry point for the standalone engine
export function _start(): void {
  let isRunning = true;
  let isPositionSet: bool = false;

  EngineControl.setUseOpeningBook(false);

  stdio.writeLine("Wasabi " + VERSION + " by Martin Honert");

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

      } else if (command == "go" && (i + 1) < tokens.length) {
        if (!isPositionSet) {
          stdio.writeError("No position was set!");
          break;
        }
        go(tokens.slice(i + 1));
        break;

      } else if (command == "perft" && (i + 1) < tokens.length) {
        if (!isPositionSet) {
          stdio.writeError("No position was set!");
          break;
        }
        perft(tokens[i + 1]);
        break;

      } else if (command == "setoption" && (i + 1) < tokens.length) {
        setOption(tokens.slice(i + 1));
        break;

      } else if (command == 'quit') {
        isRunning = false;
        break;

      } else if (command == "test") {
        test();
        isRunning = false;
        break;

      } else if (command == "eval" && (i + 1) < tokens.length) {
        evalPositions(tokens.slice(i + 1));
        break;

      } else if (command == "stop") {
        // No op
        break;

      } else {
        stdio.writeLine("Unknown command: " + line);
      }

    }
  } while (isRunning);

}

function uci(): void {
  stdio.writeLine("id name Wasabi " + VERSION);
  stdio.writeLine("id author Martin Honert");
  stdio.writeLine("option name Hash type spin default " + DEFAULT_SIZE_MB.toString() + " min 1 max " + MAX_HASH_SIZE_MB.toString());
  stdio.writeLine("option name OwnBook type check default false");
  stdio.writeLine("option name UCI_EngineAbout type string default Wasabi Chess Engine (https://github.com/mhonert/chess)");

  calculatePieceSquareTables();

  stdio.writeLine("uciok");
}

function isReady(): void {
  if (transpositionTableSizeChanged) {
    EngineControl.resizeTranspositionTable(transpositionTableSizeInMB);
    transpositionTableSizeChanged = false;
  }

  if (pieceValuesChanged) {
    pieceValuesChanged = false;
    resetPieceValues();
    calculatePieceSquareTables();
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
  const depth = extractIntegerValue(parameters, "depth", 3);
  const wtime = extractIntegerValue(parameters, "wtime", 0);
  const btime = extractIntegerValue(parameters, "btime", 0);
  const winc = extractIntegerValue(parameters, "winc", 0);
  const binc = extractIntegerValue(parameters, "binc", 0);
  const movetime = extractIntegerValue(parameters, "movetime", 0);
  const movesToGo = extractIntegerValue(parameters, "movestogo", 40);

  if (depth <= 0) {
    stdio.writeLine("invalid depth: " + depth.toString())
    return
  }

  const timeLimitMillis: i32 = (EngineControl.getBoard().getActivePlayer() == WHITE)
    ? calculateTimeLimit(movetime, wtime, winc, movesToGo)
    : calculateTimeLimit(movetime, btime, binc, movesToGo);

  const timeLeft = (EngineControl.getBoard().getActivePlayer() == WHITE)
    ? wtime
    : btime;

  // Use strict time limit if a fixed move time is set
  const isStrictTimeLimit = movetime != 0 || (timeLeft - (TIMEEXT_MULTIPLIER * timeLimitMillis) <= 10);

  const move = EngineControl.findBestMove(depth, timeLimitMillis, isStrictTimeLimit);
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

function setArrayOptionValue(name: string, key: string, optionValue: string, targetArray: StaticArray<i32>): void {
  const index = I32.parseInt(name.substring(key.length));
  if (index < 0 || index > targetArray.length) {
    stdio.writeError("Index outside target array: " + key)
    return;
  }
  const value = I32.parseInt(optionValue);
  targetArray[index] = value;
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

  if (name.toLowerCase() == HASH_OPTION) {
    const sizeInMB = I32.parseInt(params[3]);
    if (sizeInMB >= 1 && sizeInMB != transpositionTableSizeInMB) {
      transpositionTableSizeInMB = min(sizeInMB, MAX_HASH_SIZE_MB);
      transpositionTableSizeChanged = true;

    }

  } else if (name.toLowerCase() == OWNBOOK_OPTION) {
    const useBook = "true" == params[3].toLowerCase();
    EngineControl.setUseOpeningBook(useBook);
    if (useBook) {
      randomizeOpeningBookMoves();
    }
  // *** Engine/Search Parameters
  // } else if (name.toLowerCase() == "futilitymarginmultiplier") {
  //   FUTILITY_MARGIN_MULTIPLIER = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "qsseethreshold") {
  //   QS_SEE_THRESHOLD = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "qsprunemargin") {
  //   QS_PRUNE_MARGIN = I32.parseInt(params[3]) * 25;
  //
  // } else if (name.toLowerCase() == "razormargin") {
  //   RAZOR_MARGIN = I32.parseInt(params[3]);

    // *** Eval Parameters
  } else if (name.toLowerCase().startsWith("kingdangerpenalty")) {
    setArrayOptionValue(name, "kingdangerpenalty", params[3], KING_DANGER_PIECE_PENALTY);

  } else if (name.toLowerCase().startsWith("knightmobbonus")) {
    setArrayOptionValue(name, "knightmobbonus", params[3], KNIGHT_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("bishopmobbonus")) {
    setArrayOptionValue(name, "bishopmobbonus", params[3], BISHOP_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("rookmobbonus")) {
    setArrayOptionValue(name, "rookmobbonus", params[3], ROOK_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("queenmobbonus")) {
    setArrayOptionValue(name, "queenmobbonus", params[3], QUEEN_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("egknightmobbonus")) {
    setArrayOptionValue(name, "egknightmobbonus", params[3], EG_KNIGHT_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("egbishopmobbonus")) {
    setArrayOptionValue(name, "egbishopmobbonus", params[3], EG_BISHOP_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("egrookmobbonus")) {
    setArrayOptionValue(name, "egrookmobbonus", params[3], EG_ROOK_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("egqueenmobbonus")) {
    setArrayOptionValue(name, "egqueenmobbonus", params[3], EG_QUEEN_MOB_BONUS);

  } else if (name.toLowerCase().startsWith("pawnpst")) {
    setArrayOptionValue(name, "pawnpst", params[3], PAWN_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("egpawnpst")) {
    setArrayOptionValue(name, "egpawnpst", params[3], EG_PAWN_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("knightpst")) {
    setArrayOptionValue(name, "knightpst", params[3], KNIGHT_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("egknightpst")) {
    setArrayOptionValue(name, "egknightpst", params[3], EG_KNIGHT_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("bishoppst")) {
    setArrayOptionValue(name, "bishoppst", params[3], BISHOP_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("egbishoppst")) {
    setArrayOptionValue(name, "egbishoppst", params[3], EG_BISHOP_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("rookpst")) {
    setArrayOptionValue(name, "rookpst", params[3], ROOK_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("egrookpst")) {
    setArrayOptionValue(name, "egrookpst", params[3], EG_ROOK_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("queenpst")) {
    setArrayOptionValue(name, "queenpst", params[3], QUEEN_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("egqueenpst")) {
    setArrayOptionValue(name, "egqueenpst", params[3], EG_QUEEN_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("kingpst")) {
    setArrayOptionValue(name, "kingpst", params[3], KING_POSITION_SCORES);
    pieceValuesChanged = true;

  } else if (name.toLowerCase().startsWith("egkingpst")) {
    setArrayOptionValue(name, "egkingpst", params[3], EG_KING_POSITION_SCORES);
    pieceValuesChanged = true;

  // } else if (name.toLowerCase() == "doubledpawnpenalty") {
  //   DOUBLED_PAWN_PENALTY = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "passedpawnbonus") {
  //   PASSED_PAWN_BONUS = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "kingshieldbonus") {
  //   KING_SHIELD_BONUS = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "castlingbonus") {
  //   CASTLING_BONUS = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "lostkingsidecastlingpenalty") {
  //   LOST_KINGSIDE_CASTLING_PENALTY = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "lostqueensidecastlingpenalty") {
  //   LOST_QUEENSIDE_CASTLING_PENALTY = I32.parseInt(params[3]);
  //
  // } else if (name.toLowerCase() == "pawncoverbonus") {
  //   PAWN_COVER_BONUS = I32.parseInt(params[3]);

  } else if (name.toLowerCase() == "queenvalue") {
    QUEEN_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "egqueenvalue") {
    EG_QUEEN_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "rookvalue") {
    ROOK_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "egrookvalue") {
    EG_ROOK_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "bishopvalue") {
    BISHOP_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "egbishopvalue") {
    EG_BISHOP_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "knightvalue") {
    KNIGHT_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "egknightvalue") {
    EG_KNIGHT_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "pawnvalue") {
    PAWN_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else if (name.toLowerCase() == "egpawnvalue") {
    EG_PAWN_VALUE = I32.parseInt(params[3]);
    pieceValuesChanged = true;

  } else {
    stdio.writeError("Unknown option name: " + name);
  }
}

function test(): void {
  uci();
  isReady();
  EngineControl.setPosition(STARTPOS);
  const move = EngineControl.findBestMove(3, 0, true);
  if (!isValidMove(EngineControl.getBoard(), EngineControl.getBoard().getActivePlayer(), move)) {
    throw new Error("Self test failed: generated invalid move: " + move.toString());
  }
  stdio.writeLine("debug Self test completed");
}

function evalPositions(tokens: Array<String>): void {
  const fens = tokens.join(" ").split(";")

  let scores = "scores ";
  for (let i = 0; i < fens.length; i++) {
    const fen = fens[i];
    const score = fromFEN(fen).getScore();
    if (i > 0) {
      scores += ';'
    }
    scores += score.toString();
  }

  stdio.writeLine(scores);
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

