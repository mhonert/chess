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

import {
  BLACK,
  BLACK_ENPASSANT_LINE_END,
  BLACK_ENPASSANT_LINE_START,
  Board,
  BOARD_BORDER,
  EMPTY,
  WHITE,
  WHITE_ENPASSANT_LINE_END,
  WHITE_ENPASSANT_LINE_START
} from './board';

/* Transforms the given board to a string representation of FEN (see https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
 */
export function toFEN(board: Board): string {
  return piecePlacement(board) + ' ' + activeColor(board) + ' ' + castlingAvailability(board) +
    ' ' + enPassantTargetSquare(board) + ' ' + halfmoveClock(board) + ' ' + fullmoveNumber(board);
}

// Black pieces go from -6 to -1, white pieces from 1 to 6
// add 6 to get the index to the FEN character for the piece:
const PIECE_FEN_CHARS: string = "kqrbnp/PNBRQK";

const COLUMN_LETTERS: string = "abcdefgh";

function piecePlacement(board: Board): string {
  let result: string = "";
  let emptyFieldCount = 0;

  for (let pos = 21; pos <= 99; pos++) {
    const piece = board.getItem(pos);

    if (piece == EMPTY) {
      emptyFieldCount++;
      continue;
    }

    if (emptyFieldCount > 0) {
      result += emptyFieldCount.toString();
      emptyFieldCount = 0;
    }

    if (piece == BOARD_BORDER) {
      pos += 1; // skip the two border fields in the board representation

      if (pos < 98) {
        result += "/";
      }
      continue;
    }

    const pieceFenCode = PIECE_FEN_CHARS.charAt(piece + 6);
    result += pieceFenCode;
  }

  return result;
}

function activeColor(board: Board): string {
  return board.getActivePlayer() == WHITE ? "w" : "b";
}

function castlingAvailability(board: Board): string {
  let result: string = "";
  if (!board.whiteKingMoved()) {
    if (!board.whiteRightRookMoved()) {
      result += "K";
    }

    if (!board.whiteLeftRookMoved()) {
      result += "Q";
    }
  }

  if (!board.blackKingMoved()) {
    if (!board.blackRightRookMoved()) {
      result += "k";
    }

    if (!board.blackLeftRookMoved()) {
      result += "q";
    }
  }

  return result.length == 0 ? "-" : result;
}

function enPassantTargetSquare(board: Board): string {
  for (let i = WHITE_ENPASSANT_LINE_START; i <= WHITE_ENPASSANT_LINE_END; i++) {
    if (board.isEnPassentPossible(WHITE, i)) {
      const columnNum = i % 10 - 1;
      return COLUMN_LETTERS.charAt(columnNum) + "6";
    }
  }

  for (let i = BLACK_ENPASSANT_LINE_START; i <= BLACK_ENPASSANT_LINE_END; i++) {
    if (board.isEnPassentPossible(BLACK, i)) {
      const columnNum = i % 10 - 1;
      return COLUMN_LETTERS.charAt(columnNum) + "3";
    }
  }

  return "-";
}

function halfmoveClock(board: Board): string {
  return board.getHalfMoveClock().toString();
}

function fullmoveNumber(board: Board): string {
  return board.getFullMoveCount().toString();
}