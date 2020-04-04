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

import { Board, EMPTY } from './board';
import { BISHOP, KNIGHT, QUEEN, ROOK } from './pieces';
import { decodeEndIndex, decodePiece, decodeStartIndex, encodeMove } from './move-generation';

const CHARCODE_A: i32 = 'a'.charCodeAt(0);
const CHARCODE_H: i32 = 'h'.charCodeAt(0);

const CHARCODE_1: i32 = '1'.charCodeAt(0);
const CHARCODE_8: i32 = '8'.charCodeAt(0);

// Returns column 0 to 7 for chars 'a' to 'h'
function toNumericColumn(colChar: i32): i32 {
  if (colChar < CHARCODE_A || colChar > CHARCODE_H) {
    throw new Error("Invalid uci move colum char: " + String.fromCharCode(colChar));
  }

  return colChar - CHARCODE_A;
}

// Returns row 7 to 0 for chars '1' to '8'
// Note: bitboard representation for a8 is 0, while h1 is 63
function toNumericRow(rowChar: i32): i32 {
  if (rowChar < CHARCODE_1 || rowChar > CHARCODE_8) {
    throw new Error("Invalid uci move row char: " + String.fromCharCode(rowChar));
  }

  return CHARCODE_8 - rowChar;
}

function toNumericPiece(pieceChar: string): i32 {
  if (pieceChar == 'n') {
    return KNIGHT;
  } else if (pieceChar == 'b') {
    return BISHOP;
  } else if (pieceChar == 'r') {
    return ROOK;
  } else if (pieceChar == 'q') {
    return QUEEN;
  }

  throw new Error("Invalid uci move promotion piece: " + pieceChar);
}

function toUCISquare(row: i32, column: i32): string {
  return String.fromCharCode(CHARCODE_A + column) + String.fromCharCode(CHARCODE_8 - row);
}

function toUCIPromotionPiece(piece: i32): string {
  switch (piece) {
    case EMPTY: return "";
    case KNIGHT: return 'n';
    case BISHOP: return 'b';
    case ROOK: return 'r';
    case QUEEN: return 'q';
    default: throw new Error("Unexpected promotion piece id: " + piece.toString());
  }
}

export class UCIMove {
  start: i32;
  end: i32;
  promotionPiece: i32;

  constructor(start: i32, end: i32, promotionPiece: i32 = EMPTY) {
    this.start = start;
    this.end = end;
    this.promotionPiece = promotionPiece;
  }

  toEncodedMove(board: Board): i32 {
    const piece = this.promotionPiece != EMPTY ? this.promotionPiece : abs(board.getItem(this.start));
    return encodeMove(piece, this.start, this.end);
  }

  toUCINotation(): string {
    const startColumn = this.start & 7;
    const startRow = this.start / 8;

    const endColumn = this.end & 7;
    const endRow = this.end / 8 ;

    return toUCISquare(startRow, startColumn) + toUCISquare(endRow, endColumn) + toUCIPromotionPiece(this.promotionPiece);
  }

  static fromUCINotation(str: string): UCIMove {
    if (str.length < 4) {
      throw new Error("Invalid uci move notation: " + str);
    }

    const startColumn = toNumericColumn(str.charCodeAt(0));
    const startRow = toNumericRow(str.charCodeAt(1));

    const endColumn = toNumericColumn(str.charCodeAt(2));
    const endRow = toNumericRow(str.charCodeAt(3));

    const promotionPiece = str.length == 5 ? toNumericPiece(str.charAt(4)) : EMPTY;

    return new UCIMove((startRow * 8) + startColumn, endRow * 8 + endColumn, promotionPiece);
  }

  static fromEncodedMove(board: Board, move: i32): UCIMove {
    const targetPiece = decodePiece(move);
    const startIndex = decodeStartIndex(move);
    const endIndex = decodeEndIndex(move);

    const currentPiece = abs(board.getItem(startIndex));
    const promotionPiece = targetPiece != currentPiece ? targetPiece : EMPTY;

    return new UCIMove(startIndex, endIndex, promotionPiece);
  }
}

