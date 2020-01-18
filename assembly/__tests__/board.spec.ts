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

import { BLACK, BLACK_KING_MOVED, Board, mirrored, PAWN_POSITION_SCORES, WHITE, WHITE_KING_MOVED } from '../board';
import { BISHOP, BISHOP_DIRECTIONS, K, KNIGHT, KNIGHT_DIRECTIONS, N, P, R, ROOK } from '../pieces';

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
      expect(board.hasOrthogonalSlidingFigure(WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
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
      expect(board.hasDiagonalSlidingFigure(WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
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
      expect(board.hasKnight(WHITE, i)).toBeTruthy("Missing figure @" + i.toString() + "")
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
      0, 0, 0
    ]);

    expect(board.getCastlingStateBits()).toBe(0);

    board.setWhiteKingMoved();
    board.setWhiteLeftRookMoved();
    board.setWhiteRightRookMoved();
    board.setBlackKingMoved();
    board.setBlackLeftRookMoved();
    board.setBlackRightRookMoved();

    expect(board.getCastlingStateBits()).toBe(0b111111);
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
      0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
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
      0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
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
      0, 0, WHITE_KING_MOVED | BLACK_KING_MOVED
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
      0, 0, 0
    ]);

    board.recalculateHash();
    const initialHash = board.getHash();

    board.setWhiteLeftRookMoved();
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
    board.setBlackLeftRookMoved();

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

  it('is updated correctly using addPieceWithoutIncrementalUpdate/removePieceWithoutIncrementalUpdate', () => {
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
      board.addPieceWithoutIncrementalUpdate(WHITE, BISHOP, i);
    }

    expect(board.getAllPieceBitBoard(WHITE)).toBe(0xFFFFFFFFFFFFFFFF, "Pieces added correctly");

    for (let i = 0; i <= 63; i++) {
      board.removePieceWithoutIncrementalUpdate(i);
    }

    expect(board.getAllPieceBitBoard(WHITE)).toBe(0, "Pieces removed correctly");

  });
});

