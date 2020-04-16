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
  decodeStartIndex,
  encodeMove,
  generateFilteredMoves,
  isCheckMate,
} from '../move-generation';
import {
  ALL_CASTLING_RIGHTS,
  BLACK,
  Board,
  EMPTY,
  NO_CASTLING_RIGHTS,
  WHITE,
} from '../board';
import { B, BISHOP, K, KING, KNIGHT, KNIGHT_DIRECTIONS, N, P, PAWN, Q, QUEEN, R, ROOK } from '../pieces';
import { moveKing, sign } from '../util';


function emptyBoardWithKings(): Array<i32> {
  return [                         // Board indices (used in test cases)
    0,  0,  0,  0,  0,  0, -K,  0, // 0 - 7
    0,  0,  0,  0,  0,  0,  0,  0, // 8 - 15
    0,  0,  0,  0,  0,  0,  0,  0, // 16 - 23
    0,  0,  0,  0,  0,  0,  0,  0, // 24 - 31
    0,  0,  0,  0,  0,  0,  0,  0, // 32 - 39
    0,  0,  0,  0,  0,  0,  0,  0, // 40 - 47
    0,  0,  0,  0,  0,  0,  0,  0, // 48 - 55
    0,  0,  0,  0,  0,  0,  K,  0, // 56 - 63
    // ...
    0, 0, NO_CASTLING_RIGHTS       // counter and states
  ];
}


describe("White pawn moves", () => {

  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(PAWN, 52);

    const moves = generateMovesForStartIndex(board, WHITE, 52);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 52, 44));
    expect(moves).toContain(encodeMove(PAWN, 52, 36));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(PAWN, 52);
    addPiece(board, PAWN, 44);

    const moves = generateMovesForStartIndex(board, WHITE, 52);

    expect(moves).toHaveLength(0);
  });

  it("Generates moves to attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(PAWN, 44);
    addPiece(board, -PAWN, 37);
    addPiece(board, -PAWN, 35);

    const moves = generateMovesForStartIndex(board, WHITE, 44);

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(PAWN, 44, 35));
    expect(moves).toContain(encodeMove(PAWN, 44, 36));
    expect(moves).toContain(encodeMove(PAWN, 44, 37));
  });

  it("Generates promotion moves", () => {
    const board: Board = boardWithOnePiece(PAWN, 12);

    const moves = generateMovesForStartIndex(board, WHITE, 12);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KNIGHT, 12, 4));
    expect(moves).toContain(encodeMove(BISHOP, 12, 4));
    expect(moves).toContain(encodeMove(ROOK, 12, 4));
    expect(moves).toContain(encodeMove(QUEEN, 12, 4));
  });

  it("Generates en passant move", () => {
    const board: Board = boardWithOnePiece(PAWN, 28);
    addPiece(board, -PAWN, 27);
    board.setEnPassantPossible(11);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 28, 20), "standard move");
    expect(moves).toContain(encodeMove(PAWN, 28, 19), "en passant");
  });

  it("Generates en passant move on left side", () => {
    const board: Board = boardWithOnePiece(PAWN, 25);
    addPiece(board, -PAWN, 24);
    board.setEnPassantPossible(8);

    const moves = generateMovesForStartIndex(board, WHITE, 25);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 25, 17), "standard move");
    expect(moves).toContain(encodeMove(PAWN, 25, 16), "en passant");
  });

  it("Generates en passant move on right side", () => {
    const board: Board = boardWithOnePiece(PAWN, 30);
    addPiece(board, -PAWN, 31);
    board.setEnPassantPossible(15);

    const moves = generateMovesForStartIndex(board, WHITE, 30);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 30, 22), "standard move");
    expect(moves).toContain(encodeMove(PAWN, 30, 23), "en passant");
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(PAWN, 52);
    moveKing(board, KING, 53);
    addPiece(board, -ROOK, 51);

    const moves = generateMovesForStartIndex(board, WHITE, 52);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});


