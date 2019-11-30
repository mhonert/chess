import {
  decodeEndIndex,
  decodePiece,
  decodeStartIndex,
  encodeMove,
  generateMoves,
  KNIGHT_DIRECTIONS
} from '../move-generation';
import {
  __,
  BLACK,
  EN_PASSANT_BITMASKS,
  isEnPassentPossible,
  setBlackKingMoved,
  setEnPassentPossible,
  WHITE
} from '../board';
import { B, BISHOP, K, KNIGHT, N, P, PAWN, Q, QUEEN, R, ROOK } from '../pieces';


function emptyBoard(): Array<i32> {
  return [                                  // Board indices (used in test cases)
    __, __, __, __, __, __, __, __, __, __, //  0 -  9
    __, __, __, __, __, __, __, __, __, __, // 10 - 19
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 20 - 29
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 30 - 39
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 40 - 49
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 50 - 59
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 60 - 69
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 70 - 79
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 80 - 89
    __,  0,  0,  0,  0,  0,  0,  0,  0, __, // 90 - 99
    __, __, __, __, __, __, __, __, __, __, // ...
    __, __, __, __, __, __, __, __, __, __, 0
  ];
}


describe("White pawn moves", () => {

  it("Generates moves for base position", () => {
    const board: Array<i32> = boardWithOnePiece(PAWN, 85);

    const moves = filterMoves(85, generateMoves(board, WHITE));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 85, 75));
    expect(moves).toContain(encodeMove(PAWN, 85, 65));
  });

  it("Is blocked by own pieces", () => {
    const board: Array<i32> = boardWithOnePiece(PAWN, 85);
    addPiece(board, PAWN, 75);

    const moves = filterMoves(85, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Generates moves to attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(PAWN, 75);
    addPiece(board, -BISHOP, 64);
    addPiece(board, -KNIGHT, 66);

    const moves = filterMoves(75, generateMoves(board, WHITE));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(PAWN, 75, 64));
    expect(moves).toContain(encodeMove(PAWN, 75, 65));
    expect(moves).toContain(encodeMove(PAWN, 75, 66));
  });

  it("Generates promotion moves", () => {
    const board: Array<i32> = boardWithOnePiece(PAWN, 35);

    const moves = filterMoves(35, generateMoves(board, WHITE));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KNIGHT, 35, 25));
    expect(moves).toContain(encodeMove(BISHOP, 35, 25));
    expect(moves).toContain(encodeMove(ROOK, 35, 25));
    expect(moves).toContain(encodeMove(QUEEN, 35, 25));
  });

  it("Generates en passant move", () => {
    const board: Array<i32> = boardWithOnePiece(PAWN, 55);
    addPiece(board, -PAWN, 54);
    setEnPassentPossible(board, 44);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 55, 45)); // standard move
    expect(moves).toContain(encodeMove(PAWN, 55, 44)); // en passant
  });

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});


describe("Black pawn moves", () => {
  it("Generates moves for base position", () => {
    const board: Array<i32> = boardWithOnePiece(-PAWN, 35);

    const moves = filterMoves(35, generateMoves(board, BLACK));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 35, 45));
    expect(moves).toContain(encodeMove(PAWN, 35, 55));
  });

  it("Is blocked by own pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-PAWN, 35);
    addPiece(board, -BISHOP, 45);

    const moves = filterMoves(35, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Generates moves to attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-PAWN, 45);
    addPiece(board, BISHOP, 54);
    addPiece(board, KNIGHT, 56);

    const moves = filterMoves(45, generateMoves(board, BLACK));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(PAWN, 45, 54));
    expect(moves).toContain(encodeMove(PAWN, 45, 55));
    expect(moves).toContain(encodeMove(PAWN, 45, 56));
  });

  it("Generates promotion moves", () => {
    const board: Array<i32> = boardWithOnePiece(-PAWN, 85);

    const moves = filterMoves(85, generateMoves(board, BLACK));

    expect(moves).toHaveLength(4);
    expect(moves).toContain(encodeMove(KNIGHT, 85, 95));
    expect(moves).toContain(encodeMove(BISHOP, 85, 95));
    expect(moves).toContain(encodeMove(ROOK, 85, 95));
    expect(moves).toContain(encodeMove(QUEEN, 85, 95));
  });

  it("Generates en passant move", () => {
    const board: Array<i32> = boardWithOnePiece(-PAWN, 65);
    addPiece(board, PAWN, 64);
    setEnPassentPossible(board, 74);

    const moves = filterMoves(65, generateMoves(board, BLACK));

    expect(moves).toHaveLength(2);
    expect(moves).toContain(encodeMove(PAWN, 65, 75)); // standard move
    expect(moves).toContain(encodeMove(PAWN, 65, 74)); // en passant
  });

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });
});


