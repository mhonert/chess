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

export class Move {
  constructor(piece, start, end) {
    this.start = start;
    this.end = end;
    this.encodedMove = Math.abs(piece) | (start << 3) | (end << 10);
  }

  static fromEncodedMove(encodedMove) {
    const piece = encodedMove & 0x7; // Bits 0-2
    const start = (encodedMove >> 3) & 0x7F; // Bits 3-10
    const end = (encodedMove >> 10) & 0x7F; // Bit 10-17

    return new Move(piece, start, end);
  }
}