describe("Black pawn moves", () => {
  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(-PAWN, 12);

    const moves = generateMovesForStartIndex(board, BLACK, 12);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 12, 20));
    expect(moves).toContain(encodeMove(PAWN, 12, 28));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-PAWN, 12);
    addPiece(board, -BISHOP, 20);

    const moves = generateMovesForStartIndex(board, BLACK, 12);

    expect(moves).toHaveLength(0);
  });

  it("Generates moves to attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-PAWN, 20);
    addPiece(board, PAWN, 27);
    addPiece(board, PAWN, 29);

    const moves = generateMovesForStartIndex(board, BLACK, 20);

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(PAWN, 20, 27));
    expect(moves).toContain(encodeMove(PAWN, 20, 28));
    expect(moves).toContain(encodeMove(PAWN, 20, 29));
  });

  it("Generates promotion moves", () => {
    const board: Board = boardWithOnePiece(-PAWN, 52);

    const moves = generateMovesForStartIndex(board, BLACK, 52);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KNIGHT, 52, 60));
    expect(moves).toContain(encodeMove(BISHOP, 52, 60));
    expect(moves).toContain(encodeMove(ROOK, 52, 60));
    expect(moves).toContain(encodeMove(QUEEN, 52, 60));
  });

  it("Generates en passant move", () => {
    const board: Board = boardWithOnePiece(-PAWN, 36);
    addPiece(board, PAWN, 35);
    board.setEnPassantPossible(51);

    const moves = generateMovesForStartIndex(board, BLACK, 36);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 36, 44), "standard move");
    expect(moves).toContain(encodeMove(PAWN, 36, 43), "en passant");
  });

  it("Generates en passant move on left side", () => {
    const board: Board = boardWithOnePiece(-PAWN, 33);
    addPiece(board, PAWN, 32);
    board.setEnPassantPossible(48);

    const moves = generateMovesForStartIndex(board, BLACK, 33);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 33, 41), "standard move");
    expect(moves).toContain(encodeMove(PAWN, 33, 40), "en passant");
  });

  it("Generates en passant move on right side", () => {
    const board: Board = boardWithOnePiece(-PAWN, 38);
    addPiece(board, PAWN, 39);
    board.setEnPassantPossible(55);

    const moves = generateMovesForStartIndex(board, BLACK, 38);

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 38, 46), "standard move");
    expect(moves).toContain(encodeMove(PAWN, 38, 47), "en passant");
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(PAWN, 4);
    moveKing(board, -KING, 5);
    addPiece(board, ROOK, 3);

    const moves = generateMovesForStartIndex(board, BLACK, 52);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });
});


describe("White knight moves", () => {

  it("Generates knight moves for base position", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 57);

    const moves = generateMovesForStartIndex(board, WHITE, 57);

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 57, 40));
    expect(moves).toContain(encodeMove(KNIGHT, 57, 42));
    expect(moves).toContain(encodeMove(KNIGHT, 57, 51));
  });

  it("Generates moves for all directions", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 26);

    const moves = generateMovesForStartIndex(board, WHITE, 26);

    expect(moves).toHaveLength(8);
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const offset = KNIGHT_DIRECTIONS[i]
      expect(moves).toContain(encodeMove(KNIGHT, 26, 26 + offset));
    }
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 57);
    addPiece(board, -KNIGHT, 40);
    addPiece(board, -QUEEN, 42);
    addPiece(board, -BISHOP, 51);

    const moves = generateMovesForStartIndex(board, WHITE, 57);

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 57, 40));
    expect(moves).toContain(encodeMove(KNIGHT, 57, 42));
    expect(moves).toContain(encodeMove(KNIGHT, 57, 51));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 57);
    addPiece(board,  PAWN, 40);
    addPiece(board,  PAWN, 42);
    addPiece(board,  BISHOP, 51);

    const moves = generateMovesForStartIndex(board, WHITE, 57);

    expect(moves).toHaveLength(0);
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 52);
    moveKing(board, KING, 53);
    addPiece(board, -ROOK, 51);

    const moves = generateMovesForStartIndex(board, WHITE, 52);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});

