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

// The entry file of your WebAssembly module.
/// <reference path="../node_modules/@as-pect/core/types/as-pect.d.ts" />
/// <reference path="../node_modules/@as-pect/core/types/as-pect.portable.d.ts" />
import {
  decodeEndIndex,
  decodePiece,
  decodeStartIndex, generateFilteredMoves,
  isCheckMate as isCheckMateFn,
  performEncodedMove
} from './move-generation';
import { findBestMoveIncrementally } from './engine';
import { Board } from './board';

export const INT32ARRAY_ID = idof<Int32Array>();

function createBoard(board: Int32Array): Board {
  const boardArray: Array<i32> = new Array<i32>();
  for (let i: i32 = 0; i < board.length; i++) {
    boardArray.push(board[i]);
  }
  return new Board(boardArray);
}

const DIFFICULTY_LEVELS: Array<Array<i32>> = [
  [3, 0],
  [3, 200],
  [5, 250],
  [5, 2500],
  [7, 5000]
]

export function calculateMove(boardArray: Int32Array, color: i32, difficultyLevel: i32): i32 {
  trace("Calculation started");

  const board = createBoard(boardArray);

  const levelSettings = DIFFICULTY_LEVELS[difficultyLevel - 1];
  const move = findBestMoveIncrementally(board, color, 3, levelSettings[0], levelSettings[1]);

  trace("Found best move", 1, decodePiece(move), decodeStartIndex(move), decodeEndIndex(move));

  return move;
}

export function performMove(boardArray: Int32Array, encodedMove: i32): Int32Array {
  const board = createBoard(boardArray);
  performEncodedMove(board, encodedMove);

  const newBoard = new Int32Array(boardArray.length);
  for (let i = 0; i < boardArray.length; i++) {
    newBoard[i] = board.getItem(i);
  }

  trace("Full move count: ", 1, board.getFullMoveCount());
  trace("Half move clock: ", 1, board.getHalfMoveClock());

  return newBoard;
}

export function generatePlayerMoves(boardArray: Int32Array, color: i32): Int32Array {
  const board = createBoard(boardArray);
  const moves = generateFilteredMoves(board, color);

  const movesArray = new Int32Array(moves.length);
  for (let i = 0; i < moves.length; i++) {
    movesArray[i] = moves[i];
  }

  return movesArray;
}

export function isCheckMate(boardArray: Int32Array, color: i32): bool {
  const board = createBoard(boardArray);
  return isCheckMateFn(board, color);
}