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


import { B, K, N, P, Q, QUEEN, R } from '../pieces';
import {
  BLACK_MATE_SCORE,
  Engine,
  findBestMove, findBestMoveIncrementally,
  WHITE_MATE_SCORE
} from '../engine';
import {
  __,
  BLACK,
  BLACK_KING_MOVED,
  BLACK_LEFT_ROOK_MOVED,
  BLACK_RIGHT_ROOK_MOVED,
  Board,
  WHITE,
  WHITE_KING_MOVED,
  WHITE_RIGHT_ROOK_MOVED
} from '../board';
import { decodeMove, decodeScore, encodeMove, encodeScoredMove, isCheckMate } from '../move-generation';
import { toInt32Array } from '../util';

describe('Encode and decode scored moves', () => {
  it('Zero score', () => {
    const score = 0;
    const move = encodeMove(QUEEN, 2, 98);

    const scoredMove = encodeScoredMove(move, score);

    expect(decodeMove(scoredMove)).toBe(move, "Correctly extracted move");
    expect(decodeScore(scoredMove)).toBe(score, "Correctly extracted score");
  });

  it('Positive scores', () => {
    const score = 16383;
    const move = encodeMove(QUEEN, 2, 98);

    const scoredMove = encodeScoredMove(move, score);

    expect(decodeMove(scoredMove)).toBe(move, "Correctly extracted move");
    expect(decodeScore(scoredMove)).toBe(score, "Correctly extracted score");
  });

  it('Negative score', () => {
    const score = -16383;
    const move = encodeMove(QUEEN, 2, 98);

    const scoredMove = encodeScoredMove(move, score);

    expect(decodeMove(scoredMove)).toBe(move, "Correctly extracted move");
    expect(decodeScore(scoredMove)).toBe(score, "Correctly extracted score");
  });

});

describe('Evaluate position', () => {
  it('Calculates even score for starting position', () => {
    const board: Array<i32> = [
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
      __, -P, -P, -P, -P, -P, -P, -P, -P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, +P, +P, +P, +P, +P, +P, +P, +P, __,
      __, +R, +N, +B, +Q, +K, +B, +N, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ];

    const engine = new Engine();
    engine.setBoard(new Board(board));
    const score = engine.evaluatePosition();

    expect(score).toBe(0);
  });

  // TODO: Store pawn bitboard in Board class and take them into account for the scoring function
  // it('Calculates lower score for doubled pawns', () => {
  //   const board: Array<i32> = [
  //     __, __, __, __, __, __, __, __, __, __,
  //     __, __, __, __, __, __, __, __, __, __,
  //     __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
  //     __, -P, -P, -P, -P, -P, -P, -P, -P, __,
  //     __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  //     __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  //     __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  //     __,  0,  0,  0,  0, +P,  0,  0,  0, __,
  //     __, +P, +P, +P,  0, +P, +P, +P, +P, __,
  //     __, +R, +N, +B, +Q, +K, +B, +N, +R, __,
  //     __, __, __, __, __, __, __, __, __, __,
  //     __, __, __, __, __, __, __, __, __, __, 0, 0, 0
  //   ];
  //
  //   const score = evaluatePosition(new Board(board));
  //   expect(score).toBeLessThan(0);
  // });

  it('Calculates higher score for pieces outside starting position', () => {
    const board: Array<i32> = [
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
      __, -P, -P, -P, -P, -P, -P, -P, -P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0, +P,  0,  0,  0, __,
      __,  0,  0, +N,  0,  0,  0,  0,  0, __,
      __, +P, +P, +P, +P,  0, +P, +P, +P, __,
      __, +R,  0, +B, +Q, +K, +B, +N, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ];

    const engine = new Engine();
    engine.setBoard(new Board(board));
    const score = engine.evaluatePosition();

    expect(score).toBeGreaterThan(0);
  });

  it('Calculates higher score for material advantage', () => {
    const board: Array<i32> = [
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
      __, -P, -P, -P, -P,  0, -P, -P, -P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, +P, +P, +P, +P, +P, +P, +P, +P, __,
      __, +R, +N, +B, +Q, +K, +B, +N, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ];

    const engine = new Engine();
    engine.setBoard(new Board(board));
    const score = engine.evaluatePosition();

    expect(score).toBeGreaterThan(0);
  });

  it('Calculates higher score for castled king position', () => {
    const board: Array<i32> = [
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0, -K,  0,  0, -R, __,
      __,  0,  0,  0,  0, -P, -P, -P, -P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0, +P, +P, +P, +P, __,
      __,  0,  0,  0,  0,  0, +R, +K,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, WHITE_KING_MOVED | WHITE_RIGHT_ROOK_MOVED
    ];

    const engine = new Engine();
    engine.setBoard(new Board(board));
    const score = engine.evaluatePosition();

    expect(score).toBeGreaterThan(0);
  });

  it('Calculate score if white is check mate', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0, +K,  0,  0, -R, __,
      __, -R,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0, -K,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ]);

    const engine = new Engine();
    engine.setBoard(board);
    const score = engine.evaluatePosition();

    expect(score).toBe(WHITE_MATE_SCORE);
  });

  it('Calculate score if black is check mate', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0, -K,  0,  0, +R, __,
      __, +R,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0, +K,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ]);

    const engine = new Engine();
    engine.setBoard(board);
    const score = engine.evaluatePosition();

    expect(score).toBe(BLACK_MATE_SCORE);
  });
});

