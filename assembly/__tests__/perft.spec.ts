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

import { fromFEN } from '../fen';
import { perft } from '../perft';


// Compare number of computed nodes for various positions and depths with results listed here: https://www.chessprogramming.org/Perft_Results
describe('Perft - move generation validation', () => {
  it('generates correct number of nodes for initial position', () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(perft(fromFEN(fen), 0)).toBe(1, "depth 0");
    expect(perft(fromFEN(fen), 1)).toBe(20, "depth 1");
    expect(perft(fromFEN(fen), 2)).toBe(400, "depth 2");
    expect(perft(fromFEN(fen), 3)).toBe(8902, "depth 3");
    expect(perft(fromFEN(fen), 4)).toBe(197281, "depth 4");
  });

  it('generates correct number of nodes for "Test Position 2"', () => {
    const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
    expect(perft(fromFEN(fen), 1)).toBe(48, "depth 1");
    expect(perft(fromFEN(fen), 2)).toBe(2039, "depth 2");
    expect(perft(fromFEN(fen), 3)).toBe(97862, "depth 3");
  });

  it('generates correct number of nodes for "Test Position 3"', () => {
    const fen = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1";
    expect(perft(fromFEN(fen), 1)).toBe(14, "depth 1");
    expect(perft(fromFEN(fen), 2)).toBe(191, "depth 2");
    expect(perft(fromFEN(fen), 3)).toBe(2812, "depth 3");
    expect(perft(fromFEN(fen), 4)).toBe(43238, "depth 4");
    expect(perft(fromFEN(fen), 5)).toBe(674624, "depth 5");
  });

  it('generates correct number of nodes for "Test Position 4"', () => {
    const fen = "r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1";
    expect(perft(fromFEN(fen), 1)).toBe(6, "depth 1");
    expect(perft(fromFEN(fen), 2)).toBe(264, "depth 2");
    expect(perft(fromFEN(fen), 3)).toBe(9467, "depth 3");
    expect(perft(fromFEN(fen), 4)).toBe(422333, "depth 4");
  });

  it('generates correct number of nodes for "Test Position 5"', () => {
    expect(perft(fromFEN("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"), 1)).toBe(44, "depth 1");
    expect(perft(fromFEN("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"), 2)).toBe(1486, "depth 2");
    expect(perft(fromFEN("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"), 3)).toBe(62379, "depth 3");
    expect(perft(fromFEN("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"), 4)).toBe(2103487, "depth 4");
  });

  it('generates correct number of nodes for "Test Position 6"', () => {
    expect(perft(fromFEN("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10"), 1)).toBe(46, "depth 1");
    expect(perft(fromFEN("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10"), 2)).toBe(2079, "depth 2");
    expect(perft(fromFEN("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10"), 3)).toBe(89890, "depth 3");
  });

});


