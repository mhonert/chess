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


// Create pseudo random numbers using a "Permuted Congruential Generator" (see https://en.wikipedia.org/wiki/Permuted_congruential_generator)
let state: u64 = 0x4d595df4d0f33173;
const multiplier: u64 = 6364136223846793005;
const increment: u64 = 1442695040888963407;

export function rand32(): u32 {
  let x = state;
  const count: u32 = u32(x >> u64(59));
  state = x * multiplier + increment;
  x ^= x >> 18;

  return rotr(u32(x >> 27), count);
}

export function rand64(): u64 {
  return (u64(rand32()) << 32) | u64(rand32());
}


// TypedArray helpers

export function toInt32Array(array: Array<i32>): Int32Array {
  const result = new Int32Array(array.length);
  for (let i = 0; i < array.length; i++) {
    result[i] = array[i];
  }
  return result;
}

