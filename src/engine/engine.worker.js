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

import {instantiate} from "assemblyscript/lib/loader";
import { BLACK, WHITE } from './constants';
import { Move } from './move';

let engine;

// Initializes the wasm engine
export async function init() {
  if (engine) {
    return; // already initialized
  }
  engine = await instantiate(fetch("./as-api.wasm"));
  console.log("Engine initialized");
};

export function newGame() {
  engine.newGame();
}

export function calculateMove(difficultyLevel) {
  console.log('Start calculation of move ...');

  const moveEncoded = engine.calculateMove(difficultyLevel);
  const move = Move.fromEncodedMove(moveEncoded);

  console.log('Calculation finished');

  return move;
}

export function performMove(move) {
  const gameStatePtr = engine.performMove(move.encodedMove);

  const gameState = engine.__getArray(gameStatePtr);

  engine.__release(gameStatePtr);

  return decodeGameState(gameState);
}

export function setPosition(fen, moves) {
  const fenStr = engine.__allocString(fen);
  const fenPtr = engine.__retain(fenStr);
  const movesArray  = engine.__allocArray(engine.INT32ARRAY_ID, moves.map(move => move.encodedMove));
  const movesPtr = engine.__retain(movesArray);

  const gameStatePtr = engine.setPosition(fenPtr, movesPtr);

  const gameState = engine.__getArray(gameStatePtr);

  engine.__release(fenPtr);
  engine.__release(movesPtr);
  engine.__release(gameStatePtr);

  return decodeGameState(gameState);
}

const GAME_ENDED = 1
const CHECK_MATE = 2;
const STALE_MATE = 4;
const THREEFOLD_REPETITION_DRAW = 8;
const FIFTYMOVE_DRAW = 16;
const INSUFFICIENT_MATERIAL_DRAW = 32;
const ACTIVE_PLAYER = 64; // 0 - White, 1 - Black

function decodeGameState(gameState) {
  const board = gameState.slice(0, 64);
  const state = gameState[64];
  const moves = gameState.length > 65 ? gameState.slice(65).map(Move.fromEncodedMove) : [];

  return {
    board,
    moves,
    gameEnded: (state & GAME_ENDED) !== 0,
    checkMate: (state & CHECK_MATE) !== 0,
    staleMate: (state & STALE_MATE) !== 0,
    threefoldRepetition: (state & THREEFOLD_REPETITION_DRAW) !== 0,
    fiftyMoveDraw: (state & FIFTYMOVE_DRAW) !== 0,
    insufficientMaterial: (state & INSUFFICIENT_MATERIAL_DRAW) !== 0,
    activePlayer: (state & ACTIVE_PLAYER) !== 0 ? BLACK : WHITE
  }
}