describe("Black knight moves", () => {

  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 1);

    const moves = generateMovesForStartIndex(board, BLACK, 1);

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 1, 16));
    expect(moves).toContain(encodeMove(KNIGHT, 1, 18));
    expect(moves).toContain(encodeMove(KNIGHT, 1, 11));
  });

  it("Generates moves for all directions", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 26);

    const moves = generateMovesForStartIndex(board, BLACK, 26);

    expect(moves).toHaveLength(8);
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const offset = KNIGHT_DIRECTIONS[i]
      expect(moves).toContain(encodeMove(KNIGHT, 26, 26 + offset));
    }
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 1);
    addPiece(board, KNIGHT, 16);
    addPiece(board, QUEEN, 18);
    addPiece(board, BISHOP, 11);

    const moves = generateMovesForStartIndex(board, BLACK, 1);

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 1, 16));
    expect(moves).toContain(encodeMove(KNIGHT, 1, 18));
    expect(moves).toContain(encodeMove(KNIGHT, 1, 11));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 1);
    addPiece(board,  -PAWN, 16);
    addPiece(board,  -PAWN, 18);
    addPiece(board,  -BISHOP, 11);

    const moves = generateMovesForStartIndex(board, BLACK, 1);

    expect(moves).toHaveLength(0);
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 1);
    moveKing(board, -KING, 2);
    addPiece(board, ROOK, 0);

    const moves = generateMovesForStartIndex(board, BLACK, 1);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });
});


describe("White bishop moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(BISHOP, 28);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(13);
    expect(moves).toContain(encodeMove(BISHOP, 28, 1));
    expect(moves).toContain(encodeMove(BISHOP, 28, 7));
    expect(moves).toContain(encodeMove(BISHOP, 28, 55));
    expect(moves).toContain(encodeMove(BISHOP, 28, 56));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(BISHOP, 28);
    addPiece(board, PAWN, 19);
    addPiece(board, PAWN, 21);
    addPiece(board, PAWN, 35);
    addPiece(board, PAWN, 37);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(BISHOP, 28);
    addPiece(board, -PAWN, 19);
    addPiece(board, -PAWN, 21);
    addPiece(board, -PAWN, 35);
    addPiece(board, -PAWN, 37);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(BISHOP, 28, 19));
    expect(moves).toContain(encodeMove(BISHOP, 28, 21));
    expect(moves).toContain(encodeMove(BISHOP, 28, 35));
    expect(moves).toContain(encodeMove(BISHOP, 28, 37));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(BISHOP, 52);
    moveKing(board, KING, 53);
    addPiece(board, -ROOK, 51);

    const moves = generateMovesForStartIndex(board, WHITE, 52);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});

describe("Black bishop moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 28);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(13);
    expect(moves).toContain(encodeMove(BISHOP, 28, 1));
    expect(moves).toContain(encodeMove(BISHOP, 28, 7));
    expect(moves).toContain(encodeMove(BISHOP, 28, 55));
    expect(moves).toContain(encodeMove(BISHOP, 28, 56));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 28);
    addPiece(board, -PAWN, 19);
    addPiece(board, -PAWN, 21);
    addPiece(board, -PAWN, 35);
    addPiece(board, -PAWN, 37);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 28);
    addPiece(board, PAWN, 19);
    addPiece(board, PAWN, 21);
    addPiece(board, PAWN, 35);
    addPiece(board, PAWN, 37);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(BISHOP, 28, 19));
    expect(moves).toContain(encodeMove(BISHOP, 28, 21));
    expect(moves).toContain(encodeMove(BISHOP, 28, 35));
    expect(moves).toContain(encodeMove(BISHOP, 28, 37));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 1);
    moveKing(board, -KING, 2);
    addPiece(board, ROOK, 0);

    const moves = generateMovesForStartIndex(board, BLACK, 1);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});


