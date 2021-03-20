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

export class PositionHistory {
  private positions: StaticArray<u64> = new StaticArray<u64>(1024);
  private index: i32 = 0;

  push(hash: u64): void {
    unchecked(this.positions[this.index++] = hash);
  }

  pop(): void {
    this.index--;
  }

  isThreefoldRepetion(): bool {
    if (this.index <= 2) {
      return false;
    }

    const hash = unchecked(this.positions[this.index - 1]);

    let count = 0;
    for (let i = 0; i < this.index - 1; i++) {
      if (unchecked(this.positions[i]) == hash) {
        count++;
        if (count == 2) {
          return true;
        }
      }
    }

    return false;
  }

  isSingleRepetition(): bool {
    if (this.index <= 1) {
      return false;
    }

    const hash = unchecked(this.positions[this.index - 1]);
    for (let i = 0; i < this.index - 1; i++) {
      if (unchecked(this.positions[i]) == hash) {
        return true;
      }
    }

    return false;
  }

  clear(): void {
    this.index = 0;
  }
}