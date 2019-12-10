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
  decodeEndIndex,
  decodePiece,
  decodeStartIndex,
  encodeMove,
  generateMoves, isCheckMate,
  KNIGHT_DIRECTIONS
} from '../move-generation';
import {
  __,
  BLACK, Board, EMPTY,
  WHITE
} from '../board';
import { B, BISHOP, K, KING, KNIGHT, N, P, PAWN, Q, QUEEN, R, ROOK } from '../pieces';
import { evaluatePosition } from '../engine';


function emptyBoardWithKings(): Array<i32> {
  return [                                  // Board indices (used in test cases)
    __, __, __, __, __, __, __, __, __, __, //  0 -  9
    __, __, __, __, __, __, __, __, __, __, // 10 - 19
    __,  0,  0,  0,  0,  0,  0, -K,  0, __, // 20 - 29
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 30 - 39
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 40 - 49
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 50 - 59
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 60 - 69
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 70 - 79
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 80 - 89
    __,  0,  0,  0,  0,  0,  0,  K,  0, __, // 90 - 99
    __, __, __, __, __, __, __, __, __, __, // ...
    __, __, __, __, __, __, __, __, __, __, 0
  ];
}


describe("White pawn moves", () => {

  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(PAWN, 85);

    const moves = filterMoves(85, generateMoves(board, WHITE));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 85, 75));
    expect(moves).toContain(encodeMove(PAWN, 85, 65));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(PAWN, 85);
    addPiece(board, PAWN, 75);

    const moves = filterMoves(85, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Generates moves to attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(PAWN, 75);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(75, generateMoves(board, WHITE));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(PAWN, 75, 64));
    expect(moves).toContain(encodeMove(PAWN, 75, 65));
    expect(moves).toContain(encodeMove(PAWN, 75, 66));
  });

  it("Generates promotion moves", () => {
    const board: Board = boardWithOnePiece(PAWN, 35);

    const moves = filterMoves(35, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KNIGHT, 35, 25));
    expect(moves).toContain(encodeMove(BISHOP, 35, 25));
    expect(moves).toContain(encodeMove(ROOK, 35, 25));
    expect(moves).toContain(encodeMove(QUEEN, 35, 25));
  });

  it("Generates en passant move", () => {
    const board: Board = boardWithOnePiece(PAWN, 55);
    addPiece(board, -PAWN, 54);
    board.setEnPassantPossible(34);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 55, 45)); // standard move
    expect(moves).toContain(encodeMove(PAWN, 55, 44)); // en passant
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(PAWN, 85);
    moveKing(board, KING, 86);
    addPiece(board, -ROOK, 84);

    const moves = filterMoves(85, generateMoves(board, WHITE));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});


describe("Black pawn moves", () => {
  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(-PAWN, 35);

    const moves = filterMoves(35, generateMoves(board, BLACK));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 35, 45));
    expect(moves).toContain(encodeMove(PAWN, 35, 55));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-PAWN, 35);
    addPiece(board, -BISHOP, 45);

    const moves = filterMoves(35, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Generates moves to attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-PAWN, 45);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);

    const moves = filterMoves(45, generateMoves(board, BLACK));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(PAWN, 45, 54));
    expect(moves).toContain(encodeMove(PAWN, 45, 55));
    expect(moves).toContain(encodeMove(PAWN, 45, 56));
  });

  it("Generates promotion moves", () => {
    const board: Board = boardWithOnePiece(-PAWN, 85);

    const moves = filterMoves(85, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KNIGHT, 85, 95));
    expect(moves).toContain(encodeMove(BISHOP, 85, 95));
    expect(moves).toContain(encodeMove(ROOK, 85, 95));
    expect(moves).toContain(encodeMove(QUEEN, 85, 95));
  });

  it("Generates en passant move", () => {
    const board: Board = boardWithOnePiece(-PAWN, 65);
    addPiece(board, PAWN, 64);
    board.setEnPassantPossible(84);

    const moves = filterMoves(65, generateMoves(board, BLACK));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 65, 75)); // standard move
    expect(moves).toContain(encodeMove(PAWN, 65, 74)); // en passant
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(PAWN, 25);
    moveKing(board, -KING, 26);
    addPiece(board, ROOK, 24);

    const moves = filterMoves(85, generateMoves(board, BLACK));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });
});