describe("White rook moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(ROOK, 28);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(14);
    expect(moves).toContain(encodeMove(ROOK, 28, 4));
    expect(moves).toContain(encodeMove(ROOK, 28, 24));
    expect(moves).toContain(encodeMove(ROOK, 28, 31));
    expect(moves).toContain(encodeMove(ROOK, 28, 60));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(ROOK, 28);
    addPiece(board, PAWN, 27);
    addPiece(board, PAWN, 29);
    addPiece(board, PAWN, 20);
    addPiece(board, PAWN, 36);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(ROOK, 28);
    addPiece(board, -PAWN, 27);
    addPiece(board, -PAWN, 29);
    addPiece(board, -PAWN, 20);
    addPiece(board, -PAWN, 36);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(ROOK, 28, 27));
    expect(moves).toContain(encodeMove(ROOK, 28, 29));
    expect(moves).toContain(encodeMove(ROOK, 28, 20));
    expect(moves).toContain(encodeMove(ROOK, 28, 36));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(ROOK, 46);
    moveKing(board, KING, 53);
    addPiece(board, -BISHOP, 39);

    const moves = generateMovesForStartIndex(board, WHITE, 46);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});

describe("Black rook moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(-ROOK, 28);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(14);
    expect(moves).toContain(encodeMove(ROOK, 28, 4));
    expect(moves).toContain(encodeMove(ROOK, 28, 24));
    expect(moves).toContain(encodeMove(ROOK, 28, 31));
    expect(moves).toContain(encodeMove(ROOK, 28, 60));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-ROOK, 28);
    addPiece(board, -PAWN, 27);
    addPiece(board, -PAWN, 29);
    addPiece(board, -PAWN, 20);
    addPiece(board, -PAWN, 36);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-ROOK, 28);
    addPiece(board, PAWN, 27);
    addPiece(board, PAWN, 29);
    addPiece(board, PAWN, 20);
    addPiece(board, PAWN, 36);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(ROOK, 28, 27));
    expect(moves).toContain(encodeMove(ROOK, 28, 29));
    expect(moves).toContain(encodeMove(ROOK, 28, 20));
    expect(moves).toContain(encodeMove(ROOK, 28, 36));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-ROOK, 14);
    moveKing(board, -KING, 5);
    addPiece(board, BISHOP, 23);


    const moves = generateMovesForStartIndex(board, BLACK, 14);
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});


describe("White queen moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(QUEEN, 28);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(27);
    expect(moves).toContain(encodeMove(QUEEN, 28, 4));
    expect(moves).toContain(encodeMove(QUEEN, 28, 24));
    expect(moves).toContain(encodeMove(QUEEN, 28, 31));
    expect(moves).toContain(encodeMove(QUEEN, 28, 60));
    expect(moves).toContain(encodeMove(QUEEN, 28, 1));
    expect(moves).toContain(encodeMove(QUEEN, 28, 7));
    expect(moves).toContain(encodeMove(QUEEN, 28, 55));
    expect(moves).toContain(encodeMove(QUEEN, 28, 56));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(QUEEN, 28);
    addPiece(board, PAWN, 27);
    addPiece(board, PAWN, 29);
    addPiece(board, PAWN, 20);
    addPiece(board, PAWN, 36);
    addPiece(board, PAWN, 19);
    addPiece(board, PAWN, 21);
    addPiece(board, PAWN, 35);
    addPiece(board, PAWN, 37);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(QUEEN, 28);
    addPiece(board, -PAWN, 27);
    addPiece(board, -PAWN, 29);
    addPiece(board, -PAWN, 20);
    addPiece(board, -PAWN, 36);
    addPiece(board, -PAWN, 19);
    addPiece(board, -PAWN, 21);
    addPiece(board, -PAWN, 35);
    addPiece(board, -PAWN, 37);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(QUEEN, 28, 27));
    expect(moves).toContain(encodeMove(QUEEN, 28, 29));
    expect(moves).toContain(encodeMove(QUEEN, 28, 20));
    expect(moves).toContain(encodeMove(QUEEN, 28, 36));
    expect(moves).toContain(encodeMove(QUEEN, 28, 19));
    expect(moves).toContain(encodeMove(QUEEN, 28, 21));
    expect(moves).toContain(encodeMove(QUEEN, 28, 35));
    expect(moves).toContain(encodeMove(QUEEN, 28, 37));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(QUEEN, 52);
    moveKing(board, KING, 53);
    addPiece(board, -ROOK, 51);

    const moves = generateMovesForStartIndex(board, WHITE, 52);
    expect(moves).toHaveLength(1, "Only capturing the rook would not put the king into check");
  });

});


