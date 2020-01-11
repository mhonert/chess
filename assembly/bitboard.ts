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


import { toInt32Array } from './util';
import { BLACK, indexFromColor, WHITE } from './board';
import { KNIGHT_DIRECTIONS } from './pieces';


/* Convert from array board position to bitboard index.
 * Bitboard representation maps the upper left corner of the board to bit index 0 and the lower right corner to 63.
 * Array representation maps the upper left corner of the board to array index 21 and the lower right corner to 98.
 *
 */
function calculateBoardPosToBitIndex(): Array<i32> {
  const bitIndices: Array<i32> = new Array<i32>();
  for (let i: i32 = 0; i < 99; i++) {
    const col = (i - 21) % 10;
    const row = (i - 21) / 10;
    if (col >= 0 && row >= 0 && col < 8) {
      bitIndices.push(row * 8 + col);
    } else {
      bitIndices.push(-1);
    }
  }

  return bitIndices;
}


export const BOARD_POS_TO_BIT_INDEX = toInt32Array(calculateBoardPosToBitIndex());

function calculateBoardPosToBitPattern(bitIndices: Int32Array): Uint64Array {
  const bitPatterns = new Uint64Array(bitIndices.length);
  for (let i = 0; i < bitIndices.length; i++) {
    if (bitIndices[i] != -1) {
      bitPatterns[i] = 1 << u64(bitIndices[i]);
    } else {
      bitPatterns[i] = 0;
    }
  }
  return bitPatterns;
}


export const BOARD_POS_TO_BIT_PATTERN: Uint64Array = calculateBoardPosToBitPattern(BOARD_POS_TO_BIT_INDEX);

function calculateHorizontalPatterns(): Uint64Array {
  const patterns = new Uint64Array(64);
  for (let bit = 0; bit < 64; bit++) {
    const pattern: u64 = 0xFF << ((bit >> 3) << 3)
    patterns[bit] = pattern;
  }

  return patterns
}

export const HORIZONTAL_PATTERNS: Uint64Array = calculateHorizontalPatterns();

function calculateVerticalPatterns(): Uint64Array {
  const patterns = new Uint64Array(64);
  const startPattern: u64 = 0x0101010101010101;
  for (let bit = 0; bit < 64; bit++) {
    const pattern: u64 = startPattern << (bit & 0x7);
    patterns[bit] = pattern;
  }

  return patterns
}

export const VERTICAL_PATTERNS: Uint64Array = calculateVerticalPatterns();

function calculateDiagonalUpPatterns(): Uint64Array {
  const patterns = new Uint64Array(64);
  for (let bit = 0; bit < 64; bit++) {
    const startCol = bit % 8;
    const startRow = bit / 8;

    let pattern: u64 = 0;

    for (let distance = -7; distance <= 7; distance++) {
      let col = startCol - distance;
      let row = startRow + distance;
      if (col >= 0 && row >= 0 && col <= 7 && row <= 7) {
        const patternIndex = row * 8 + col;
        pattern |= (1 << patternIndex);
      }
    }
    patterns[bit] = pattern;
  }

  return patterns
}

export const DIAGONAL_UP_PATTERNS: Uint64Array = calculateDiagonalUpPatterns();

function calculateDiagonalDownPatterns(): Uint64Array {
  const patterns = new Uint64Array(64);
  for (let bit = 0; bit < 64; bit++) {
    const startCol = bit % 8;
    const startRow = bit / 8;

    let pattern: u64 = 0;

    for (let distance = -7; distance <= 7; distance++) {
      let col = startCol + distance;
      let row = startRow + distance;
      if (col >= 0 && row >= 0 && col <= 7 && row <= 7) {
        const patternIndex = row * 8 + col;
        pattern |= (1 << patternIndex);
      }
    }
    patterns[bit] = pattern;
  }

  return patterns
}

export const DIAGONAL_DOWN_PATTERNS: Uint64Array = calculateDiagonalDownPatterns();


export function isBorder(boardPos: i32): bool {
  if (boardPos < 21 || boardPos > 98) {
    return true;
  }

  return boardPos % 10 == 0 || boardPos % 10 == 9;
}

function calculateKnightPatterns(): Uint64Array {
  const patterns = new Uint64Array(64);
  let index = 0;
  for (let boardPos = 21; boardPos <= 98; boardPos++) {
    if (isBorder(boardPos)) {
      continue;
    }

    let pattern: u64 = 0;
    for (let i = 0; i < KNIGHT_DIRECTIONS.length; i++) {
      const dir = KNIGHT_DIRECTIONS[i];
      const targetPos = boardPos + dir;
      if (!isBorder(targetPos)) {
        pattern |= BOARD_POS_TO_BIT_PATTERN[targetPos];
      }
    }

    patterns[index++] = pattern;
  }

  return patterns;
}

export const KNIGHT_PATTERNS: Uint64Array = calculateKnightPatterns();


export const PAWN_DOUBLE_MOVE_LINE: Uint64Array = createDoubleMoveLine();

function createDoubleMoveLine(): Uint64Array {
  const lines = new Uint64Array(2);
  lines[indexFromColor(BLACK)] = 0b0000000000000000000000000000000000000000111111110000000000000000;
  lines[indexFromColor(WHITE)] = 0b0000000000000000111111110000000000000000000000000000000000000000;

  return lines;
}