describe("White knight moves", () => {

  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 92);

    const moves = filterMoves(92, generateMoves(board, WHITE));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 92, 71));
    expect(moves).toContain(encodeMove(KNIGHT, 92, 73));
    expect(moves).toContain(encodeMove(KNIGHT, 92, 84));
  });

  it("Generates moves for all directions", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 53);

    const moves = filterMoves(53, generateMoves(board, WHITE));

    expect(moves).toHaveLength(8);
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const offset = KNIGHT_DIRECTIONS[i]
      expect(moves).toContain(encodeMove(KNIGHT, 53, 53 + offset));
    }
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 92);
    addPiece(board, -KNIGHT, 71);
    addPiece(board, -QUEEN, 73);
    addPiece(board, -BISHOP, 84);

    const moves = filterMoves(92, generateMoves(board, WHITE));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 92, 71));
    expect(moves).toContain(encodeMove(KNIGHT, 92, 73));
    expect(moves).toContain(encodeMove(KNIGHT, 92, 84));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 92);
    addPiece(board,  PAWN, 71);
    addPiece(board,  PAWN, 73);
    addPiece(board,  BISHOP, 84);

    const moves = filterMoves(92, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(KNIGHT, 85);
    moveKing(board, KING, 86);
    addPiece(board, -ROOK, 84);

    const moves = filterMoves(85, generateMoves(board, WHITE));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});

describe("Black knight moves", () => {

  it("Generates moves for base position", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 22);

    const moves = filterMoves(22, generateMoves(board, BLACK));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 22, 41));
    expect(moves).toContain(encodeMove(KNIGHT, 22, 43));
    expect(moves).toContain(encodeMove(KNIGHT, 22, 34));
  });

  it("Generates moves for all directions", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 53);

    const moves = filterMoves(53, generateMoves(board, BLACK));

    expect(moves).toHaveLength(8);
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const offset = KNIGHT_DIRECTIONS[i]
      expect(moves).toContain(encodeMove(KNIGHT, 53, 53 + offset));
    }
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 22);
    addPiece(board, KNIGHT, 41);
    addPiece(board, QUEEN, 43);
    addPiece(board, BISHOP, 34);

    const moves = filterMoves(22, generateMoves(board, BLACK));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 22, 41));
    expect(moves).toContain(encodeMove(KNIGHT, 22, 43));
    expect(moves).toContain(encodeMove(KNIGHT, 22, 34));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 22);
    addPiece(board,  -PAWN, 41);
    addPiece(board,  -PAWN, 43);
    addPiece(board,  -BISHOP, 34);

    const moves = filterMoves(22, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-KNIGHT, 22);
    moveKing(board, -KING, 23);
    addPiece(board, ROOK, 21);

    const moves = filterMoves(22, generateMoves(board, BLACK));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });
});


describe("White bishop moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(BISHOP, 55);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(13);
    expect(moves).toContain(encodeMove(BISHOP, 55, 22));
    expect(moves).toContain(encodeMove(BISHOP, 55, 28));
    expect(moves).toContain(encodeMove(BISHOP, 55, 88));
    expect(moves).toContain(encodeMove(BISHOP, 55, 91));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(BISHOP, 55);
    addPiece(board, PAWN, 44);
    addPiece(board, PAWN, 46);
    addPiece(board, PAWN, 64);
    addPiece(board, PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(BISHOP, 55);
    addPiece(board, -PAWN, 44);
    addPiece(board, -PAWN, 46);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(BISHOP, 55, 44));
    expect(moves).toContain(encodeMove(BISHOP, 55, 46));
    expect(moves).toContain(encodeMove(BISHOP, 55, 64));
    expect(moves).toContain(encodeMove(BISHOP, 55, 66));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(BISHOP, 85);
    moveKing(board, KING, 86);
    addPiece(board, -ROOK, 84);

    const moves = filterMoves(85, generateMoves(board, WHITE));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});

