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

import {
  BLACK, BLACK_KING_SIDE_CASTLING, BLACK_QUEEN_SIDE_CASTLING,
  Board,
  EMPTY, NO_CASTLING_RIGHTS,
  WHITE, WHITE_KING_SIDE_CASTLING, WHITE_QUEEN_SIDE_CASTLING
} from './board';
import {
  BLACK_ENPASSANT_LINE_END,
  BLACK_ENPASSANT_LINE_START, BLACK_PAWNS_BASELINE_START,
  WHITE_ENPASSANT_LINE_END,
  WHITE_ENPASSANT_LINE_START, WHITE_PAWNS_BASELINE_START
} from './pieces';

export const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/* Transforms the given board to a string representation of FEN (see https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
 */
export function toFEN(board: Board): string {
  return piecePlacement(board) + ' ' + activeColor(board) + ' ' + castlingAvailability(board) +
    ' ' + enPassantTargetSquare(board) + ' ' + halfMoveClock(board) + ' ' + fullMoveNumber(board);
}

// Black pieces go from -6 to -1, white pieces from 1 to 6
// add 6 to get the index to the FEN character for the piece:
const PIECE_FEN_CHARS: string = "kqrbnp/PNBRQK";

const COLUMN_LETTERS: string = "abcdefgh";

function piecePlacement(board: Board): string {
  let result: string = "";
  let emptyFieldCount = 0;

  for (let pos = 0; pos < 64; pos++) {
    const piece = board.getItem(pos);

    if (piece == EMPTY) {
      emptyFieldCount++;
      if (pos % 8 == 7) {
        result += emptyFieldCount.toString();
        if (pos != 63) {
          result += "/";
        }
        emptyFieldCount = 0;
      }
      continue;
    }

    if (emptyFieldCount > 0) {
      result += emptyFieldCount.toString();
      emptyFieldCount = 0;
    }

    const pieceFenCode = PIECE_FEN_CHARS.charAt(piece + 6);
    result += pieceFenCode;

    if (pos != 63 && pos % 8 == 7 ) {
      result += "/";
    }

  }

  return result;
}

function activeColor(board: Board): string {
  return board.getActivePlayer() == WHITE ? "w" : "b";
}

function castlingAvailability(board: Board): string {
  let result: string = "";
  if (board.canWhiteCastleKingSide()) {
    result += "K";
  }

  if (board.canWhiteCastleQueenSide()) {
    result += "Q";
  }

  if (board.canBlackCastleKingSide()) {
    result += "k";
  }

  if (board.canBlackCastleQueenSide()) {
    result += "q";
  }

  return result.length == 0 ? "-" : result;
}

function enPassantTargetSquare(board: Board): string {
  for (let i = WHITE_ENPASSANT_LINE_START; i <= WHITE_ENPASSANT_LINE_END; i++) {
    if (board.isEnPassentPossible(WHITE, i)) {
      const columnNum = i % 8;
      return COLUMN_LETTERS.charAt(columnNum) + "6";
    }
  }

  for (let i = BLACK_ENPASSANT_LINE_START; i <= BLACK_ENPASSANT_LINE_END; i++) {
    if (board.isEnPassentPossible(BLACK, i)) {
      const columnNum = i % 8;
      return COLUMN_LETTERS.charAt(columnNum) + "3";
    }
  }

  return "-";
}

function halfMoveClock(board: Board): string {
  return board.getHalfMoveClock().toString();
}

function fullMoveNumber(board: Board): string {
  return board.getFullMoveCount().toString();
}


/* Creates a Board instance from a FEN string (see https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
 */
export function fromFEN(fen: string): Board {
  const boardItems = new Array<i32>(67);
  boardItems[64] = 0;
  boardItems[65] = 0;
  boardItems[66] = 0;

  const fenParts = fen.split(" ");
  if (fenParts.length != 6) {
    throw new Error("Invalid FEN string: expected 6 parts, but got " + fenParts.length.toString());
  }

  readPiecePlacement(boardItems, fenParts[0]);
  const board = new Board(boardItems);

  const activeColor = readActiveColor(fenParts[1]);
  readCastlingAvailability(board, fenParts[2]);
  readEnPassantTargetSquare(board, fenParts[3]);
  readHalfMoveClock(board,fenParts[4]);
  readFullMoveNumber(board, activeColor, fenParts[5]);

  board.recalculateHash();

  return board;
}

const DIGIT_ONE_CHARCODE = "1".charCodeAt(0);
const DIGIT_EIGHT_CHARCODE = "8".charCodeAt(0);

