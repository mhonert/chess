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


import { antiDiagonalAttacks, diagonalAttacks, horizontalAttacks, verticalAttacks } from '../bitboard';
import { fromBitBoardString, toBitBoardString } from '../util';

describe("Bitboard ray attacks", () => {
  it("finds diagonal attacks", () => {
    expect(toBitBoardString(diagonalAttacks(0, 7))).toBe("00000000/00000010/00000100/00001000/00010000/00100000/01000000/10000000");
    expect(toBitBoardString(diagonalAttacks(0, 56))).toBe("00000001/00000010/00000100/00001000/00010000/00100000/01000000/00000000");
  })

  it("finds diagonal attacks with blockers", () => {
    const blockers = fromBitBoardString("00000000/00000000/00000100/00000000/00000000/00000000/00000000/00000000")
    expect(toBitBoardString(diagonalAttacks(blockers, 7))).toBe("00000000/00000010/00000100/00000000/00000000/00000000/00000000/00000000");
    expect(toBitBoardString(diagonalAttacks(blockers, 56))).toBe("00000000/00000000/00000100/00001000/00010000/00100000/01000000/00000000");
  })

  it("finds anti-diagonal attacks", () => {
    expect(toBitBoardString(antiDiagonalAttacks(0, 0))).toBe("00000000/01000000/00100000/00010000/00001000/00000100/00000010/00000001");
    expect(toBitBoardString(antiDiagonalAttacks(0, 63))).toBe("10000000/01000000/00100000/00010000/00001000/00000100/00000010/00000000");
  })

  it("finds anti-diagonal attacks with blockers", () => {
    const blockers = fromBitBoardString("00000000/00000000/00000100/00000000/00000000/00000000/00000010/00000000")
    expect(toBitBoardString(antiDiagonalAttacks(blockers, 0))).toBe("00000000/01000000/00100000/00010000/00001000/00000100/00000010/00000000");
    expect(toBitBoardString(antiDiagonalAttacks(blockers, 63))).toBe("00000000/00000000/00000000/00000000/00000000/00000000/00000010/00000000");

    expect(toBitBoardString(antiDiagonalAttacks(blockers, 63))).toBe("00000000/00000000/00000000/00000000/00000000/00000000/00000010/00000000");
  })

  it("finds anti-diagonal attacks with multiple blockers", () => {
    const blockers = fromBitBoardString("10000110/01101111/10110100/00101010/00101010/10110100/01101111/10000110")
    expect(toBitBoardString(antiDiagonalAttacks(blockers, 30))).toBe("00000000/00000000/00000100/00000000/00000001/00000000/00000000/00000000");
  });

  it("finds horizontal attacks", () => {
    expect(toBitBoardString(horizontalAttacks(0, 0))).toBe("01111111/00000000/00000000/00000000/00000000/00000000/00000000/00000000");
    expect(toBitBoardString(horizontalAttacks(0, 7))).toBe("11111110/00000000/00000000/00000000/00000000/00000000/00000000/00000000");
  })

  it("finds vertical attacks", () => {
    expect(toBitBoardString(verticalAttacks(0, 0))).toBe("00000000/10000000/10000000/10000000/10000000/10000000/10000000/10000000");
    expect(toBitBoardString(verticalAttacks(0, 63))).toBe("00000001/00000001/00000001/00000001/00000001/00000001/00000001/00000000");
  })
});