describe("Black queen moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 28);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(27);
    expect(moves).toContain(encodeMove(QUEEN, 28, 4));
    expect(moves).toContain(encodeMove(QUEEN, 28, 24));
    expect(moves).toContain(encodeMove(QUEEN, 28, 31));
    expect(moves).toContain(encodeMove(QUEEN, 28, 60));
    expect(moves).toContain(encodeMove(QUEEN, 28, 1));
    expect(moves).toContain(encodeMove(QUEEN, 28, 7));
    expect(moves).toContain(encodeMove(QUEEN, 28, 55));
    expect(moves).toContain(encodeMove(QUEEN, 28, 56));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 28);
    addPiece(board, -PAWN, 27);
    addPiece(board, -PAWN, 29);
    addPiece(board, -PAWN, 20);
    addPiece(board, -PAWN, 36);
    addPiece(board, -PAWN, 19);
    addPiece(board, -PAWN, 21);
    addPiece(board, -PAWN, 35);
    addPiece(board, -PAWN, 37);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 28);
    addPiece(board, PAWN, 27);
    addPiece(board, PAWN, 29);
    addPiece(board, PAWN, 20);
    addPiece(board, PAWN, 36);
    addPiece(board, PAWN, 19);
    addPiece(board, PAWN, 21);
    addPiece(board, PAWN, 35);
    addPiece(board, PAWN, 37);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(QUEEN, 28, 27));
    expect(moves).toContain(encodeMove(QUEEN, 28, 29));
    expect(moves).toContain(encodeMove(QUEEN, 28, 20));
    expect(moves).toContain(encodeMove(QUEEN, 28, 36));
    expect(moves).toContain(encodeMove(QUEEN, 28, 19));
    expect(moves).toContain(encodeMove(QUEEN, 28, 21));
    expect(moves).toContain(encodeMove(QUEEN, 28, 35));
    expect(moves).toContain(encodeMove(QUEEN, 28, 37));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 4);
    moveKing(board, -KING, 5);
    addPiece(board, ROOK, 3);

    const moves = generateMovesForStartIndex(board, BLACK, 4);
    expect(moves).toHaveLength(1, "Only capturing the rook would not put the king into check");
  });

});


