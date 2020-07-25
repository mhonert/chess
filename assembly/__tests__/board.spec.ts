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

import {
  ALL_CASTLING_RIGHTS,
  BLACK,
  Board, calculatePieceSquareTables, DOUBLED_PAWN_PENALTY,
  mirrored, NO_CASTLING_RIGHTS,
  PAWN_POSITION_SCORES,
  WHITE
} from '../board';
import { B, BISHOP, BISHOP_DIRECTIONS, K, KNIGHT, KNIGHT_DIRECTIONS, N, P, Q, QUEEN, R, ROOK } from '../pieces';
import { moveKing } from '../util';
import { fromFEN } from '../fen';

beforeAll(() => {
  calculatePieceSquareTables();
});

describe('Mirrored function', () => {
  it('mirrors score tables correctly', () => {
    expect(mirrored(mirrored(PAWN_POSITION_SCORES)).toString()).toBe(PAWN_POSITION_SCORES.toString());
  });
});

describe('Attack detection via bitboards', () => {
  it('horizontal bitboard is setup correctly', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    // Put a rook on each field
    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, ROOK, i);
    }

    for (let i = 0; i <= 63; i++) {
      expect(hasOrthogonalSlidingFigure(board, WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
    }
  });

  it('detects orthogonal attack on each field', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    board.removePiece(board.findKingPosition(WHITE));
    board.removePiece(board.findKingPosition(BLACK));

    // Put a rook on each field
    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, ROOK, i);

      for (let j = 0; j <= 63; j++) {
        if (i == j) {
          continue
        }

        if (i % 8 == j % 8) {
          expect(board.isAttacked(WHITE, j)).toBeTruthy("Vertical Attack not detected " + i.toString() + " vs. " + j.toString());
        } else if (i / 8 == j / 8) {
          expect(board.isAttacked(WHITE, j)).toBeTruthy("Horizontal Attack not detected " + i.toString() + " vs. " + j.toString());
        }
      }
      board.removePiece(i);
    }
  });

  it('diagonal bitboard is setup correctly', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    // Put a bishop on each field
    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, BISHOP, i);
    }

    for (let i = 0; i <= 63; i++) {
      expect(hasDiagonalSlidingFigure(board, WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
    }
  });

  it('detects diagonal attack on each field', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    // Put a bishop on each field
    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, BISHOP, i);

      let startCol = i % 8;
      let startRow = i / 8;

      for (let d = 0; d < BISHOP_DIRECTIONS.length; d++) {
        let endPos = i + BISHOP_DIRECTIONS[d];
        let endCol = endPos % 8;
        let endRow = endCol / 8;

        if (endPos < 0 || endPos > 63 || abs(startRow - endRow) > 1 || abs(startCol - endCol) > 1) {
          continue; // Hit border
        }
        expect(board.isAttacked(WHITE, endPos))
          .toBeTruthy("Diagonal Attack not detected " + BISHOP_DIRECTIONS[d].toString() + ": " + i.toString() + " vs. " + endPos.toString());
      }
    }
  });

  it('detects horizontal attacks', () => {
    const board: Board = new Board([
      R,  0,  0,  0, -K,  0,  0,  0,
      0,  0,  0,  0, -P,  0,  0,  0,
      0,  0,  0,  0, -N,  0,  R,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  K,  0,  0,  0,
      0, 0, 0
    ]);

    expect(board.isAttacked(WHITE, 4)).toBeTruthy("King is attacked by white rook on the left side");
    expect(board.isAttacked(WHITE, 12)).toBeFalsy("Pawn is not attacked");
    expect(board.isAttacked(WHITE, 20)).toBeTruthy("Knight is attacked by white rook on the right side");
  });

  it('detects vertical attacks', () => {
    const board: Board = new Board([
      0,  0,  0,  0, -K, -P,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  R,  0,  0,  0,  0,
      0,  0,  0,  0,  R,  0,  0,  0,
      0,  0,  0, -N,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  K,  0,  0,  0,
      0, 0, 0
    ]);

    expect(board.isAttacked(WHITE, 4)).toBeTruthy("King is attacked by white rook below");
    expect(board.isAttacked(WHITE, 5)).toBeFalsy("Pawn is not attacked");
    expect(board.isAttacked(WHITE, 35)).toBeTruthy("Knight is attacked by white rook above");
  });

  it('sets knight boards correctly', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    // Put a knight on each field
    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, KNIGHT, i);
    }

    for (let i = 0; i <= 63; i++) {
      expect(hasKnight(board, WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
    }

  });

  it('detects knight attacks on each field', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    // Put a knight on each field
    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, KNIGHT, i);

      let startCol = i % 8;
      let startRow = i / 8;

      for (let j = 0; j < KNIGHT_DIRECTIONS.length; j++) {
        const direction = KNIGHT_DIRECTIONS[j];
        const target = i + direction;

        let endCol = target % 8;
        let endRow = target / 8;
        if (target < 0 || target > 63 || abs(startRow - endRow) > 1 || abs(startCol - endCol) > 1) {
          continue; // Hit border
        }

        expect(board.isKnightAttacked(WHITE, target)).toBeTruthy("Knight Attack not detected " + i.toString() + " vs. " + target.toString());
      }
      board.removePiece(i);
    }
  });

});

