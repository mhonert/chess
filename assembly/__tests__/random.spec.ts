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


import { Random } from '../random';

describe("Random number generated", () => {

  it("quickly calculates evenly distributed random numbers", () => {
    const rnd = new Random();

    const numberCounts = new Array<i32>(6);
    numberCounts.fill(0, 0, numberCounts.length);

    const iterations = 1_000_000;

    for (let i = 0; i < iterations; i++) {
      const number = u32(rnd.rand64() % 6);
      numberCounts[number]++;
    }

    const deviationTolerance = i32(iterations * 0.001); // accept a low deviation from the "ideal" distribution

    const idealDistribution = iterations / 6;
    for (let i = 0; i < numberCounts.length; i++) {
      const deviationFromIdeal = abs(idealDistribution - numberCounts[i]);
      expect(deviationFromIdeal).toBeLessThan(deviationTolerance);
    }
  });

});

