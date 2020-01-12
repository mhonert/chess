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
import { BLACK, indexFromColor, MAX_FIELD_DISTANCE, WHITE } from './board';
import { KING_DIRECTIONS, KNIGHT_DIRECTIONS } from './pieces';


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

function calculateBitIndexToBoardPos(): Array<i32> {
  const boardPositions: Array<i32> = new Array<i32>();
  for (let bitPos = 0; bitPos < 64; bitPos++) {
    const pos = 21 + (bitPos & 7) + ((bitPos >> 3) * 10) // calculate letter board position from bit index
    boardPositions[bitPos] = pos;
  }
  return boardPositions;
}

export const BIT_INDEX_TO_BOARD_POS = toInt32Array(calculateBitIndexToBoardPos());

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


// Patterns to check, whether the fields between king and rook are empty
export const WHITE_SMALL_CASTLING_BIT_PATTERN: u64 = 0b01100000_00000000_00000000_00000000_00000000_00000000_00000000_00000000;
export const WHITE_BIG_CASTLING_BIT_PATTERN: u64 = 0b00001110_00000000_00000000_00000000_00000000_00000000_00000000_00000000;

export const BLACK_SMALL_CASTLING_BIT_PATTERN: u64 = 0b00000000_00000000_00000000_00000000_00000000_00000000_00000000_01100000;
export const BLACK_BIG_CASTLING_BIT_PATTERN: u64 = 0b00000000_00000000_00000000_00000000_00000000_00000000_00000000_00001110;


export function isBorder(boardPos: i32): bool {
  if (boardPos < 21 || boardPos > 98) {
    return true;
  }

  return boardPos % 10 == 0 || boardPos % 10 == 9;
}


function calculateSingleMovePatterns(directions: Int32Array): Uint64Array {
  const patterns = new Uint64Array(64);
  let index = 0;
  for (let boardPos = 21; boardPos <= 98; boardPos++) {
    if (isBorder(boardPos)) {
      continue;
    }

    let pattern: u64 = 0;
    for (let i = 0; i < directions.length; i++) {
      const dir = directions[i];
      const targetPos = boardPos + dir;
      if (!isBorder(targetPos)) {
        pattern |= BOARD_POS_TO_BIT_PATTERN[targetPos];
      }
    }

    patterns[index++] = pattern;
  }

  return patterns;
}

export const KNIGHT_PATTERNS: Uint64Array = calculateSingleMovePatterns(KNIGHT_DIRECTIONS);

export const KING_PATTERNS: Uint64Array = calculateSingleMovePatterns(KING_DIRECTIONS);


export const PAWN_DOUBLE_MOVE_LINE: Uint64Array = createDoubleMoveLine();

function createDoubleMoveLine(): Uint64Array {
  const lines = new Uint64Array(2);
  lines[indexFromColor(BLACK)] = 0b0000000000000000000000000000000000000000111111110000000000000000;
  lines[indexFromColor(WHITE)] = 0b0000000000000000111111110000000000000000000000000000000000000000;

  return lines;
}


enum Direction {
  NORTH_WEST, NORTH, NORTH_EAST,
  EAST,
  SOUTH_EAST, SOUTH, SOUTH_WEST,
  WEST
}

const DIRECTION_COL_OFFSET: Array<i32> = [-1,  0, +1, +1, +1,  0, -1, -1];
const DIRECTION_ROW_OFFSET: Array<i32> = [-1, -1, -1,  0, +1, +1, +1,  0];

function computeRayAttackBitboards(): Uint64Array {
  const rayAttacks = new Uint64Array(65 * 8); // (64 squares + 1 for empty attack bitboard) * 8 directions
  let index = 0;
  for (let dir = Direction.NORTH_WEST; dir <= Direction.WEST; dir++) {
    for (let pos = 0; pos < 64; pos++) {
      let col = pos % 8;
      let row = pos / 8;

      let attackBitboard: u64 = 0;

      for (let distance = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
        col += DIRECTION_COL_OFFSET[dir];
        row += DIRECTION_ROW_OFFSET[dir];
        if (col < 0 || col > 7 || row < 0 || row > 7) {
          break; // border
        }

        const patternIndex = row * 8 + col;
        attackBitboard |= (1 << patternIndex);
      }

      rayAttacks[index++] = attackBitboard;
    }
    rayAttacks[index++] = 0; // empty attack bitboard
  }
  return rayAttacks;
}

const RAY_ATTACKS: Uint64Array = computeRayAttackBitboards();

@inline
function getPositiveRayAttacks(occupied: u64, dir: Direction, pos: i32): u64 {
  const dirOffset = dir * 65;
  let attacks = unchecked(RAY_ATTACKS[dirOffset  + pos]);
  const blocker = attacks & occupied;
  if (blocker == 0) {
    return attacks;
  }
  const firstBlockerPos = 63 - i32(clz(blocker));
  attacks ^= unchecked(RAY_ATTACKS[dirOffset + firstBlockerPos]);
  return attacks;
}

@inline
function getNegativeRayAttacks(occupied: u64, dir: Direction, pos: i32): u64 {
  const dirOffset = dir * 65;
  let attacks = unchecked(RAY_ATTACKS[dirOffset + pos]);
  const blocker = attacks & occupied;
  const firstBlockerPos = i32(ctz(blocker));
  attacks ^= unchecked(RAY_ATTACKS[dirOffset + firstBlockerPos]);
  return attacks;
}

@inline
export function diagonalAttacks(occupied: u64, pos: i32): u64 {
  return getPositiveRayAttacks(occupied, Direction.NORTH_EAST, pos) | getNegativeRayAttacks(occupied, Direction.SOUTH_WEST, pos);
}

@inline
export function antiDiagonalAttacks(occupied: u64, pos: i32): u64 {
  return getPositiveRayAttacks(occupied, Direction.NORTH_WEST, pos) | getNegativeRayAttacks(occupied, Direction.SOUTH_EAST, pos);
}

@inline
export function horizontalAttacks(occupied: u64, pos: i32): u64 {
  return getPositiveRayAttacks(occupied, Direction.WEST, pos) | getNegativeRayAttacks(occupied, Direction.EAST, pos);
}

@inline
export function verticalAttacks(occupied: u64, pos: i32): u64 {
  return getPositiveRayAttacks(occupied, Direction.NORTH, pos) | getNegativeRayAttacks(occupied, Direction.SOUTH, pos);
}