describe("White king moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithKing(KING, 28);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(KING, 28, 27));
    expect(moves).toContain(encodeMove(KING, 28, 29));
    expect(moves).toContain(encodeMove(KING, 28, 20));
    expect(moves).toContain(encodeMove(KING, 28, 36));
    expect(moves).toContain(encodeMove(KING, 28, 19));
    expect(moves).toContain(encodeMove(KING, 28, 21));
    expect(moves).toContain(encodeMove(KING, 28, 35));
    expect(moves).toContain(encodeMove(KING, 28, 37));
  });

  it("Excludes moves that would put own king in check", () => {
    const board: Board = boardWithKing(KING, 24);
    addPiece(board, -PAWN, 10);

    const moves = generateMovesForStartIndex(board, WHITE, 24);

    expect(moves).toHaveLength(4);
    expect(moves).not.toContain(encodeMove(KING, 24, 17));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithKing(KING, 28);
    addPiece(board, PAWN, 27);
    addPiece(board, PAWN, 29);
    addPiece(board, PAWN, 20);
    addPiece(board, PAWN, 36);
    addPiece(board, PAWN, 19);
    addPiece(board, PAWN, 21);
    addPiece(board, PAWN, 35);
    addPiece(board, PAWN, 37);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces diagonally", () => {
    const board: Board = boardWithKing(KING, 28);
    addPiece(board, -KNIGHT, 19);
    addPiece(board, -KNIGHT, 21);
    addPiece(board, -KNIGHT, 35);
    addPiece(board, -KNIGHT, 37);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 28, 19));
    expect(moves).toContain(encodeMove(KING, 28, 21));
    expect(moves).toContain(encodeMove(KING, 28, 35));
    expect(moves).toContain(encodeMove(KING, 28, 37));
  });

  it("Can attack opponent pieces orthogonally", () => {
    const board: Board = boardWithKing(KING, 28);
    addPiece(board, -KNIGHT, 27);
    addPiece(board, -KNIGHT, 29);
    addPiece(board, -KNIGHT, 20);
    addPiece(board, -KNIGHT, 36);

    const moves = generateMovesForStartIndex(board, WHITE, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 28, 27));
    expect(moves).toContain(encodeMove(KING, 28, 29));
    expect(moves).toContain(encodeMove(KING, 28, 20));
    expect(moves).toContain(encodeMove(KING, 28, 36));
  });

  it("Generates castling moves", () => {
    const board: Board = boardWithKing(KING, 60);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, ROOK, 56);
    addPiece(board, ROOK, 63);

    const moves = generateMovesForStartIndex(board, WHITE, 60);

    expect(moves).toHaveLength(7);
    expect(moves).toContain(encodeMove(KING, 60, 58));
    expect(moves).toContain(encodeMove(KING, 60, 62));
  });

  it("Does not generate castling move if king already moved", () => {
    const board: Board = boardWithKing(KING, 60);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    board.setWhiteKingMoved();
    addPiece(board, ROOK, 56);
    addPiece(board, ROOK, 63);

    const moves = generateMovesForStartIndex(board, WHITE, 60);

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Does not generate castling move if rook already moved", () => {
    const board: Board = boardWithKing(KING, 60);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, ROOK, 56);
    addPiece(board, ROOK, 63);
    board.setWhiteQueenSideRookMoved();
    board.setWhiteKingSideRookMoved();

    const moves = generateMovesForStartIndex(board, WHITE, 60);

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithKing(KING, 63);
    addPiece(board, -QUEEN, 49);
    addPiece(board, -QUEEN, 6);

    const moves = generateMovesForStartIndex(board, WHITE, 63);
    expect(moves).toHaveLength(0, "All moves would put the king into check");
  });

  it("Does not generate castling move if king would pass an attacked field", () => {
    const board: Board = boardWithKing(KING, 60);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, ROOK, 56);
    addPiece(board, ROOK, 63);

    addPiece(board, -ROOK, 10);
    addPiece(board, -ROOK, 14);

    const moves = generateMovesForStartIndex(board, WHITE, 60);

    expect(moves).toHaveLength(5, "Only standard moves");
  });

  it("Still generates the queen-side castling move if only the rook passes an attacked field", () => {
    const board: Board = boardWithKing(KING, 60);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, ROOK, 56);
    addPiece(board, ROOK, 63);

    addPiece(board, -ROOK, 9);
    addPiece(board, -ROOK, 13);

    const moves = generateMovesForStartIndex(board, WHITE, 60);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 60, 58));
  });
});