describe("Black bishop moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 55);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(13);
    expect(moves).toContain(encodeMove(BISHOP, 55, 22));
    expect(moves).toContain(encodeMove(BISHOP, 55, 28));
    expect(moves).toContain(encodeMove(BISHOP, 55, 88));
    expect(moves).toContain(encodeMove(BISHOP, 55, 91));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 55);
    addPiece(board, -PAWN, 44);
    addPiece(board, -PAWN, 46);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 55);
    addPiece(board, PAWN, 44);
    addPiece(board, PAWN, 46);
    addPiece(board, PAWN, 64);
    addPiece(board, PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(BISHOP, 55, 44));
    expect(moves).toContain(encodeMove(BISHOP, 55, 46));
    expect(moves).toContain(encodeMove(BISHOP, 55, 64));
    expect(moves).toContain(encodeMove(BISHOP, 55, 66));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-BISHOP, 22);
    moveKing(board, -KING, 23);
    addPiece(board, ROOK, 21);

    const moves = filterMoves(22, generateMoves(board, BLACK));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});


describe("White rook moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(ROOK, 55);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(14);
    expect(moves).toContain(encodeMove(ROOK, 55, 25));
    expect(moves).toContain(encodeMove(ROOK, 55, 51));
    expect(moves).toContain(encodeMove(ROOK, 55, 58));
    expect(moves).toContain(encodeMove(ROOK, 55, 95));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(ROOK, 55);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);
    addPiece(board, PAWN, 45);
    addPiece(board, PAWN, 65);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(ROOK, 55);
    addPiece(board, -PAWN, 54);
    addPiece(board, -PAWN, 56);
    addPiece(board, -PAWN, 45);
    addPiece(board, -PAWN, 65);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(ROOK, 55, 54));
    expect(moves).toContain(encodeMove(ROOK, 55, 56));
    expect(moves).toContain(encodeMove(ROOK, 55, 45));
    expect(moves).toContain(encodeMove(ROOK, 55, 65));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(ROOK, 77);
    moveKing(board, KING, 86);
    addPiece(board, -BISHOP, 68);

    const moves = filterMoves(77, generateMoves(board, WHITE));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});

describe("Black rook moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(-ROOK, 55);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(14);
    expect(moves).toContain(encodeMove(ROOK, 55, 25));
    expect(moves).toContain(encodeMove(ROOK, 55, 51));
    expect(moves).toContain(encodeMove(ROOK, 55, 58));
    expect(moves).toContain(encodeMove(ROOK, 55, 95));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-ROOK, 55);
    addPiece(board, -PAWN, 54);
    addPiece(board, -PAWN, 56);
    addPiece(board, -PAWN, 45);
    addPiece(board, -PAWN, 65);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-ROOK, 55);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);
    addPiece(board, PAWN, 45);
    addPiece(board, PAWN, 65);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(ROOK, 55, 54));
    expect(moves).toContain(encodeMove(ROOK, 55, 56));
    expect(moves).toContain(encodeMove(ROOK, 55, 45));
    expect(moves).toContain(encodeMove(ROOK, 55, 65));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-ROOK, 37);
    moveKing(board, -KING, 26);
    addPiece(board, BISHOP, 48);


    const moves = filterMoves(37, generateMoves(board, BLACK));
    expect(moves).toHaveLength(0, "All moves would put own king into check");
  });

});


describe("White queen moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(QUEEN, 55);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(27);
    expect(moves).toContain(encodeMove(QUEEN, 55, 25));
    expect(moves).toContain(encodeMove(QUEEN, 55, 51));
    expect(moves).toContain(encodeMove(QUEEN, 55, 58));
    expect(moves).toContain(encodeMove(QUEEN, 55, 95));
    expect(moves).toContain(encodeMove(QUEEN, 55, 22));
    expect(moves).toContain(encodeMove(QUEEN, 55, 28));
    expect(moves).toContain(encodeMove(QUEEN, 55, 88));
    expect(moves).toContain(encodeMove(QUEEN, 55, 91));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(QUEEN, 55);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);
    addPiece(board, PAWN, 45);
    addPiece(board, PAWN, 65);
    addPiece(board, PAWN, 44);
    addPiece(board, PAWN, 46);
    addPiece(board, PAWN, 64);
    addPiece(board, PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(QUEEN, 55);
    addPiece(board, -PAWN, 54);
    addPiece(board, -PAWN, 56);
    addPiece(board, -PAWN, 45);
    addPiece(board, -PAWN, 65);
    addPiece(board, -PAWN, 44);
    addPiece(board, -PAWN, 46);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(QUEEN, 55, 54));
    expect(moves).toContain(encodeMove(QUEEN, 55, 56));
    expect(moves).toContain(encodeMove(QUEEN, 55, 45));
    expect(moves).toContain(encodeMove(QUEEN, 55, 65));
    expect(moves).toContain(encodeMove(QUEEN, 55, 44));
    expect(moves).toContain(encodeMove(QUEEN, 55, 46));
    expect(moves).toContain(encodeMove(QUEEN, 55, 64));
    expect(moves).toContain(encodeMove(QUEEN, 55, 66));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(QUEEN, 85);
    moveKing(board, KING, 86);
    addPiece(board, -ROOK, 84);

    const moves = filterMoves(85, generateMoves(board, WHITE));
    expect(moves).toHaveLength(1, "Only capturing the rook would not put the king into check");
  });

});


