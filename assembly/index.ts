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
import { generateFilteredMoves, isCheckMate as isCheckMateFn } from './move-generation';
import { findBestMoveIncrementally, reset } from './engine';
import { Board } from './board';
import { fromFEN, toFEN } from './fen';

export const INT32ARRAY_ID = idof<Int32Array>();


export function newGame(): void {
  reset();
}


function createBoard(items: Int32Array): Board {
  const boardArray: Array<i32> = new Array<i32>();
  for (let i: i32 = 0; i < items.length; i++) {
    boardArray.push(items[i]);
  }
  const board = new Board(boardArray);
  board.recalculateHash();

  return board;
}

const DIFFICULTY_LEVELS: Array<Array<i32>> = [
  [2, 3, 0],
  [2, 3, 200, 400],
  [2, 5, 250, 500],
  [2, 5, 500, 1000],
  [2, 8, 750, 1500]
]

export function calculateMove(boardArray: Int32Array, color: i32, difficultyLevel: i32): i32 {
  const board = createBoard(boardArray);

  const levelSettings = DIFFICULTY_LEVELS[difficultyLevel - 1];
  const maxTime = board.isEndGame() ? levelSettings[3] : levelSettings[2];
  const move = findBestMoveIncrementally(board, color, levelSettings[0], levelSettings[1], maxTime);

  return move;
}

export function performMove(boardArray: Int32Array, encodedMove: i32): Int32Array {
  const board = createBoard(boardArray);
  board.performEncodedMove(encodedMove);

  const newBoard = new Int32Array(boardArray.length);
  for (let i = 0; i < boardArray.length; i++) {
    newBoard[i] = board.getItem(i);
  }

  trace("FEN: " + toFEN(board));

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

export function newBoardFromFEN(fen: string): Int32Array {
  const board = fromFEN(fen);
  const newBoard = new Int32Array(board.length());
  for (let i = 0; i < board.length(); i++) {
    newBoard[i] = board.getItem(i);
  }
  return newBoard;
}