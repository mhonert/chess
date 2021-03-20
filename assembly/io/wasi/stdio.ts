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

import { Console } from "as-wasi";

export function writeLine(str: string): void {
  Console.log(str);
}

export function writeError(str: string): void {
  Console.error(str);
}

// Reads characters one by one until a line feed character occurs or the stream ended
export function readLine(): string {
  const line = Console.readLine();
  if (line === null) {
    return "";
  }

  return line as string;
}
