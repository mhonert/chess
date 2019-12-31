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

import {instantiate} from "assemblyscript/lib/loader";


// Loads and interacts with the wasm engine.
class Engine {
  async init() {
    if (this.engine) {
      return; // already initialized
    }
    this.engine = await instantiate(fetch("./as-api.wasm"));
    console.log("Engine initialized");
  };

  newGame() {
    this.engine.newGame();
  }

  calculateMove(board, playerColor, depth) {
    console.log('Start calculation of move ...');

    const boardArray  = this.engine.__allocArray(this.engine.INT32ARRAY_ID, board);
    const boardPtr = this.engine.__retain(boardArray);

    const moveEncoded = this.engine.calculateMove(boardPtr, playerColor, depth);

    const move = Move.fromEncodedMove(moveEncoded);

    this.engine.__release(boardPtr);

    console.log('Calculation finished');

    return move;
  }

  performMove(board, move) {
    const boardArray  = this.engine.__allocArray(this.engine.INT32ARRAY_ID, board);
    const boardPtr = this.engine.__retain(boardArray);

    const newBoardPtr = this.engine.performMove(boardPtr, move.encodedMove);

    const newBoard = this.engine.__getArray(newBoardPtr);

    this.engine.__release(boardPtr);
    this.engine.__release(newBoardPtr);

    return newBoard;
  }

  generateMoves(board, playerColor) {
    const boardArray  = this.engine.__allocArray(this.engine.INT32ARRAY_ID, board);
    const boardPtr = this.engine.__retain(boardArray);

    const movesPtr = this.engine.generatePlayerMoves(boardPtr, playerColor);

    const moves = this.engine.__getArray(movesPtr);

    this.engine.__release(movesPtr);
    this.engine.__release(boardPtr);

    return moves.map(Move.fromEncodedMove);
  }

  isCheckMate(board, playerColor) {
    const boardArray  = this.engine.__allocArray(this.engine.INT32ARRAY_ID, board);
    const boardPtr = this.engine.__retain(boardArray);

    const result = this.engine.isCheckMate(boardPtr, playerColor);

    this.engine.__release(boardPtr);

    return result;
  }
}

export class Move {
  constructor(piece, start, end) {
    this.piece = piece;
    this.start = start;
    this.end = end;
    this.encodedMove = piece | (start << 3) | (end << 10);
  }

  static fromEncodedMove(encodedMove) {
    const piece = encodedMove & 0x7; // Bits 0-2
    const start = (encodedMove >> 3) & 0x7F; // Bits 3-10
    const end = (encodedMove >> 10) & 0x7F; // Bit 10-17

    return new Move(piece, start, end);
  }
}

export default new Engine();

