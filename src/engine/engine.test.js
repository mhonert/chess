/*
 * Chess App using React and Web Workers
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

import { isCheckMate, performMove } from './move-generation';
import { findBestMove, evaluatePosition, boardRowFromIndex } from './engine';
import { B, K, N, P, Q, R } from './pieces';
import {
  __,
  BLACK,
  BLACK_LEFT_ROOK_MOVED,
  BLACK_RIGHT_ROOK_MOVED,
  WHITE
} from './board';

describe('Calculate board row from board index', () => {
  it('Calculcates correct row for index in first row', () => {
    expect(boardRowFromIndex(21)).toBe(0);
    expect(boardRowFromIndex(31)).toBe(0);
    expect(boardRowFromIndex(91)).toBe(0);
  });

  it('Calculcates correct row for index in last row', () => {
    expect(boardRowFromIndex(28)).toBe(7);
    expect(boardRowFromIndex(38)).toBe(7);
    expect(boardRowFromIndex(98)).toBe(7);
  });
});

describe('Evaluate position', () => {
  it('Calculates even score for starting position', () => {
    // prettier-ignore
    const startBoard = [
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
      __, __, __, __, __, __, __, __, __, __, 0
    ];

    const score = evaluatePosition(startBoard);
    expect(score).toBe(0);
  });

  it('Calculates lower score for doubled pawns', () => {
    // prettier-ignore
    const startBoard = [
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
      __, -P, -P, -P, -P, -P, -P, -P, -P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0, +P,  0,  0,  0, __,
      __, +P, +P, +P,  0, +P, +P, +P, +P, __,
      __, +R, +N, +B, +Q, +K, +B, +N, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ];

    const score = evaluatePosition(startBoard);
    expect(score).toBeLessThan(0);
  });

  it('Calculates higher score for pieces outside starting position', () => {
    // prettier-ignore
    const board = [
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
      __, __, __, __, __, __, __, __, __, __, 0
    ];

    const score = evaluatePosition(board);
    expect(score).toBeGreaterThan(0);
  });

  it('Calculates higher score for material advantage', () => {
    // prettier-ignore
    const board = [
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
      __, __, __, __, __, __, __, __, __, __, 0
    ];

    const score = evaluatePosition(board);
    expect(score).toBeGreaterThan(0);
  });

  it('Calculates higher score for castled king position', () => {
    // prettier-ignore
    const board = [
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
      __, __, __, __, __, __, __, __, __, __, 0
    ];

    const score = evaluatePosition(board);
    expect(score).toBeGreaterThan(0);
  });
});

describe('Finds moves', () => {
  it('Finds mate in 1 move', () => {
    // prettier-ignore
    const board = [
      __, __, __, __, __, __, __, __, __, __,
            __, __, __, __, __, __, __, __, __, __,
            __,  0,  0,  0,  0, -K,  0,  0,  0, __,
            __, +R,  0,  0,  0,  0,  0,  0,  0, __,
            __,  0,  0,  0,  0,  0,  0,  0,  0, __,
            __,  0,  0,  0,  0,  0,  0,  0,  0, __,
            __,  0,  0,  0,  0,  0,  0,  0,  0, __,
            __,  0,  0,  0,  0,  0,  0,  0,  0, __,
            __,  0,  0,  0,  0,  0,  0,  0,  0, __,
            __,  0,  0,  0,  0, +K,  0,  0, +R, __,
            __, __, __, __, __, __, __, __, __, __,
            __, __, __, __, __, __, __, __, __, __, BLACK_LEFT_ROOK_MOVED | BLACK_RIGHT_ROOK_MOVED
        ];

    performMove(board, findBestMove(board, WHITE, 2));
    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds mate in two moves', () => {
    // prettier-ignore
    const board = [
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
            __, __, __, __, __, __, __, __, __, __, BLACK_LEFT_ROOK_MOVED | BLACK_RIGHT_ROOK_MOVED
        ];

    performMove(board, findBestMove(board, WHITE, 3));
    performMove(board, findBestMove(board, BLACK, 1));
    performMove(board, findBestMove(board, WHITE, 1));

    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds another mate in two moves', () => {
    // prettier-ignore
    const board = [
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
            __, __, __, __, __, __, __, __, __, __, BLACK_LEFT_ROOK_MOVED | BLACK_RIGHT_ROOK_MOVED
        ];

    performMove(board, findBestMove(board, WHITE, 3));
    performMove(board, findBestMove(board, BLACK, 1));
    performMove(board, findBestMove(board, WHITE, 1));

    expect(isCheckMate(board, BLACK)).toBe(true);
  });

  it('Finds opening move', () => {
    // prettier-ignore
    const board = [
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
            __, __, __, __, __, __, __, __, __, __, 0
        ];

    const move = findBestMove(board, WHITE, 3);
    expect(move).toBeDefined();
  });
});
