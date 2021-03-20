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


import { B, K, N, P, Q, QUEEN, R } from '../pieces';
import EngineControl from '../engine';
import {
  BLACK,
  Board, calculatePieceSquareTables, NO_CASTLING_RIGHTS,
  WHITE
} from '../board';
import { decodeMove, decodeScore, encodeMove, encodeScoredMove, isCheckMate } from '../move-generation';

beforeAll(() => {
  calculatePieceSquareTables();
});

describe('Encode and decode scored moves', () => {
  it('Zero score', () => {
    const score = 0;
    const move = encodeMove(QUEEN, 2, 63);

    const scoredMove = encodeScoredMove(move, score);

    expect(decodeMove(scoredMove)).toBe(move, "Correctly extracted move");
    expect(decodeScore(scoredMove)).toBe(score, "Correctly extracted score");
  });

  it('Positive scores', () => {
    const score = 16383;
    const move = encodeMove(QUEEN, 2, 63);

    const scoredMove = encodeScoredMove(move, score);

    expect(decodeMove(scoredMove)).toBe(move, "Correctly extracted move");
    expect(decodeScore(scoredMove)).toBe(score, "Correctly extracted score");
  });

  it('Negative score', () => {
    const score = -16383;
    const move = encodeMove(QUEEN, 2, 63);

    const scoredMove = encodeScoredMove(move, score);

    expect(decodeMove(scoredMove)).toBe(move, "Correctly extracted move");
    expect(decodeScore(scoredMove)).toBe(score, "Correctly extracted score");
  });

});

describe('Finds moves', () => {
  it('Finds mate in 1 move', () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0,  0, +K,  0,  0,  0,
      -R,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0, -R,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    board.performEncodedMove(findBestMove(board, BLACK, 2));

    expect(isCheckMate(board, WHITE)).toBe(true);
  });

  it('Finds mate in two moves', () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0,  0, -K,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      +R,  0,  0,  0, +K,  0,  0, +R,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    board.performEncodedMove(findBestMove(board, WHITE, 3));
    board.performEncodedMove(findBestMove(board, BLACK, 2));
    board.performEncodedMove(findBestMove(board, WHITE, 1));

    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds another mate in two moves', () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0, -B, -R, -R, -B,  0,
      0,  0, +N,  0,  0,  0,  0, +B,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0, -P,  0,  0,  0,  0, +Q,
      0,  0, -P,  0,  0, -K,  0,  0,
      0,  0,  0,  0,  0, +P,  0,  0,
      0,  0,  0,  0, +P,  0, +K, +R,
      0,  0, +N,  0,  0, +R, +B,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    board.performEncodedMove(findBestMove(board, WHITE, 5));
    board.performEncodedMove(findBestMove(board, BLACK, 2));
    board.performEncodedMove(findBestMove(board, WHITE, 1));

    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds opening move', () => {
    // prettier-ignore
    const board: Board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P, -P,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, 0
    ]);

    const move = findBestMove(board, WHITE, 4);
    expect(move).toBeGreaterThan(0, "An encoded move");
  });

  it('Does not sacrifice queen', () => {
    // prettier-ignore
    const board: Board = new Board([
      -R,  0, -B, -Q,  0, -R,  0, -K,
       0, -P, -P,  0, -N, -P,  0,  0,
      -P,  0,  0, -P, -P,  0,  0, -P,
       0,  0,  0,  0,  0, -P,  0,  0,
      +B,  0, +P,  0, +P,  0,  0,  0,
       0,  0,  0,  0,  0,  0, +Q,  0,
      +P, +P, +P, +N,  0, +P, +P, +P,
      +R,  0,  0,  0,  0, +R, +K,  0,
      0, 0, 0
    ]);

    const move = findBestMove(board, WHITE, 2);
    board.performEncodedMove(move);
    expect(move).not.toBe(encodeMove(5, 46, 14), "Must not sacrifice queen @14");
    expect(move).not.toBe(encodeMove(5, 46, 19), "Must not sacrifice queen @19");
  });


  it('Avoids stalemate when it is ahead of the opponent', () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  R,
      0,  0,  0,  0,  0,  B,  0,  0,
      0,  0,  0,  N,  0,  P,  0,  0,
      0,  0,  0,  0,  P,  0, -K,  0,
      0,  0,  0,  0,  0,  0,  0, -R,
      0,  0,  0,  0,  0,  0,  P,  K,
      0,  0,  0,  0,  0,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    const move = findBestMove(board, WHITE, 2);
    expect(move).not.toBe(encodeMove(4, 15, 47), "Using the rook to capture the black rook causes a stalemate");
    expect(move).toBe(encodeMove(1, 54, 47), "Using the pawn for the capture lets the game proceed");
  });

  it('Avoids threefold repetition', () => {
    // prettier-ignore
    const board: Board = new Board([
      0, -K,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  R,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  K,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    board.performEncodedMove(findBestMove(board, WHITE, 1));
    const boardState1 = board.getHash();

    board.performEncodedMove(findBestMove(board, BLACK, 1));
    board.performEncodedMove(findBestMove(board, WHITE, 1));
    const boardState2 = board.getHash();

    board.performEncodedMove(findBestMove(board, BLACK, 1));
    board.performEncodedMove(findBestMove(board, WHITE, 1));
    const boardState3 = board.getHash();

    board.performEncodedMove(findBestMove(board, BLACK, 1));
    board.performEncodedMove(findBestMove(board, WHITE, 1));
    const boardState4 = board.getHash();

    board.performEncodedMove(findBestMove(board, BLACK, 1));
    board.performEncodedMove(findBestMove(board, WHITE, 1));
    const boardState5 = board.getHash();

    expect(boardState5 != boardState1).toBeTruthy("Threefold repetion!");

  });
});


// Test helper functions
function findBestMove(board: Board, playerColor: i32, exactDepth: i32): i32 {
  EngineControl.setBoard(board);
  if (board.getActivePlayer() != playerColor) {
    board.performNullMove();
  }
  return EngineControl.findBestMove(exactDepth, 0, true);
}

function findBestMoveIncrementally(board: Board, playerColor: i32, minimumDepth: i32, timeLimitMillis: i32): i32 {
  EngineControl.setBoard(board);
  if (board.getActivePlayer() != playerColor) {
    board.performNullMove();
  }
  return EngineControl.findBestMove(minimumDepth, timeLimitMillis, true);
}



