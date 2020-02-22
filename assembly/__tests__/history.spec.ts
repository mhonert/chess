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


import { PositionHistory } from '../history';

describe("Position History", () => {

  it("Detects threefold repetition", () => {
    const history = new PositionHistory();
    history.push(1);
    history.push(1);
    expect(history.isThreefoldRepetion()).toBeFalsy("Position only occured twice");

    history.push(1);
    expect(history.isThreefoldRepetion()).toBeTruthy("Threefold repetion not detected");
  });

  it("Detects single repetition", () => {
    const history = new PositionHistory();
    history.push(1);
    expect(history.isSingleRepetition()).toBeFalsy("Position only occured once");
    history.push(2);
    expect(history.isSingleRepetition()).toBeFalsy("Position only occured once");
    history.push(1);
    expect(history.isSingleRepetition()).toBeTruthy("Single repetition not detected");
  });

});
