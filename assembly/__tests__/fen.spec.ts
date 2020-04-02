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
  BLACK_KING_SIDE_CASTLING,
  BLACK_QUEEN_SIDE_CASTLING,
  Board, NO_CASTLING_RIGHTS, WHITE_KING_SIDE_CASTLING, WHITE_QUEEN_SIDE_CASTLING
} from '../board';
import { B, K, N, P, Q, R } from '../pieces';
import { fromFEN, toFEN } from '../fen';
import { encodeMove } from '../move-generation';

describe("FEN exporter", () => {

  it("writes FEN for starting position correctly", () => {
    const board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P, -P,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    expect(toFEN(board)).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  });

  it("writes FEN for test position correctly", () => {
    const board = new Board([
      -R,  0,  0,  0, -K,  0,  0, -R,
      -P,  0, -P, -P, -Q, -P, -B,  0,
      -B, -N,  0,  0, -P, -N, -P,  0,
       0,  0,  0, +P, +N,  0,  0,  0,
       0, -P,  0,  0, +P,  0,  0,  0,
       0,  0, +N,  0,  0, +Q,  0, -P,
      +P, +P, +P, +B, +B, +P, +P, +P,
      +R,  0,  0,  0, +K,  0,  0, +R,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    expect(toFEN(board)).toBe("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
  });

  it("writes FEN for active player color correctly", () => {
    const board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P, -P,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, ALL_CASTLING_RIGHTS
    ]);
    board.performEncodedMove(encodeMove(P, 51, 35));

    expect(toFEN(board)).toBe("rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1");
  });

  it("writes FEN for castling availability correctly if no castlings are possible", () => {
    const board = new Board([
      -R,  0,  0,  0,  0, -K,  0, -R,
      -P,  0, -P, -P, -Q, -P, -B,  0,
      -B, -N,  0,  0, -P, -N, -P,  0,
       0,  0,  0, +P, +N,  0,  0,  0,
       0, -P,  0,  0, +P,  0,  0,  0,
       0,  0, +N,  0,  0, +Q,  0, -P,
      +P, +P, +P, +B, +B, +P, +P, +P,
      +R,  0,  0,  0,  0, +K,  0, +R,
      0, 0, NO_CASTLING_RIGHTS
    ]);

    expect(toFEN(board)).toBe("r4k1r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R4K1R w - - 0 1");
  });

  it("writes FEN for castling availability correctly if only white castlings are possible", () => {
    const board = new Board([
      -R,  0,  0,  0,  0, -K,  0, -R,
      -P,  0, -P, -P, -Q, -P, -B,  0,
      -B, -N,  0,  0, -P, -N, -P,  0,
       0,  0,  0, +P, +N,  0,  0,  0,
       0, -P,  0,  0, +P,  0,  0,  0,
       0,  0, +N,  0,  0, +Q,  0, -P,
      +P, +P, +P, +B, +B, +P, +P, +P,
      +R,  0,  0,  0, +K,  0,  0, +R,
      0, 0, WHITE_QUEEN_SIDE_CASTLING | WHITE_KING_SIDE_CASTLING
    ]);

    expect(toFEN(board)).toBe("r4k1r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQ - 0 1");
  });

  it("writes FEN for castling availability correctly if only black castlings are possible", () => {
    const board = new Board([
      -R,  0,  0,  0, -K,  0,  0, -R,
      -P,  0, -P, -P, -Q, -P, -B,  0,
      -B, -N,  0,  0, -P, -N, -P,  0,
       0,  0,  0, +P, +N,  0,  0,  0,
       0, -P,  0,  0, +P,  0,  0,  0,
       0,  0, +N,  0,  0, +Q,  0, -P,
      +P, +P, +P, +B, +B, +P, +P, +P,
      +R,  0,  0,  0,  0, +K,  0, +R,
      0, 0, BLACK_QUEEN_SIDE_CASTLING | BLACK_KING_SIDE_CASTLING
    ]);

    expect(toFEN(board)).toBe("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R4K1R w kq - 0 1");
  });

  it("writes FEN for castling availability correctly if only king side castlings are possible", () => {
    const board = new Board([
       0, -R,  0,  0, -K,  0,  0, -R,
      -P,  0, -P, -P, -Q, -P, -B,  0,
      -B, -N,  0,  0, -P, -N, -P,  0,
       0,  0,  0, +P, +N,  0,  0,  0,
       0, -P,  0,  0, +P,  0,  0,  0,
       0,  0, +N,  0,  0, +Q,  0, -P,
      +P, +P, +P, +B, +B, +P, +P, +P,
       0, +R,  0,  0, +K,  0,  0, +R,
      0, 0, WHITE_KING_SIDE_CASTLING | BLACK_KING_SIDE_CASTLING
    ]);

    expect(toFEN(board)).toBe("1r2k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/1R2K2R w Kk - 0 1");
  });

  it("writes FEN for castling availability correctly if only queen side castlings are possible", () => {
    const board = new Board([
      -R,  0,  0,  0, -K,  0, -R,  0,
      -P,  0, -P, -P, -Q, -P, -B,  0,
      -B, -N,  0,  0, -P, -N, -P,  0,
       0,  0,  0, +P, +N,  0,  0,  0,
       0, -P,  0,  0, +P,  0,  0,  0,
       0,  0, +N,  0,  0, +Q,  0, -P,
      +P, +P, +P, +B, +B, +P, +P, +P,
      +R,  0,  0,  0, +K,  0, +R,  0,
      0, 0, WHITE_QUEEN_SIDE_CASTLING | BLACK_QUEEN_SIDE_CASTLING
    ]);

    expect(toFEN(board)).toBe("r3k1r1/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K1R1 w Qq - 0 1");
  });

  it("writes FEN for black en passant correctly", () => {
    const board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P,  0, -P, -P, -P, -P, -P, -P,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
      +P, -P,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0, +P, +P, +P, +P, +P, +P, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    board.setEnPassantPossible(48);

    expect(toFEN(board)).toBe("rnbqkbnr/p1pppppp/8/8/Pp6/8/1PPPPPPP/RNBQKBNR w KQkq a3 0 1");
  });

  it("writes FEN for white en passant correctly", () => {
    const board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0, +P, -P,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P,  0, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      0, 0, ALL_CASTLING_RIGHTS
    ]);

    board.setEnPassantPossible(15);

    expect(toFEN(board)).toBe("rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR w KQkq h6 0 1");
  });

  it("writes FEN for half move clock correctly", () => {
    const halfMoveCount = 6;
    const halfMoveClock = 2;

    const board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0, +P, -P,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P,  0, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      halfMoveClock, halfMoveCount, ALL_CASTLING_RIGHTS
    ]);

    expect(toFEN(board)).toBe("rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR w KQkq - 2 4");
  });

  it("writes FEN for full move count correctly", () => {
    const halfMoveCount = 7;
    const halfMoveClock = 2;

    const board = new Board([
      -R, -N, -B, -Q, -K, -B, -N, -R,
      -P, -P, -P, -P, -P, -P, -P,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0, +P, -P,
       0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,
      +P, +P, +P, +P, +P, +P,  0, +P,
      +R, +N, +B, +Q, +K, +B, +N, +R,
      halfMoveClock, halfMoveCount, ALL_CASTLING_RIGHTS
    ]);

    expect(toFEN(board)).toBe("rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR b KQkq - 2 4");
  });

});