describe("Black king moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithKing(-KING, 28);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(KING, 28, 27));
    expect(moves).toContain(encodeMove(KING, 28, 29));
    expect(moves).toContain(encodeMove(KING, 28, 20));
    expect(moves).toContain(encodeMove(KING, 28, 36));
    expect(moves).toContain(encodeMove(KING, 28, 19));
    expect(moves).toContain(encodeMove(KING, 28, 21));
    expect(moves).toContain(encodeMove(KING, 28, 35));
    expect(moves).toContain(encodeMove(KING, 28, 37));
  });

  it("Excludes moves that would put own king in check", () => {
    const board: Board = boardWithKing(-KING, 39);
    addPiece(board, PAWN, 53);

    const moves = generateMovesForStartIndex(board, BLACK, 39);

    expect(moves).toHaveLength(4);
    expect(moves).not.toContain(encodeMove(KING, 39, 46));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithKing(-KING, 28);
    addPiece(board, -PAWN, 27);
    addPiece(board, -PAWN, 29);
    addPiece(board, -PAWN, 20);
    addPiece(board, -PAWN, 36);
    addPiece(board, -PAWN, 19);
    addPiece(board, -PAWN, 21);
    addPiece(board, -PAWN, 35);
    addPiece(board, -PAWN, 37);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces diagonally", () => {
    const board: Board = boardWithKing(-KING, 28);
    addPiece(board, KNIGHT, 19);
    addPiece(board, KNIGHT, 21);
    addPiece(board, KNIGHT, 35);
    addPiece(board, KNIGHT, 37);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 28, 19));
    expect(moves).toContain(encodeMove(KING, 28, 21));
    expect(moves).toContain(encodeMove(KING, 28, 35));
    expect(moves).toContain(encodeMove(KING, 28, 37));
  });

  it("Can attack opponent pieces orthogonally", () => {
    const board: Board = boardWithKing(-KING, 28);
    addPiece(board, KNIGHT, 27);
    addPiece(board, KNIGHT, 29);
    addPiece(board, KNIGHT, 20);
    addPiece(board, KNIGHT, 36);

    const moves = generateMovesForStartIndex(board, BLACK, 28);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 28, 27));
    expect(moves).toContain(encodeMove(KING, 28, 29));
    expect(moves).toContain(encodeMove(KING, 28, 20));
    expect(moves).toContain(encodeMove(KING, 28, 36));
  });

  it("Generates castling moves", () => {
    const board: Board = boardWithKing(-KING, 4);
    board.setStateBit(ALL_CASTLING_RIGHTS);
    addPiece(board, -ROOK, 0);
    addPiece(board, -ROOK, 7);

    const moves = generateMovesForStartIndex(board, BLACK, 4);

    expect(moves).toHaveLength(7);
    expect(moves).toContain(encodeMove(KING, 4, 2));
    expect(moves).toContain(encodeMove(KING, 4, 6));
  });

  it("Does not generate castling move if king already moved", () => {
    const board: Board = boardWithKing(-KING, 4);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    board.setBlackKingMoved();
    addPiece(board, -ROOK, 0);
    addPiece(board, -ROOK, 7);

    const moves = generateMovesForStartIndex(board, BLACK, 4);

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Does not generate castling move if rook already moved", () => {
    const board: Board = boardWithKing(-KING, 4);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, -ROOK, 56);
    addPiece(board, -ROOK, 63);
    board.setBlackQueenSideRookMoved();
    board.setBlackKingSideRookMoved();

    const moves = generateMovesForStartIndex(board, BLACK, 4);

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithKing(-KING, 0);
    addPiece(board, QUEEN, 15);
    addPiece(board, QUEEN, 57);

    const moves = generateMovesForStartIndex(board, BLACK, 0);
    expect(moves).toHaveLength(0, "All moves would put the king into check");
  });

  it("Does not generate castling move if king would pass an attacked field", () => {
    const board: Board = boardWithKing(-KING, 4);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, -ROOK, 0);
    addPiece(board, -ROOK, 7);

    addPiece(board, ROOK, 58);
    addPiece(board, ROOK, 62);

    const moves = generateMovesForStartIndex(board, BLACK, 4);

    expect(moves).toHaveLength(5, "Only standard moves");
  });

  it("Still generates the queen-side castling move if only the rook passes an attacked field", () => {
    const board: Board = boardWithKing(-KING, 4);
    board.setStateBit(ALL_CASTLING_RIGHTS)
    addPiece(board, -ROOK, 0);
    addPiece(board, -ROOK, 7);

    addPiece(board, ROOK, 57);
    addPiece(board, ROOK, 61);

    const moves = generateMovesForStartIndex(board, BLACK, 4);

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 4, 2));
  });

});