describe("Board state", () => {

  it("returns correct castling bits", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    expect(board.getCastlingStateBits()).toBe(0b1111);

    board.setWhiteKingMoved();
    board.setWhiteQueenSideRookMoved();
    board.setWhiteKingSideRookMoved();
    board.setBlackKingMoved();
    board.setBlackQueenSideRookMoved();
    board.setBlackKingSideRookMoved();

    expect(board.getCastlingStateBits()).toBe(0);
  });


  it("updates state for castling move", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      +R,  0,  0,  0, +K,  0,  0,  0,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    expect(board.hasWhiteCastled()).toBeFalsy("Before castling move");
    board.performMove(K, 60, 58);
    expect(board.hasWhiteCastled()).toBeTruthy("After castling move");

    board.undoMove(K, 60, 58, 0);
    expect(board.hasWhiteCastled()).toBeFalsy("After castling move is undone");
  });
});


describe("Zobrist hashing", () => {

  it("updates hash for piece movements", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    board.recalculateHash();

    const initialHash = board.getHash();

    board.removePiece(59);
    board.addPiece(WHITE, K, 60);
    const hashAfterMove = board.getHash();

    board.removePiece(60);
    board.addPiece(WHITE, K, 59);
    const hashForRevertedMove = board.getHash();

    expect(hashAfterMove).not.toBe(initialHash, "Hash after move should be different");
    expect(hashForRevertedMove).toBe(initialHash, "Hash after reverted move should match the initial hash");
  });

  it("updates hash for en passant changes", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0, -P,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +P,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    board.recalculateHash();

    const initialHash = board.getHash();
    board.setEnPassantPossible(51);

    expect(board.getHash()).not.toBe(initialHash, "Hash after en passant state change should be different");
  });

  it("updates hash for active player change", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0, -P,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +P,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    board.recalculateHash();

    const initialHash = board.getHash();
    board.increaseHalfMoveCount();
    expect(board.getHash()).not.toBe(initialHash, "Hash after active player change should be different");

    board.increaseHalfMoveCount();
    expect(board.getHash()).toBe(initialHash, "Hash should be the same if the initial player is the active player again");
  });

  it("updates hash for castling state change", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0, +K, +R,  0,  0,  0,  0,  0,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    board.recalculateHash();
    const initialHash = board.getHash();

    board.setWhiteQueenSideRookMoved();
    board.setWhiteKingMoved();
    expect(board.getHash()).not.toBe(initialHash, "Hash after castling state change should be different");
  });

  it("incrementally updates hash correctly", () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    board.recalculateHash();

    board.addPiece(WHITE, P, 48);
    board.addPiece(BLACK, K, 1);
    board.setWhiteKingMoved();
    board.setBlackQueenSideRookMoved();

    board.increaseHalfMoveCount();

    const incrementallyUpdatedHash = board.getHash();
    board.recalculateHash();
    const recalculatedHash = board.getHash();

    expect(incrementallyUpdatedHash).toBe(recalculatedHash);
  });

});

describe('All piece bitboards', () => {
  it('is updated correctly using addPiece/removePiece', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    board.removePiece(board.findKingPosition(WHITE));
    board.removePiece(board.findKingPosition(BLACK));

    for (let i = 0; i <= 63; i++) {
      board.addPiece(WHITE, BISHOP, i);
    }

    expect(board.getAllPieceBitBoard(WHITE)).toBe(0xFFFFFFFFFFFFFFFF, "Pieces added correctly");

    for (let i = 0; i <= 63; i++) {
      board.removePiece(i);
    }

    expect(board.getAllPieceBitBoard(WHITE)).toBe(0, "Pieces removed correctly");

  });
});

