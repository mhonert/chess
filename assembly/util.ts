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

import { BLACK, Board, WHITE } from './board';

@inline
export function sign(value: i32): i32 {
  if (value == 0) {
    return 0;
  }

  return value < 0 ? -1 : 1;
}

// Checks whether the given values have the same color, by comparing the sign (+/-)
@inline
export function sameColor(a: i32, b: i32): bool {
  return (a ^ b) >= 0;
}

// Checks whether the given values have different colors, by comparing the sign (+/-)
@inline
export function differentColor(a: i32, b: i32): bool {
  return (a ^ b) < 0;
}

// Only parses 0s and 1s. All other characters are ignored and can for example be used as separators (10001000/00110011/...)
// Note: the printing order starts with the least significant bit (index 0) up to the most significant bit (index 63), so
// the string representation is reversed (i.e. for value 1: "10000000/00000000/[...]" instead of "[...]/00000000/00000001")
export function fromBitBoardString(bits: string): u64 {
  let result: u64 = 0;
  let bitCount = 0;
  for (let i = bits.length - 1; i >= 0; i--) {
    const char = bits.charAt(i);

    if (char == '1') {
      bitCount++;
      if (bitCount > 64) {
        throw new Error("Can not parse bit string with more than 64 bits");
      }
      result <<= 1;
      result |= 1;
    } else if (char == '0') {
      bitCount++;
      if (bitCount > 64) {
        throw new Error("Can not parse bit string with more than 64 bits");
      }
      result <<= 1;
    }
  }

  return result;
}

export function toBitBoardString(value: u64, separator: string = '/'): string {
 let result = "";
 for (let i = 0; i < 64; i++) {
   if (i != 0 && i % 8 == 0) {
     result += separator
   }
   if ((value & (1 << i)) != 0) {
     result += "1";
   } else {
     result += "0";
   }
 }
 return result;
}

export function moveKing(board: Board, piece: i32, location: i32): void {
  const color = piece < 0 ? BLACK : WHITE;

  const kingPos = board.findKingPosition(color);
  board.removePiece(kingPos);

  board.addPiece(color, abs(piece), location);
  const state = board.getState();
  board.updateKingPosition(color, location);
  board.setState(state);
}

// Packs two scores (i16) into a single value (u32)
@inline
export function packScores(a: i16, b: i16): u32 {
  return (u32(b) << 16) | (u32(a) & 0xFFFF);
}

// Unpacks the first score from a packed value (see packScore)
@inline
export function unpackFirstScore(packed: u32): i16 {
  return i16(packed & 0xFFFF);
}

// Unpacks the second score from a packed value (see packScore)
@inline
export function unpackSecondScore(packed: u32): i16 {
  return i16(packed >> 16);
}