describe("White knight moves", () => {

  it("Generates moves for base position", () => {
    const board: Array<i32> = boardWithOnePiece(KNIGHT, 92);

    const moves = filterMoves(92, generateMoves(board, WHITE));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 92, 71));
    expect(moves).toContain(encodeMove(KNIGHT, 92, 73));
    expect(moves).toContain(encodeMove(KNIGHT, 92, 84));
  });

  it("Generates moves for all directions", () => {
    const board: Array<i32> = boardWithOnePiece(KNIGHT, 53);

    const moves = filterMoves(53, generateMoves(board, WHITE));

    expect(moves).toHaveLength(8);
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const offset = KNIGHT_DIRECTIONS[i]
      expect(moves).toContain(encodeMove(KNIGHT, 53, 53 + offset));
    }
  });

  it("Can attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(KNIGHT, 92);
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
    const board: Array<i32> = boardWithOnePiece(KNIGHT, 92);
    addPiece(board,  PAWN, 71);
    addPiece(board,  PAWN, 73);
    addPiece(board,  BISHOP, 84);

    const moves = filterMoves(92, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});

describe("Black knight moves", () => {

  it("Generates moves for base position", () => {
    const board: Array<i32> = boardWithOnePiece(-KNIGHT, 22);

    const moves = filterMoves(22, generateMoves(board, BLACK));

    expect(moves).toHaveLength(3);
    expect(moves).toContain(encodeMove(KNIGHT, 22, 41));
    expect(moves).toContain(encodeMove(KNIGHT, 22, 43));
    expect(moves).toContain(encodeMove(KNIGHT, 22, 34));
  });

  it("Generates moves for all directions", () => {
    const board: Array<i32> = boardWithOnePiece(-KNIGHT, 53);

    const moves = filterMoves(53, generateMoves(board, BLACK));

    expect(moves).toHaveLength(8);
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const offset = KNIGHT_DIRECTIONS[i]
      expect(moves).toContain(encodeMove(KNIGHT, 53, 53 + offset));
    }
  });

  it("Can attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-KNIGHT, 22);
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
    const board: Array<i32> = boardWithOnePiece(-KNIGHT, 22);
    addPiece(board,  -PAWN, 41);
    addPiece(board,  -PAWN, 43);
    addPiece(board,  -BISHOP, 34);

    const moves = filterMoves(22, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });
});


