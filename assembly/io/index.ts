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

import {currentMillis as wasiCurrentMillis} from './wasi/clock';
import {currentMillis as browserCurrentMillis} from './browser/clock';

import {readLine as wasiReadLine, writeLine as wasiWriteLine, writeError as wasiWriteError} from './wasi/stdio';
import {readLine as browserReadLine, writeLine as browserWriteLine, writeError as browserWriteError} from './browser/stdio';

export namespace clock {
  export const currentMillis = (IS_WASI == 1 ? wasiCurrentMillis : browserCurrentMillis);
}

export namespace stdio {
  export const readLine = (IS_WASI == 1 ? wasiReadLine : browserReadLine);
  export const writeLine = (IS_WASI == 1 ? wasiWriteLine : browserWriteLine);
  export const writeError = (IS_WASI == 1 ? wasiWriteError : browserWriteError);
}