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

const multiplier: u64 = 6364136223846793005;
const increment: u64 = 1442695040888963407;

// Create pseudo random numbers using a "Permuted Congruential Generator" (see https://en.wikipedia.org/wiki/Permuted_congruential_generator)
export class Random {
  state: u64 = 0x4d595df4d0f33173;

  rand32(): u32 {
    let x = this.state;
    const count: u32 = u32(x >> u64(59));
    this.state = x * multiplier + increment;
    x ^= x >> 18;

    return rotr(u32(x >> 27), count);
  }

  rand64(): u64 {
    return (u64(this.rand32()) << 32) | u64(this.rand32());
  }

  updateSeed(seed: u64): void {
    this.state  = seed * multiplier + increment;
  }
}