describe('Detect check mate', () => {
  it('does not have mate detection bug #1 anymore', () => {

    const board: Array<i32> = [
      0, -R,  0,  0,  0,  0,  0,  0,
      -P, +P,  0,  0,  0,  0, -B, -R,
      0,  0,  0, +Q,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0, -K,  0,
      0,  0,  0, +N,  0,  0,  0,  P,
      0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P,  0,  0, +B, +P, +P,  0,
      +R,  0,  0,  0, +K,  0, +N, +R,
      0, 0, 0
    ];

    expect(isCheckMate(new Board(board), BLACK)).toBeFalsy();
  });
});

describe('Check detection', () => {
  it('Detects diagonal attacks from different directions', () => {

    const board: Array<i32> = [
      0,  0,  0,  0, -K,  0,  0,  0,
      0,  0,  0, -P,  0, -P,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  B,  0,  0,  0,  0,  0,  Q,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  K,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ];

    expect(generateFilteredMoves(new Board(board), BLACK)).toHaveLength(3, "All pawn moves would leave king in check");
  });

  it('Detects orthogonal attacks from different directions', () => {

    const board: Array<i32> = [
      0,  0,  0,  0,  0,  0,  0,  0,
      R,  0,  0, -N, -K,  0,  0,  0,
      0,  0,  0,  0, -N,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  Q,  0,  0,  0,
      0,  0,  0,  0,  K,  0,  0,  0,
      0, 0, NO_CASTLING_RIGHTS
    ];

    expect(generateFilteredMoves(new Board(board), BLACK)).toHaveLength(6, "All knight moves would leave king in check");
  });
});


describe("Half move clock", () => {

  it("Increases half move count for each half move", () => {
    const board = new Board([
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

    board.performEncodedMove(encodeMove(P, 51, 35));
    board.performEncodedMove(encodeMove(-P, 11, 27));

    expect(board.getHalfMoveCount()).toBe(2);
  });

  it("Decreases half move count if move is undone", () => {
    const board = new Board([
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

    board.performEncodedMove(encodeMove(P, 51, 35));
    board.performEncodedMove(encodeMove(-P, 11, 27));
    board.undoMove(-P, 11, 27, EMPTY);

    expect(board.getHalfMoveCount()).toBe(1);
  });

  it("Increase half move clock if no pawn is moved and no piece is captured", () => {
    const board = new Board([
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

    board.performEncodedMove(encodeMove(N, 57, 42));

    expect(board.getHalfMoveClock()).toBe(1);
  });

  it("Reset half move clock if a pawn is moved", () => {
    const board = new Board([
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

    board.performEncodedMove(encodeMove(N, 57, 42));
    board.performEncodedMove(encodeMove(-P, 11, 27));

    expect(board.getHalfMoveClock()).toBe(0);
  });

  it("Reset half move clock if a piece is captured", () => {
    const board = new Board([
      -R, -N, -B, -Q, -K,  0, -N, -R,
      -P, -P, -P, -P, -P, -P, -P, -P,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,
      0,  0, -B,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, 0
    ]);

    board.performEncodedMove(encodeMove(N, 57, 42));

    expect(board.getHalfMoveClock()).toBe(0);
  });

});

// Test helper functions

function addPiece(board: Board, piece: i32, location: i32): Board {
  board.addPiece(sign(piece), abs(piece), location);
  return board;
}

function boardWithOnePiece(piece: i32, location: i32): Board {
  const board = new Board(emptyBoardWithKings());
  addPiece(board, piece, location);
  return board;
}

function boardWithKing(piece: i32, location: i32): Board {
  const board = new Board(emptyBoardWithKings());
  moveKing(board, piece, location);

  return board;
}

// Generates moves and filters for valid moves for the given start index
function generateMovesForStartIndex(board: Board, playerColor: i32, filterForStartIndex: i32): Array<i32> {
  const moves = generateFilteredMoves(board, playerColor);
  const filteredMoves: Array<i32> = new Array<i32>();

  for (let i = 0; i < moves.length; i++) {
    const startIndex = decodeStartIndex(moves[i]);
    if (startIndex == filterForStartIndex) {
      filteredMoves.push(moves[i]);
    }
  }

  return filteredMoves;
}