describe("White bishop moves", () => {

  it("Generates moves", () => {
    const board: Array<i32> = boardWithOnePiece(BISHOP, 55);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(13);
    expect(moves).toContain(encodeMove(BISHOP, 55, 22));
    expect(moves).toContain(encodeMove(BISHOP, 55, 28));
    expect(moves).toContain(encodeMove(BISHOP, 55, 88));
    expect(moves).toContain(encodeMove(BISHOP, 55, 91));
  });

  it("Is blocked by own pieces", () => {
    const board: Array<i32> = boardWithOnePiece(BISHOP, 55);
    addPiece(board, PAWN, 44);
    addPiece(board, PAWN, 46);
    addPiece(board, PAWN, 64);
    addPiece(board, PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(BISHOP, 55);
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

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});

describe("Black bishop moves", () => {

  it("Generates moves", () => {
    const board: Array<i32> = boardWithOnePiece(-BISHOP, 55);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(13);
    expect(moves).toContain(encodeMove(BISHOP, 55, 22));
    expect(moves).toContain(encodeMove(BISHOP, 55, 28));
    expect(moves).toContain(encodeMove(BISHOP, 55, 88));
    expect(moves).toContain(encodeMove(BISHOP, 55, 91));
  });

  it("Is blocked by own pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-BISHOP, 55);
    addPiece(board, -PAWN, 44);
    addPiece(board, -PAWN, 46);
    addPiece(board, -PAWN, 64);
    addPiece(board, -PAWN, 66);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-BISHOP, 55);
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

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});


describe("White rook moves", () => {

  it("Generates moves", () => {
    const board: Array<i32> = boardWithOnePiece(ROOK, 55);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(14);
    expect(moves).toContain(encodeMove(ROOK, 55, 25));
    expect(moves).toContain(encodeMove(ROOK, 55, 51));
    expect(moves).toContain(encodeMove(ROOK, 55, 58));
    expect(moves).toContain(encodeMove(ROOK, 55, 95));
  });

  it("Is blocked by own pieces", () => {
    const board: Array<i32> = boardWithOnePiece(ROOK, 55);
    addPiece(board, PAWN, 54);
    addPiece(board, PAWN, 56);
    addPiece(board, PAWN, 45);
    addPiece(board, PAWN, 65);

    const moves = filterMoves(55, generateMoves(board, WHITE));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(ROOK, 55);
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

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});

describe("Black rook moves", () => {

  it("Generates moves", () => {
    const board: Array<i32> = boardWithOnePiece(-ROOK, 55);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(14);
    expect(moves).toContain(encodeMove(ROOK, 55, 25));
    expect(moves).toContain(encodeMove(ROOK, 55, 51));
    expect(moves).toContain(encodeMove(ROOK, 55, 58));
    expect(moves).toContain(encodeMove(ROOK, 55, 95));
  });

  it("Is blocked by own pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-ROOK, 55);
    addPiece(board, -PAWN, 54);
    addPiece(board, -PAWN, 56);
    addPiece(board, -PAWN, 45);
    addPiece(board, -PAWN, 65);

    const moves = filterMoves(55, generateMoves(board, BLACK));

    expect(moves).toHaveLength(0);
  });

  it("Can attack opponent pieces", () => {
    const board: Array<i32> = boardWithOnePiece(-ROOK, 55);
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

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});


describe("White queen moves", () => {

  it("Generates moves", () => {
    const board: Array<i32> = boardWithOnePiece(QUEEN, 55);

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
    const board: Array<i32> = boardWithOnePiece(QUEEN, 55);
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
    const board: Array<i32> = boardWithOnePiece(QUEEN, 55);
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

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});


describe("Black queen moves", () => {

  it("Generates moves", () => {
    const board: Array<i32> = boardWithOnePiece(-QUEEN, 55);

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
    const board: Array<i32> = boardWithOnePiece(-QUEEN, 55);
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
    const board: Array<i32> = boardWithOnePiece(-QUEEN, 55);
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

  it("Exclude moves that put own king in check", () => {
    todo("King in check?")
  });

});

// Test helper functions

function addPiece(board: Array<i32>, piece: i32, location: i32): Array<i32> {
  board[location] = piece;
  return board;
}

function boardWithOnePiece(piece: i32, location: i32): Array<i32> {
  const board = emptyBoard();
  addPiece(board, piece, location);
  return board;
}

function logMoves(moves: Array<i32>): void {
  log<string>("# of moves:");
  log<i32>(moves.length);

  for (let i = 0; i < moves.length; i++) {
    log<string>("Move:");
    log<i32>(decodePiece(moves[i]));
    log<i32>(decodeStartIndex(moves[i]));
    log<i32>(decodeEndIndex(moves[i]));
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

