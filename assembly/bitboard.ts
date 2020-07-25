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


import { BLACK, indexFromColor, MAX_FIELD_DISTANCE, WHITE } from './board';


// Patterns to check, whether the fields between king and rook are empty
export const WHITE_KING_SIDE_CASTLING_BIT_PATTERN: u64 = 0b01100000_00000000_00000000_00000000_00000000_00000000_00000000_00000000;
export const WHITE_QUEEN_SIDE_CASTLING_BIT_PATTERN: u64 = 0b00001110_00000000_00000000_00000000_00000000_00000000_00000000_00000000;

export const BLACK_KING_SIDE_CASTLING_BIT_PATTERN: u64 = 0b00000000_00000000_00000000_00000000_00000000_00000000_00000000_01100000;
export const BLACK_QUEEN_SIDE_CASTLING_BIT_PATTERN: u64 = 0b00000000_00000000_00000000_00000000_00000000_00000000_00000000_00001110;

// Patterns to check, whether a piece is on a light or dark field
export const LIGHT_COLORED_FIELD_PATTERN: u64 = 0b01010101_01010101_01010101_01010101_01010101_01010101_01010101_01010101;
export const DARK_COLORED_FIELD_PATTERN: u64 = 0b10101010_10101010_10101010_10101010_10101010_10101010_10101010_10101010;

export const KING_DANGER_ZONE_SIZE: i32 = 2;

function isBorder(boardPos: i32): bool {
  if (boardPos < 21 || boardPos > 98) {
    return true;
  }

  return boardPos % 10 == 0 || boardPos % 10 == 9;
}


function calculateSingleMovePatterns(directions: StaticArray<i32>): StaticArray<u64> {
  const patterns = new StaticArray<u64>(64);
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
const LETTERBOX_KNIGHT_DIRECTIONS: StaticArray<i32> = StaticArray.fromArray([21, 19, 12, 8, -12, -21, -19, -8]);
export const KNIGHT_PATTERNS: StaticArray<u64> = calculateSingleMovePatterns(LETTERBOX_KNIGHT_DIRECTIONS);

const LETTERBOX_KING_DIRECTIONS: StaticArray<i32> = StaticArray.fromArray([1, 10, -1, -10, 9, 11, -9, -11]);
export const KING_PATTERNS: StaticArray<u64> = calculateSingleMovePatterns(LETTERBOX_KING_DIRECTIONS);


export const PAWN_DOUBLE_MOVE_LINE: StaticArray<u64> = createDoubleMoveLine();

function createDoubleMoveLine(): StaticArray<u64> {
  const lines = new StaticArray<u64>(2);
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

function computeRayAttackBitboards(): StaticArray<u64> {
  const rayAttacks = new StaticArray<u64>(65 * 8); // (64 squares + 1 for empty attack bitboard) * 8 directions
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

const RAY_ATTACKS: StaticArray<u64> = computeRayAttackBitboards();

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
  return blackLeftPawnAttacks(pawns) | blackRightPawnAttacks(pawns);
}

@inline
export function whitePawnAttacks(pawns: u64): u64 {
  return whiteLeftPawnAttacks(pawns) | whiteRightPawnAttacks(pawns);
}

@inline
export function whiteLeftPawnAttacks(pawns: u64): u64 {
  return (pawns & 0xfefefefefefefefe) >> 9 // mask right column
}

@inline
export function whiteRightPawnAttacks(pawns: u64): u64 {
  return (pawns & 0x7f7f7f7f7f7f7f7f) >> 7 // mask right column
}

@inline
export function blackLeftPawnAttacks(pawns: u64): u64 {
  return (pawns & 0xfefefefefefefefe) << 7 // mask right column
}

@inline
export function blackRightPawnAttacks(pawns: u64): u64 {
  return (pawns & 0x7f7f7f7f7f7f7f7f) << 9 // mask right column
}

export const WHITE_KING_SHIELD_PATTERNS = createKingShieldPatterns(-1);
export const BLACK_KING_SHIELD_PATTERNS = createKingShieldPatterns(1);

function createKingShieldPatterns(direction: i32): StaticArray<u64> {
  const patterns = new StaticArray<u64>(64);

  for (let pos: u32 = 0; pos < 64; pos++) {
    const row = pos / 8;
    const col = pos & 7;

    let pattern: u64 = 0;
    for (let distance = 1; distance <= 2; distance++) {
      const shieldRow = row + (direction * distance);
      if (shieldRow < 0 || shieldRow > 7) { // Outside the board
        continue;
      }

      let frontPawnPos = shieldRow * 8 + col;
      pattern |= (1 << frontPawnPos);
      if (col > 0) {
        let frontWestPawnPos = shieldRow * 8 + col - 1;
        pattern |= (1 << frontWestPawnPos);
      }
      if (col < 7) {
        let frontEastPawnPos = shieldRow * 8 + col + 1;
        pattern |= (1 << frontEastPawnPos);
      }
    }

    unchecked(patterns[pos] = pattern);
  }

  return patterns;
}


export const KING_DANGER_ZONE_PATTERNS = createKingDangerZonePatterns();

function createKingDangerZonePatterns(): StaticArray<u64> {
  const patterns = new StaticArray<u64>(64);

  for (let pos: u32 = 0; pos < 64; pos++) {
    const row = pos / 8;
    const col = pos & 7;

    let pattern: u64 = 0;
    for (let rowOffset = -KING_DANGER_ZONE_SIZE; rowOffset <= KING_DANGER_ZONE_SIZE; rowOffset++) {
      const zoneRow = row + rowOffset;
      if (zoneRow < 0 || zoneRow > 7) { // Outside the board
        continue;
      }
      for (let colOffset = -KING_DANGER_ZONE_SIZE; colOffset <= KING_DANGER_ZONE_SIZE; colOffset++) {
        const zoneCol = col + colOffset;
        if (zoneCol < 0 || zoneCol > 7) { // Outside the board
          continue;
        }

        const patternPos = zoneRow * 8 + zoneCol;
        pattern |= (1 << patternPos);
      }
    }

    unchecked(patterns[pos] = pattern);
  }

  return patterns;
}

// Patterns to check, whether the path in front of the pawn is free (i.e. not blocked by opponent pieces)
export const WHITE_PAWN_FREEPATH_PATTERNS = createPawnFreePathPatterns(-1);
export const BLACK_PAWN_FREEPATH_PATTERNS = createPawnFreePathPatterns(1);

function createPawnFreePathPatterns(direction: i32): StaticArray<u64> {
  const patterns = new StaticArray<u64>(64);

  for (let pos: u32 = 0; pos < 64; pos++) {
    let row = pos / 8;
    const col = pos & 7;

    let pattern: u64 = 0;
    while (row >= 1 && row <= 6) {
      row += direction;

      pattern |= u64(1) << (row * 8 + col);
    }

    unchecked(patterns[pos] = pattern);
  }

  return patterns;
}