describe('Evaluate position', () => {
  it('Calculates even score for starting position', () => {
    const items: Array<i32> = [
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P, -P,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, 0
    ];

    expect(new Board(items).getScore()).toBe(0);
  });

  it('Calculates lower score for doubled pawns', () => {
    const board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  P,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  P,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const doubledPawnBoard = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  P,  0,  0,  0,  0,
      0,  0,  0,  P,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);
    expect(doubledPawnBoard.getScore()).toBeLessThan(board.getScore());
  });

  it('Calculates lower score for doubled pawns on all squares', () => {
    const board = new Board([
     -K,  0,  0,  0,  0,  0,  0,  0,
      K,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0, 0, 0
    ]);

    for (let color = BLACK; color <= WHITE; color++) {
      if (color != BLACK || color != WHITE) {
        continue;
      }
      for (let row = 0; row < 8; row++) {
        if (board.getItem(row) == K) {
          // Move kings to the next row to make sure that they are not overwritten during the test
          moveKing(board, board.getItem(row), (row + 1) & 7);
          moveKing(board, board.getItem(row + 8), (row + 8 + 1) & 7);
        }
        for (let col1 = 0; col1 < 8; col1++) {
          const firstPawnPos = row + col1 * 8;
          board.addPiece(color, P, firstPawnPos);
          for (let col2 = 0; col2 < 8; col2++) {
            if (col1 == col2) {
              continue;
            }

            const secondPawnPos = row + col2 * 8;
            board.addPiece(color, P, secondPawnPos);

            const appliedPenaly = board.getMaterialScore() - board.getScore();
            expect(appliedPenaly).toBe(DOUBLED_PAWN_PENALTY);

            board.removePiece(secondPawnPos);
          }
          board.removePiece(firstPawnPos);
        }
      }
    }
  });

  it('Calculates higher score for pieces outside starting position', () => {
    const board: Array<i32> = [
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P, -P,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0, +P,  0,  0,  0,
      0,  0, +N,  0,  0,  0,  0,  0,
      +P, +P, +P, +P,  0, +P, +P, +P,
      +R,  0, +B, +Q, +K, +B, +N, +R,
      0, 0, 0
    ];

    expect(new Board(board).getScore()).toBeGreaterThan(0);
  });

  it('Calculates higher score for material advantage', () => {
    const board: Array<i32> = [
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P,  0, -P, -P, -P,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, 0
    ];

    expect(new Board(board).getScore()).toBeGreaterThan(0);
  });

  it('Calculates higher score for castled king position', () => {
    const board: Array<i32> = [
      -R, -N, -B,  0, -K,  0,  0, -R,
      0,  0,  0,  0, -P, -P, -P, -P,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0, +P, +P, +P, +P,
      R,  N,  B,  0,  0, +R, +K,  0,
      0, 0, NO_CASTLING_RIGHTS
    ];

    expect(new Board(board).getScore()).toBeGreaterThan(0);
  });
});

describe('King threats', () => {
  it('Evaluates severe king threat with huge penalty', () => {
    const board: Board = fromFEN("2kr4/ppp5/2n5/5p2/1Pb1P3/P4P2/1BP1RKrq/R7 w - - 0 28")

    board.getMaterialScore()
    expect(board.getMaterialScore() - board.getScore()).toBeGreaterThan(70, "King threat penalty is not high enough")
  });
});

describe('Find smallest attacker', () => {
  it('Finds white pawn left attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -B,  0,  0,  0,  0,
      0,  0,  P,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(34);
  });

  it('Finds white pawn right attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -B,  0,  0,  0,  0,
      0,  0,  0,  0,  P,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(36);
  });

  it('Finds black pawn left attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0, -P,  0,  0,  0,
      0,  0,  0,  B,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, BLACK, 27)).toBe(20);
  });

  it('Finds black pawn right attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0, -P,  0,  0,  0,  0,  0,
      0,  0,  0,  B,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, BLACK, 27)).toBe(18);
  });

  it('Finds knight attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -B,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  N,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(37);
  });

  it('Finds bishop attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -B,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  B,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(45);
  });

  it('Finds rook attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      R,  0,  0, -B,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(24);
  });

  it('Finds queen attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -B,  0,  Q,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(29);
  });

  it('Finds king attack', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0, -B,  0,  0,  0,  0,
      0,  0,  0, +K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(35);
  });

  it('Finds smallest attacker among multiple attackers', () => {
    const board: Board = new Board([
      0,  0,  0, -K,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0, +R, -B,  0,  0,  0,  0,
      0,  0,  0, +K,  B,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0, 0, 0
    ]);

    const occupied = board.getOccupancyBitboard();
    expect(board.findSmallestAttacker(occupied, WHITE, 27)).toBe(36);
  });
});


