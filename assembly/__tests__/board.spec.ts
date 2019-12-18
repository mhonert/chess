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

import {
  __,
  Board,
  BOARD_POS_TO_BIT_PATTERN,
  DIAGONAL_UP_PATTERNS,
  HORIZONTAL_PATTERNS,
  KNIGHT_PATTERNS,
  mirrored,
  PAWN_POSITION_SCORES,
  VERTICAL_PATTERNS,
  WHITE
} from '../board';
import { BISHOP, K, KNIGHT, N, P, R, ROOK } from '../pieces';
import { KNIGHT_DIRECTIONS } from '../move-generation';

describe('Mirrored function', () => {
  it('mirrors score tables correctly', () => {
    expect(mirrored(mirrored(PAWN_POSITION_SCORES)).toString()).toBe(PAWN_POSITION_SCORES.toString());
  });
});

describe('Attack detection via bitboards', () => {
  it('horizontal bitboard is setup correctly', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, +K,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    // Put a rook on each field
    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        board.addPiece(WHITE, ROOK, i);
      }
    }

    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        expect(board.hasOrthogonalSlidingFigure(WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
      }
    }
  });

  it('detects orthogonal attack on each field', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, +K,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    // Put a rook on each field
    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        board.addPiece(WHITE, ROOK, i);

        for (let j = 21; j <= 98; j++) {
          if (i == j || board.isBorder(j)) {
            continue
          }

          if (i % 10 == j % 10) {
            expect(board.isVerticallyAttacked(WHITE, j)).toBeTruthy("Vertical Attack not detected " + i.toString() + " vs. " + j.toString());
          } else if (i / 10 == j / 10) {
            expect(board.isHorizontallyAttacked(WHITE, j)).toBeTruthy("Horizontal Attack not detected " + i.toString() + " vs. " + j.toString());
          }
        }
        board.removePiece(i);
      }

    }
  });

  it('diagonal bitboard is setup correctly', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, +K,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    // Put a bishop on each field
    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        board.addPiece(WHITE, BISHOP, i);
      }
    }

    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        expect(board.hasDiagonalSlidingFigure(WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
      }
    }
  });

  it('detects diagonal attack on each field', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, +K,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    // Put a bishop on each field
    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        board.addPiece(WHITE, BISHOP, i);

        for (let j = 30; j <= 89; j++) {
          if (i == j || board.isBorder(j)) {
            continue
          }

          if (i == j + 11 || i == j - 11) {
            expect(board.isDiagonallyDownAttacked(WHITE, j)).toBeTruthy("Diagonal-down Attack not detected " + i.toString() + " vs. " + j.toString());
          } else if (i == j + 9 || i == j - 9) {
            expect(board.isDiagonallyUpAttacked(WHITE, j)).toBeTruthy("Diagonal-up Attack not detected " + i.toString() + " vs. " + j.toString());
          }
        }
        board.removePiece(i);
      }

    }
  });

  it('detects horizontal attacks', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  R,  0,  0,  0, -K,  0,  0,  0, __,
      __,  0,  0,  0,  0, -P,  0,  0,  0, __,
      __,  0,  0,  0,  0, -N,  0,  R,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  K,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    expect(board.isHorizontallyAttacked(WHITE, 25)).toBeTruthy("King is attacked by white rook on the left side");
    expect(board.isHorizontallyAttacked(WHITE, 35)).toBeFalsy("Pawn is not attacked");
    expect(board.isHorizontallyAttacked(WHITE, 45)).toBeTruthy("Knight is attacked by white rook on the right side");
  });

  it('detects vertical attacks', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0,  0, -K, -P,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  R,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  R,  0,  0,  0, __,
      __,  0,  0,  0, -N,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  K,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    expect(board.isVerticallyAttacked(WHITE, 25)).toBeTruthy("King is attacked by white rook below");
    expect(board.isVerticallyAttacked(WHITE, 26)).toBeFalsy("Pawn is not attacked");
    expect(board.isVerticallyAttacked(WHITE, 64)).toBeTruthy("Knight is attacked by white rook above");
  });

  it('sets knight boards correctly', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, +K,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    // Put a knight on each field
    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        board.addPiece(WHITE, KNIGHT, i);
      }
    }

    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        expect(board.hasKnight(WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
      }
    }

  });

  it('detects knight attacks on each field', () => {
    const board: Board = new Board([
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0,  0,  0, -K,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __,  0,  0,  0, +K,  0,  0,  0,  0, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ]);

    // Put a knight on each field
    for (let i = 21; i <= 98; i++) {
      if (!board.isBorder(i)) {
        board.addPiece(WHITE, KNIGHT, i);

        for (let j = 0; j < KNIGHT_DIRECTIONS.length; j++) {
          const direction = KNIGHT_DIRECTIONS[j];
          const target = i + direction;
          if (board.isBorder(target)) {
            continue
          }

          expect(board.isKnightAttacked(WHITE, target)).toBeTruthy("Knight Attack not detected " + i.toString() + " vs. " + target.toString());
        }
        board.removePiece(i);
      }

    }
  });

});