describe('Finds moves', () => {
  it('Finds mate in 1 move', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0, +K,  0,  0,  0, __,
      __, -R,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0, -R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
    ]);

    board.performEncodedMove(findBestMove(board, BLACK, 2));

    expect(isCheckMate(board, WHITE)).toBe(true);
  });

  it('Finds mate in two moves', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0, -K,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, +R,  0,  0,  0, +K,  0,  0, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, BLACK_LEFT_ROOK_MOVED | BLACK_RIGHT_ROOK_MOVED
    ]);

    board.performEncodedMove(findBestMove(board, WHITE, 3));
    board.performEncodedMove(findBestMove(board, BLACK, 2));
    board.performEncodedMove(findBestMove(board, WHITE, 1));

    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds another mate in two moves', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -B, -R, -R, -B,  0, __,
      __,  0,  0, +N,  0,  0,  0,  0, +B, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0, -P,  0,  0,  0,  0, +Q, __,
      __,  0,  0, -P,  0,  0, -K,  0,  0, __,
      __,  0,  0,  0,  0,  0, +P,  0,  0, __,
      __,  0,  0,  0,  0, +P,  0, +K, +R, __,
      __,  0,  0, +N,  0,  0, +R, +B,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, BLACK_LEFT_ROOK_MOVED | BLACK_RIGHT_ROOK_MOVED
    ]);

    board.performEncodedMove(findBestMove(board, WHITE, 3));
    board.performEncodedMove(findBestMove(board, BLACK, 2));
    board.performEncodedMove(findBestMove(board, WHITE, 1));

    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds opening move', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
      __, -P, -P, -P, -P, -P, -P, -P, -P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, +P, +P, +P, +P, +P, +P, +P, +P, __,
      __, +R, +N, +B, +Q, +K, +B, +N, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ]);

    const move = findBestMove(board, WHITE, 4);
    expect(move).toBeGreaterThan(0, "An encoded move");
  });

  it('Does not sacrifice queen', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __, -R,  0, -B, -Q,  0, -R,  0, -K, __,
      __,  0, -P, -P,  0, -N, -P,  0,  0, __,
      __, -P,  0,  0, -P, -P,  0,  0, -P, __,
      __,  0,  0,  0,  0,  0, -P,  0,  0, __,
      __, +B,  0, +P,  0, +P,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0, +Q,  0, __,
      __, +P, +P, +P, +N,  0, +P, +P, +P, __,
      __, +R,  0,  0,  0,  0, +R, +K,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, 0
    ]);

    const move = findBestMove(board, WHITE, 2);
    board.performEncodedMove(move);
    expect(move).not.toBe(encodeMove(5, 77, 37), "Must not sacrifice queen @37");
    expect(move).not.toBe(encodeMove(5, 77, 44), "Must not sacrifice queen @44");
  });


  it('Avoids stalemate when it is ahead of the opponent', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  R, __,
      __,  0,  0,  0,  0,  0,  B,  0,  0, __,
      __,  0,  0,  0,  N,  0,  P,  0,  0, __,
      __,  0,  0,  0,  0,  P,  0, -K,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0, -R, __,
      __,  0,  0,  0,  0,  0,  0,  P,  K, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
    ]);

    const move = findBestMove(board, WHITE, 2);
    expect(move).not.toBe(encodeMove(4, 38, 78), "Using the rook to capture the black rook causes a stalemate");
    expect(move).toBe(encodeMove(1, 87, 78), "Using the pawn for the capture lets the game proceed");
  });

  it('Finds mate in 3 moves (bug reproduction)', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0,  0,  0, -K,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  K, -P,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0, -Q,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0, -R,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
    ]);
    board.increaseHalfMoveCount();

    board.performEncodedMove(findBestMoveIncrementally(board, BLACK, 3, 7, 0)); // bug only occured with search depth 7
    board.performEncodedMove(findBestMoveIncrementally(board, WHITE, 3, 3, 0));
    board.performEncodedMove(findBestMoveIncrementally(board, BLACK, 3, 5, 0));
    board.performEncodedMove(findBestMoveIncrementally(board, WHITE, 3, 3, 0));
    board.performEncodedMove(findBestMoveIncrementally(board, BLACK, 3, 3, 0));

    expect(isCheckMate(board, WHITE)).toBe(true);
  });

  it('Avoids threefold repetition', () => {
    // prettier-ignore
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0, -K,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  R,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  K,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
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

describe("Move list sorting", () => {

  it("sorts moves descending by score", () => {
    const moves: Int32Array = toInt32Array([encodeScoredMove(0, 12), encodeScoredMove(1, 5), encodeScoredMove(2, 27), encodeScoredMove(3, 15)]);

    const engine = new Engine();
    engine.sortByScoreDescending(moves);

    expect(decodeScore(moves[0])).toBe(27);
    expect(decodeScore(moves[1])).toBe(15);
    expect(decodeScore(moves[2])).toBe(12);
    expect(decodeScore(moves[3])).toBe(5);
  });

  it("sorts empty move list descending", () => {
    const engine = new Engine();
    engine.sortByScoreDescending(new Int32Array(0));
  });

  it("sorts moves with 1 element descending", () => {
    const moves: Int32Array = toInt32Array([encodeScoredMove(0, 12)]);
    const engine = new Engine();
    engine.sortByScoreDescending(moves);

    expect(decodeScore(moves[0])).toBe(12);
  });

  it("sorts moves with 2 elements descending", () => {
    const moves: Int32Array = toInt32Array([encodeScoredMove(0, 5), encodeScoredMove(1, 12)]);
    const engine = new Engine();
    engine.sortByScoreDescending(moves);

    expect(decodeScore(moves[0])).toBe(12);
    expect(decodeScore(moves[1])).toBe(5);
  });

  it("sorts moves ascending by score for black player", () => {
    const moves: Int32Array = toInt32Array([encodeScoredMove(0, 12), encodeScoredMove(1, 5), encodeScoredMove(2, 27), encodeScoredMove(3, 15)]);

    const engine = new Engine();
    engine.sortByScoreAscending(moves);

    expect(decodeScore(moves[0])).toBe(5);
    expect(decodeScore(moves[1])).toBe(12);
    expect(decodeScore(moves[2])).toBe(15);
    expect(decodeScore(moves[3])).toBe(27);
  });

  it("sorts empty move list ascending", () => {
    const engine = new Engine();
    engine.sortByScoreAscending(new Int32Array(0));
  });

  it("sorts moves with 1 element ascending", () => {
    const moves: Int32Array = toInt32Array([encodeScoredMove(0, 12)]);
    const engine = new Engine();
    engine.sortByScoreAscending(moves);

    expect(decodeScore(moves[0])).toBe(12);
  });

  it("sorts moves with 2 elements ascending", () => {
    const moves: Int32Array = toInt32Array([encodeScoredMove(0, 12), encodeScoredMove(1, 5)]);
    const engine = new Engine();
    engine.sortByScoreAscending(moves);

    expect(decodeScore(moves[0])).toBe(5);
    expect(decodeScore(moves[1])).toBe(12);
  });
});