describe("Static exchange evaluation", () => {
  it("Evaluates re-capture with a negative score", () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0,  0,  0,  0, -K,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  K,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0, -B,  0,  0,
      0,  0,  0,  0, -P,  0,  0,  0,
      0,  0,  0,  0,  Q,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    expect(board.seeScore(BLACK, 52, 44, Q, P)).toBeLessThan(0);

  });

  it("Takes discovered attacks for white into account", () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0,  0,  0,  0, -K,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  K,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0, -Q,  0,  0,
      0,  0,  0,  0, -P,  0,  0,  0,
      0,  0,  0,  0,  R,  0,  0,  0,
      0,  0,  0,  0,  R,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    expect(board.seeScore(BLACK, 52, 44, R, P)).toBeGreaterThan(0);

  });

  it("Takes discovered attacks for black into account", () => {
    // prettier-ignore
    const board: Board = new Board([
      0,  0,  0,  0,  0,  0, -K,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  K,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  Q,  0,  0,
      0,  0,  0,  0,  P,  0,  0,  0,
      0,  0,  0,  0, -R,  0,  0,  0,
      0,  0,  0,  0, -R,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    expect(board.seeScore(WHITE, 52, 44, R, P)).toBeGreaterThan(0);

  });
});

describe("Pawn move promotion check", () => {
  it("Recognizes white pawns close to promotion", () => {
    // prettier-ignore
    const board: Board = new Board([
      0, 0, 0, 0, 0, 0, -K, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, K, 0, 0, P, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    expect(board.isPawnMoveCloseToPromotion(P, 20, 2)).toBeTruthy("2 moves away and not blocked")
    expect(board.isPawnMoveCloseToPromotion(P, 20, 1)).toBeFalsy("2 moves away, but only 1 move left")

    board.addPiece(BLACK, P, 12);
    expect(board.isPawnMoveCloseToPromotion(P, 20, 2)).toBeFalsy("2 moves away, but blocked")
  });

  it("Recognizes black pawns close to promotion", () => {
    // prettier-ignore
    const board: Board = new Board([
      0, 0, 0, 0, 0, 0, -K, 0,
      0, 0, 0, 0,  0, 0, 0, 0,
      0, K, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0,-P, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    expect(board.isPawnMoveCloseToPromotion(-P, 43, 2)).toBeTruthy("2 moves away and not blocked")
    expect(board.isPawnMoveCloseToPromotion(-P, 43, 1)).toBeFalsy("2 moves away, but only 1 move left")

    board.addPiece(WHITE, P, 51);
    expect(board.isPawnMoveCloseToPromotion(-P, 43, 2)).toBeFalsy("2 moves away, but blocked")
  });

});

describe("Draw detection by insufficient material", () => {

  it("works for only 2 remaining kings", () => {
    const board: Board = boardWithPieces([K, -K]);
    expect(board.isInsufficientMaterialDraw()).toBeTruthy();
  });

  it("works for 3 remaining pieces", () => {
    expect(boardWithPieces([B, K, -K]).isInsufficientMaterialDraw()).toBeTruthy();
    expect(boardWithPieces([-B, K, -K]).isInsufficientMaterialDraw()).toBeTruthy();
    expect(boardWithPieces([N, K, -K]).isInsufficientMaterialDraw()).toBeTruthy();
    expect(boardWithPieces([-N, K, -K]).isInsufficientMaterialDraw()).toBeTruthy();

    expect(boardWithPieces([R, K, -K]).isInsufficientMaterialDraw()).toBeFalsy();
    expect(boardWithPieces([Q, K, -K]).isInsufficientMaterialDraw()).toBeFalsy();
    expect(boardWithPieces([P, K, -K]).isInsufficientMaterialDraw()).toBeFalsy();

    expect(boardWithPieces([-R, K, -K]).isInsufficientMaterialDraw()).toBeFalsy();
    expect(boardWithPieces([-Q, K, -K]).isInsufficientMaterialDraw()).toBeFalsy();
    expect(boardWithPieces([-P, K, -K]).isInsufficientMaterialDraw()).toBeFalsy();
  });

});

// Test helper

function hasOrthogonalSlidingFigure(board: Board, color: i32, pos: i32): bool {
  const pieces = board.getBitBoard(color * ROOK) | board.getBitBoard(color * QUEEN);
  return (pieces & (1 << pos)) != 0;
}

function hasDiagonalSlidingFigure(board: Board, color: i32, pos: i32): bool {
  const pieces = board.getBitBoard(color * BISHOP) | board.getBitBoard(color * QUEEN);
  return (pieces & (1 << pos)) != 0;
}

function hasKnight(board: Board, color: i32, pos: i32): bool {
  return (board.getBitBoard(KNIGHT * color) & (1 << pos)) != 0;
}

function boardWithPieces(pieces: Array<i32>): Board {
  // prettier-ignore
  const items = [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, NO_CASTLING_RIGHTS
  ];

  for (let i = 0; i < pieces.length; i++) {
    items[i] = pieces[i];
  }

  return new Board(items);
}