describe("FEN importer", () => {
  it("reads FEN for starting position correctly", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  })

  it("reads FEN for test position correctly", () => {
    const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  })

  it("reads FEN for active player color correctly", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for castling availability correctly if no castlings are possible", () => {
    const fen = "r4k1r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R4K1R w - - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for castling availability correctly if only white castlings are possible", () => {
    const fen = "r4k1r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQ - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for castling availability correctly if only black castlings are possible", () => {
    const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R4K1R w kq - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for castling availability correctly if only king side castlings are possible", () => {
    const fen = "1r2k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/1R2K2R w Kk - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for castling availability correctly if only queen side castlings are possible", () => {
    const fen = "r3k1r1/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K1R1 w Qq - 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for black en passant correctly", () => {
    const fen = "rnbqkbnr/p1pppppp/8/8/Pp6/8/1PPPPPPP/RNBQKBNR w KQkq a3 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for white en passant correctly", () => {
    const fen = "rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR w KQkq h6 0 1";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for half move clock correctly", () => {
    const fen = "rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR w KQkq - 2 4";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

  it("reads FEN for full move count correctly", () => {
    const fen = "rnbqkbnr/ppppppp1/8/6Pp/8/8/PPPPPP1P/RNBQKBNR b KQkq - 2 4";
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });

})