describe("Black queen moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 55);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(27);
    expect(moves).toContain(encodeMove(QUEEN, 55, 25));
    expect(moves).toContain(encodeMove(QUEEN, 55, 51));
    expect(moves).toContain(encodeMove(QUEEN, 55, 58));
    expect(moves).toContain(encodeMove(QUEEN, 55, 95));
    expect(moves).toContain(encodeMove(QUEEN, 55, 22));
    expect(moves).toContain(encodeMove(QUEEN, 55, 28));
    expect(moves).toContain(encodeMove(QUEEN, 55, 88));
    expect(moves).toContain(encodeMove(QUEEN, 55, 91));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 55);
    addPiece(board, -PAWN, 54);
    addPiece(board, -PAWN, 56);
    addPiece(board, -PAWN, 45);
    addPiece(board, -PAWN, 65);
    addPiece(board, -PAWN, 44);
    addPiece(board, -PAWN, 46);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 55);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);
    addPiece(board, PAWN, 45);
    addPiece(board, PAWN, 65);
    addPiece(board, PAWN, 44);
    addPiece(board, PAWN, 46);
    addPiece(board, PAWN, 64);
    addPiece(board, PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(QUEEN, 55, 54));
    expect(moves).toContain(encodeMove(QUEEN, 55, 56));
    expect(moves).toContain(encodeMove(QUEEN, 55, 45));
    expect(moves).toContain(encodeMove(QUEEN, 55, 65));
    expect(moves).toContain(encodeMove(QUEEN, 55, 44));
    expect(moves).toContain(encodeMove(QUEEN, 55, 46));
    expect(moves).toContain(encodeMove(QUEEN, 55, 64));
    expect(moves).toContain(encodeMove(QUEEN, 55, 66));
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithOnePiece(-QUEEN, 25);
    moveKing(board, -KING, 26);
    addPiece(board, ROOK, 24);

    const moves = filterMoves(25, generateMoves(board, BLACK));
    expect(moves).toHaveLength(1, "Only capturing the rook would not put the king into check");
  });

});


