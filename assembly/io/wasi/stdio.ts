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

import { errno, fd, fd_write, fd_read } from 'bindings/wasi';

const STDIN = 0;
const STDOUT = 1;
const STDERR = 2;

const PTR_SIZE = sizeof<usize>();

type ptr = usize;

const LINEFEED = 10;
const CARRIAGE_RETURN = 13;

const LF_STR = String.fromCharCode(LINEFEED);

export function writeLine(str: string): void {
  write(str, STDOUT);
}

export function writeErrorMessage(str: string): void {
  write(str, STDERR);
}

function write(str: string, target: fd): void {
  const strWithNewLine = str + LF_STR;

  // Prepare write buffer
  const writeChars = String.UTF8.encode(strWithNewLine);
  const writeCharsPtr = changetype<ptr>(writeChars);
  const ioVec = new ArrayBuffer(PTR_SIZE * 2);
  const ioVecPtr = changetype<ptr>(ioVec);
  store<ptr>(ioVecPtr, writeCharsPtr);
  store<ptr>(ioVecPtr + PTR_SIZE, writeChars.byteLength);

  // Prepare 'written' pointer
  const writtenSizeBuffer = new ArrayBuffer(PTR_SIZE);
  const writtenSizeBufferPtr = changetype<ptr>(writtenSizeBuffer);
  fd_write(target, ioVecPtr, 1, writtenSizeBufferPtr);
}

// Reads characters one by one until a line feed character occurs or the stream ended
export function readLine(maxLength: i32 = 1024): string {
  const readChars = new ArrayBuffer(maxLength);
  const readCharsPtr = changetype<ptr>(readChars);

  // Prepare buffer for exactly one character
  const singleCharBuffer = new ArrayBuffer(1);
  const singleCharPtr = changetype<ptr>(singleCharBuffer);

  const ioVec = new ArrayBuffer(PTR_SIZE * 2);
  const ioVecPtr = changetype<ptr>(ioVec);

  store<ptr>(ioVecPtr, singleCharPtr);
  store<ptr>(ioVecPtr + PTR_SIZE, 1);

  // Prepare 'read' pointer
  const readSizeBuffer = new ArrayBuffer(PTR_SIZE);
  const readSizeBufferPtr = changetype<ptr>(readSizeBuffer);

  let length = 0;
  do {
    const result: errno = fd_read(STDIN, ioVecPtr, 1, readSizeBufferPtr);
    if (result != errno.SUCCESS) {
      break;
    }

    const readSize = load<usize>(readSizeBufferPtr);
    if (readSize == 0) {
      break;
    }

    const char = load<u8>(singleCharPtr);
    if (char == CARRIAGE_RETURN) {
      // skip carriage return char (for Windows)
      continue;
    }

    if (char == LINEFEED) {
      break;
    }

    store<u8>(readCharsPtr + length, char);
    length++;
  } while (length < maxLength);

  return String.UTF8.decodeUnsafe(readCharsPtr, length);
}