function readPiecePlacement(boardItems: Array<i32>, fenPart: string): void {
  const piecePlacements = fenPart.split("/");
  if (piecePlacements.length != 8) {
    throw new Error("Invalid FEN string: invalid piece placement part");
  }

  let boardPos = 0;
  for (let i = 0; i < piecePlacements.length; i++) {
    const rowChars = piecePlacements[i];
    for (let j = 0; j < rowChars.length; j++) {
      const pieceCharCode = rowChars.charCodeAt(j);
      if (pieceCharCode >= DIGIT_ONE_CHARCODE && pieceCharCode <= DIGIT_EIGHT_CHARCODE) {
        // it's a digit indicating the number of empty fields
        const numberOfEmptyFields = pieceCharCode - DIGIT_ONE_CHARCODE + 1;
        boardItems.fill(EMPTY, boardPos, boardPos + numberOfEmptyFields);
        boardPos += numberOfEmptyFields;
        continue;
      }

      const pieceIndex = PIECE_FEN_CHARS.indexOf(String.fromCharCode(pieceCharCode));
      if (pieceIndex == -1) {
        throw new Error("Invalid FEN string: unknown piece character: " + String.fromCharCode(pieceCharCode));
      }

      const piece = pieceIndex - 6;
      boardItems[boardPos] = piece;
      boardPos++;
    }
  }
}

function readActiveColor(fenPart: string): i32 {
  if (fenPart == "w") {
    return WHITE;
  } else if (fenPart == "b") {
    return BLACK;
  }

  throw new Error("Invalid FEN string: unexpected character in color part: " + fenPart);
}

function readCastlingAvailability(board: Board, fenPart: string): void {
  let state = NO_CASTLING_RIGHTS;

  if (fenPart == "-") {
    board.setState(state);
    return;
  }

  for (let i = 0; i < fenPart.length; i++) {
    const castlingChar = fenPart.charAt(i);
    if (castlingChar == "K") {
      state |= WHITE_KING_SIDE_CASTLING;
    } else if (castlingChar == "Q") {
      state |= WHITE_QUEEN_SIDE_CASTLING;
    } else if (castlingChar == "k") {
      state |= BLACK_KING_SIDE_CASTLING;
    } else if (castlingChar == "q") {
      state |= BLACK_QUEEN_SIDE_CASTLING;
    } else {
        throw new Error("Invalid FEN string: unexpected character in castling availability string: " + castlingChar);
    }
  }

  board.setState(state);
}


const LETTER_A_CHARCODE = "a".charCodeAt(0);
const LETTER_H_CHARCODE = "h".charCodeAt(0);

function readEnPassantTargetSquare(board: Board, fenPart: string): void {
  if (fenPart == "-") {
    return;
  }

  if (fenPart.length != 2) {
    throw new Error("Invalid FEN string: unexpected en passant part: " + fenPart);
  }

  const colChar = fenPart.charCodeAt(0);
  if (colChar < LETTER_A_CHARCODE || colChar > LETTER_H_CHARCODE) {
    throw new Error("Invalid FEN string: unexpected en passant part: " + fenPart);
  }

  const rowChar = fenPart.charAt(1);

  const colOffset = (colChar - LETTER_A_CHARCODE); // 0-7

  if (rowChar == "3") {
    board.setEnPassantPossible(WHITE_PAWNS_BASELINE_START + colOffset);
  } else if (rowChar == "6") {
    board.setEnPassantPossible(BLACK_PAWNS_BASELINE_START + colOffset);
  } else {
    throw new Error("Invalid FEN string: unexpected en passant part: " + fenPart);
  }

  board.updateHashForEnPassent(0);
}

function readHalfMoveClock(board: Board, fenPart: string): void {
  const halfMoveClock = i16(parseInt(fenPart));
  if (halfMoveClock < 0) {
    throw new Error("Invalid FEN string: unexpected halfmove clock part: " + fenPart);
  }

  board.setHalfMoveClock(halfMoveClock);
}

function readFullMoveNumber(board: Board, activeColor: i32, fenPart: string): void {
  const fullMoveNumber = i16(parseInt(fenPart));
  if (fullMoveNumber < 1) {
    throw new Error("Invalid FEN string: unexpected fullmove number part: " + fenPart);
  }

  const halfMoveCount = (fullMoveNumber - 1) * 2 + (activeColor == WHITE ? 0 : 1);
  board.initializeHalfMoveCount(halfMoveCount);
}