describe("White king moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithKing(KING, 55);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(KING, 55, 54));
    expect(moves).toContain(encodeMove(KING, 55, 56));
    expect(moves).toContain(encodeMove(KING, 55, 45));
    expect(moves).toContain(encodeMove(KING, 55, 65));
    expect(moves).toContain(encodeMove(KING, 55, 44));
    expect(moves).toContain(encodeMove(KING, 55, 46));
    expect(moves).toContain(encodeMove(KING, 55, 64));
    expect(moves).toContain(encodeMove(KING, 55, 66));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithKing(KING, 55);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);
    addPiece(board, PAWN, 45);
    addPiece(board, PAWN, 65);
    addPiece(board, PAWN, 44);
    addPiece(board, PAWN, 46);
    addPiece(board, PAWN, 64);
    addPiece(board, PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces diagonally", () => {
    const board: Board = boardWithKing(KING, 55);
    addPiece(board, -KNIGHT, 44);
    addPiece(board, -KNIGHT, 46);
    addPiece(board, -KNIGHT, 64);
    addPiece(board, -KNIGHT, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 55, 44));
    expect(moves).toContain(encodeMove(KING, 55, 46));
    expect(moves).toContain(encodeMove(KING, 55, 64));
    expect(moves).toContain(encodeMove(KING, 55, 66));
  });

  it("Can attack opponent pieces orthogonally", () => {
    const board: Board = boardWithKing(KING, 55);
    addPiece(board, -KNIGHT, 54);
    addPiece(board, -KNIGHT, 56);
    addPiece(board, -KNIGHT, 45);
    addPiece(board, -KNIGHT, 65);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 55, 54));
    expect(moves).toContain(encodeMove(KING, 55, 56));
    expect(moves).toContain(encodeMove(KING, 55, 45));
    expect(moves).toContain(encodeMove(KING, 55, 65));
  });

  it("Generates castling moves", () => {
    const board: Board = boardWithKing(KING, 95);
    addPiece(board, ROOK, 91);
    addPiece(board, ROOK, 98);

    const moves = filterMoves(95, generateMoves(board, WHITE));

    expect(moves).toHaveLength(7);
    expect(moves).toContain(encodeMove(KING, 95, 93));
    expect(moves).toContain(encodeMove(KING, 95, 97));
  });

  it("Does not generate castling move if king already moved", () => {
    const board: Board = boardWithKing(KING, 95);
    board.setWhiteKingMoved();
    addPiece(board, ROOK, 91);
    addPiece(board, ROOK, 98);

    const moves = filterMoves(95, generateMoves(board, WHITE));

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Does not generate castling move if rook already moved", () => {
    const board: Board = boardWithKing(KING, 95);
    addPiece(board, ROOK, 91);
    addPiece(board, ROOK, 98);
    board.setWhiteLeftRookMoved();
    board.setWhiteRightRookMoved();

    const moves = filterMoves(95, generateMoves(board, WHITE));

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithKing(KING, 98);
    addPiece(board, -QUEEN, 82);
    addPiece(board, -QUEEN, 27);

    const moves = filterMoves(98, generateMoves(board, WHITE));
    expect(moves).toHaveLength(0, "All moves would put the king into check");
  });

  it("Does not generate castling move if king would pass an attacked field", () => {
    const board: Board = boardWithKing(KING, 95);
    addPiece(board, ROOK, 91);
    addPiece(board, ROOK, 98);

    addPiece(board, -ROOK, 33);
    addPiece(board, -ROOK, 37);

    const moves = filterMoves(95, generateMoves(board, WHITE));

    expect(moves).toHaveLength(5, "Only standard moves");
  });

  it("Still generates the queen-side castling move if only the rook passes an attacked field", () => {
    const board: Board = boardWithKing(KING, 95);
    addPiece(board, ROOK, 91);
    addPiece(board, ROOK, 98);

    addPiece(board, -ROOK, 32);
    addPiece(board, -ROOK, 36);

    const moves = filterMoves(95, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 95, 93));
  });
});


