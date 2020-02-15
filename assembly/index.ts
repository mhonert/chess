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

// The entry file of your WebAssembly module.
/// <reference path="../node_modules/@as-pect/core/types/as-pect.d.ts" />
/// <reference path="../node_modules/@as-pect/core/types/as-pect.portable.d.ts" />

import EngineControl from './engine';
import { isCheckMate as isCheckMateFn } from './move-generation';
import { BLACK, WHITE } from './board';
import { clock_time_get, clockid } from 'bindings/wasi';

const DIFFICULTY_LEVELS: Array<Array<i32>> = [
  [2, 3, 0, 0],
  [2, 3, 200, 400],
  [2, 5, 250, 500],
  [2, 5, 500, 1000],
  [2, 9, 900, 1500]
]

export const INT32ARRAY_ID = idof<Int32Array>();

const GAME_ENDED = 1
const CHECK_MATE = 2;
const STALE_MATE = 4;
const THREEFOLD_REPETITION_DRAW = 8;
const FIFTYMOVE_DRAW = 16;
const INSUFFICIENT_MATERIAL_DRAW = 32;
const ACTIVE_PLAYER = 64; // 0 - White, 1 - Black

// Resets the engine state for a new game
export function newGame(): void {
  EngineControl.reset();
}

// Sets the current board to the given position and returns the encoded game state
export function setPosition(fen: string, moves: Int32Array): Int32Array {
  EngineControl.setPosition(fen);

  for (let i = 0; i < moves.length; i++) {
    EngineControl.performMove(moves[i]);
  }

  return encodeChessState(false);
}

// Calculates the best move for the current player using the given difficulty level
export function calculateMove(difficultyLevel: i32): i32 {
  const levelSettings = DIFFICULTY_LEVELS[difficultyLevel - 1];
  const maxTime = EngineControl.getBoard().isEndGame() ? levelSettings[3] : levelSettings[2];
  const move = EngineControl.findBestMove(levelSettings[0], levelSettings[1], maxTime);

  return move;
}

// Applies the given move to the current board and returns the encoded game state
export function performMove(encodedMove: i32): Int32Array {
  EngineControl.performMove(encodedMove);

  return encodeChessState(true);
}


// Encodes the board (index 0-63), the game state (index 64) and all possible moves for the current player (index 65+)
function encodeChessState(checkThreefoldRepetition: bool): Int32Array {
  const board = EngineControl.getBoard();
  const moves = EngineControl.generateAvailableMoves();

  const stateArray = new Int32Array(64 + 1 + moves.length);

  for (let i = 0; i < 64; i++) {
    stateArray[i] = board.getItem(i);
  }

  const isCheckMate: bool = isCheckMateFn(board, board.getActivePlayer());
  const isStaleMate: bool = moves.length == 0;
  const isThreefoldRepetition: bool = checkThreefoldRepetition && board.isThreefoldRepetion();
  const isFiftyMoveDraw: bool = board.isFiftyMoveDraw();
  const isInsufficientMaterialDraw: bool = false;

  const hasGameEnded: bool = isCheckMate || isStaleMate || isThreefoldRepetition || isFiftyMoveDraw || isInsufficientMaterialDraw;

  stateArray[64] = (hasGameEnded ? GAME_ENDED : 0)
    | (isCheckMate ? CHECK_MATE : 0)
    | (isStaleMate ? STALE_MATE : 0)
    | (isThreefoldRepetition ? THREEFOLD_REPETITION_DRAW : 0)
    | (isFiftyMoveDraw ? FIFTYMOVE_DRAW : 0)
    | (isInsufficientMaterialDraw ? INSUFFICIENT_MATERIAL_DRAW : 0)
    | ((board.getActivePlayer() == BLACK) ? ACTIVE_PLAYER : 0)

  for (let i = 0; i < moves.length; i++) {
    stateArray[i + 65] = moves[i];
  }

  return stateArray;
}

