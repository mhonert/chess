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


import { BLACK, indexFromColor, MAX_FIELD_DISTANCE, WHITE } from './board';
import { toInt32Array } from './util';


// Patterns to check, whether the fields between king and rook are empty
export const WHITE_SMALL_CASTLING_BIT_PATTERN: u64 = 0b01100000_00000000_00000000_00000000_00000000_00000000_00000000_00000000;
export const WHITE_BIG_CASTLING_BIT_PATTERN: u64 = 0b00001110_00000000_00000000_00000000_00000000_00000000_00000000_00000000;

export const BLACK_SMALL_CASTLING_BIT_PATTERN: u64 = 0b00000000_00000000_00000000_00000000_00000000_00000000_00000000_01100000;
export const BLACK_BIG_CASTLING_BIT_PATTERN: u64 = 0b00000000_00000000_00000000_00000000_00000000_00000000_00000000_00001110;


function isBorder(boardPos: i32): bool {
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
        let row = (targetPos - 21) / 10;
        let col = (targetPos - 21) % 10;
        const bitIndex = col + (row * 8);
        pattern |= 1 << bitIndex;
      }
    }

    patterns[index++] = pattern;
  }

  return patterns;
}

// Use letterbox board (10 columns * 12 rows) for simpler border detection during pattern calculation:
const LETTERBOX_KNIGHT_DIRECTIONS: Int32Array = toInt32Array([21, 19, 12, 8, -12, -21, -19, -8]);
export const KNIGHT_PATTERNS: Uint64Array = calculateSingleMovePatterns(LETTERBOX_KNIGHT_DIRECTIONS);

const LETTERBOX_KING_DIRECTIONS: Int32Array = toInt32Array([1, 10, -1, -10, 9, 11, -9, -11]);
export const KING_PATTERNS: Uint64Array = calculateSingleMovePatterns(LETTERBOX_KING_DIRECTIONS);


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


@inline
export function blackPawnAttacks(pawns: u64): u64 {
  let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
  attackToLeft <<= 7;

  let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
  attackToRight <<= 9;

  return attackToLeft | attackToRight;
}

@inline
export function whitePawnAttacks(pawns: u64): u64 {
  let attackToLeft = pawns & 0xfefefefefefefefe; // mask right column
  attackToLeft >>= 9;

  let attackToRight = pawns & 0x7f7f7f7f7f7f7f7f; // mask left column
  attackToRight >>= 7;

  return attackToLeft | attackToRight;
}