describe("Black king moves", () => {

  it("Generates moves", () => {
    const board: Board = boardWithKing(-KING, 55);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(8);
    expect(moves).toContain(encodeMove(KING, 55, 54));
    expect(moves).toContain(encodeMove(KING, 55, 56));
    expect(moves).toContain(encodeMove(KING, 55, 45));
    expect(moves).toContain(encodeMove(KING, 55, 65));
    expect(moves).toContain(encodeMove(KING, 55, 44));
    expect(moves).toContain(encodeMove(KING, 55, 46));
    expect(moves).toContain(encodeMove(KING, 55, 64));
    expect(moves).toContain(encodeMove(KING, 55, 66));
  });

  it("Is blocked by own pieces", () => {
    const board: Board = boardWithKing(-KING, 55);
    addPiece(board, -PAWN, 54);
    addPiece(board, -PAWN, 56);
    addPiece(board, -PAWN, 45);
    addPiece(board, -PAWN, 65);
    addPiece(board, -PAWN, 44);
    addPiece(board, -PAWN, 46);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces diagonally", () => {
    const board: Board = boardWithKing(-KING, 55);
    addPiece(board, KNIGHT, 44);
    addPiece(board, KNIGHT, 46);
    addPiece(board, KNIGHT, 64);
    addPiece(board, KNIGHT, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 55, 44));
    expect(moves).toContain(encodeMove(KING, 55, 46));
    expect(moves).toContain(encodeMove(KING, 55, 64));
    expect(moves).toContain(encodeMove(KING, 55, 66));
  });

  it("Can attack opponent pieces orthogonally", () => {
    const board: Board = boardWithKing(-KING, 55);
    addPiece(board, KNIGHT, 54);
    addPiece(board, KNIGHT, 56);
    addPiece(board, KNIGHT, 45);
    addPiece(board, KNIGHT, 65);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 55, 54));
    expect(moves).toContain(encodeMove(KING, 55, 56));
    expect(moves).toContain(encodeMove(KING, 55, 45));
    expect(moves).toContain(encodeMove(KING, 55, 65));
  });

  it("Generates castling moves", () => {
    const board: Board = boardWithKing(-KING, 25);
    addPiece(board, -ROOK, 21);
    addPiece(board, -ROOK, 28);

    const moves = filterMoves(25, generateMoves(board, BLACK));

    expect(moves).toHaveLength(7);
    expect(moves).toContain(encodeMove(KING, 25, 23));
    expect(moves).toContain(encodeMove(KING, 25, 27));
  });

  it("Does not generate castling move if king already moved", () => {
    const board: Board = boardWithKing(-KING, 25);
    board.setBlackKingMoved();
    addPiece(board, -ROOK, 21);
    addPiece(board, -ROOK, 28);

    const moves = filterMoves(25, generateMoves(board, BLACK));

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Does not generate castling move if rook already moved", () => {
    const board: Board = boardWithKing(-KING, 25);
    addPiece(board, -ROOK, 91);
    addPiece(board, -ROOK, 98);
    board.setBlackLeftRookMoved();
    board.setBlackRightRookMoved();

    const moves = filterMoves(25, generateMoves(board, BLACK));

    expect(moves).toHaveLength(5, "Only standard moves without castling");
  });

  it("Exclude moves that would put own king in check", () => {
    const board: Board = boardWithKing(-KING, 21);
    addPiece(board, QUEEN, 38);
    addPiece(board, QUEEN, 92);

    const moves = filterMoves(21, generateMoves(board, BLACK));
    expect(moves).toHaveLength(0, "All moves would put the king into check");
  });

  it("Does not generate castling move if king would pass an attacked field", () => {
    const board: Board = boardWithKing(-KING, 25);
    addPiece(board, -ROOK, 21);
    addPiece(board, -ROOK, 28);

    addPiece(board, ROOK, 93);
    addPiece(board, ROOK, 97);

    const moves = filterMoves(25, generateMoves(board, BLACK));

    expect(moves).toHaveLength(5, "Only standard moves");
  });

  it("Still generates the queen-side castling move if only the rook passes an attacked field", () => {
    const board: Board = boardWithKing(-KING, 25);
    addPiece(board, -ROOK, 21);
    addPiece(board, -ROOK, 28);

    addPiece(board, ROOK, 92);
    addPiece(board, ROOK, 96);

    const moves = filterMoves(25, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KING, 25, 23));
  });

});


describe('Detect check mate', () => {
  it('does not have mate detection bug #1 anymore', () => {

    const board: Array<i32> = [
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __,
      __,  0, -R,  0,  0,  0,  0,  0,  0, __,
      __, -P, +P,  0,  0,  0,  0, -B, -R, __,
      __,  0,  0,  0, +Q,  0,  0,  0,  0, __,
      __,  0,  0,  0,  0,  0,  0, -K,  0, __,
      __,  0,  0,  0, +N,  0,  0,  0,  P, __,
      __,  0,  0,  0,  0,  0,  0,  0,  0, __,
      __, +P, +P,  0,  0, +B, +P, +P,  0, __,
      __, +R,  0,  0,  0, +K,  0, +N, +R, __,
      __, __, __, __, __, __, __, __, __, __,
      __, __, __, __, __, __, __, __, __, __, 0
    ];

    expect(isCheckMate(new Board(board), BLACK)).toBeFalsy();
  });
});


// Test helper functions

function addPiece(board: Board, piece: i32, location: i32): Board {
  board.items[location] = piece;
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

function moveKing(board: Board, piece: i32, location: i32): void {
  const color = piece < 0 ? BLACK : WHITE;

  board.items[board.findKingPosition(color)] = EMPTY;

  addPiece(board, piece, location);
  board.updateKingPosition(color, location);
}

function logMoves(moves: Array<i32>): void {
  trace("# of moves:", 1, moves.length);

  for (let i = 0; i < moves.length; i++) {
    trace("Move", 3, decodePiece(moves[i]), decodeStartIndex(moves[i]), decodeEndIndex(moves[i]));
  }
}

function filterMoves(filterForStartIndex: i32, moves: Array<i32>): Array<i32> {
  const filteredMoves: Array<i32> = new Array<i32>();

  for (let i = 0; i < moves.length; i++) {
    const startIndex = decodeStartIndex(moves[i]);
    if (startIndex == filterForStartIndex) {
      filteredMoves.push(moves[i]);
    }
  }

  return filteredMoves;
}

