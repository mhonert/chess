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

import { fromBitBoardString, toBitBoardString } from '../util';

describe("fromBitBoardString", () => {

  it("parses bit board string correctly", () => {
    expect(fromBitBoardString("11000000/00000000/00000000/00000000/00000000/00000000/00000000/00000000")).toBe(0x3);
    expect(fromBitBoardString("11110000/00000000/00000000/00000000/00000000/00000000/00000000/00000000")).toBe(0xF);
    expect(fromBitBoardString("01010101/00000000/00000000/00000000/00000000/00000000/00000000/00000000")).toBe(0xAA);
    expect(fromBitBoardString("00000000/00000000/00000000/00000000/00000000/00000000/00000000/00000000")).toBe(0);
    expect(fromBitBoardString("11111111/11111111/11111111/11111111/11111111/11111111/11111111/11111111")).toBe(0xFFFFFFFFFFFFFFFF);
    expect(fromBitBoardString("00000000/00000000/00000000/00000000/00000000/00000000/00000000/00000001")).toBe(0x8000000000000000)
  });

});

describe("toBitBoardString", () => {

  it("writes correct bit board string", () => {
    expect(toBitBoardString(0x3)).toBe(("11000000/00000000/00000000/00000000/00000000/00000000/00000000/00000000"));
    expect(toBitBoardString(0xF)).toBe(("11110000/00000000/00000000/00000000/00000000/00000000/00000000/00000000"));
    expect(toBitBoardString(0xAA)).toBe(("01010101/00000000/00000000/00000000/00000000/00000000/00000000/00000000"));
    expect(toBitBoardString(0)).toBe(("00000000/00000000/00000000/00000000/00000000/00000000/00000000/00000000"));
    expect(toBitBoardString(0xFFFFFFFFFFFFFFFF)).toBe(("11111111/11111111/11111111/11111111/11111111/11111111/11111111/11111111"));
    expect(toBitBoardString(0x8000000000000000)).toBe("00000000/00000000/00000000/00000000/00000000/00000000/00000000/00000001");
  });

});
