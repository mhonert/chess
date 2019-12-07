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
  Board,
  BLACK,
  BOARD_BORDER, EMPTY,
  WHITE, WHITE_PAWNS_BASELINE_START, WHITE_PAWNS_BASELINE_END, BLACK_PAWNS_BASELINE_START, BLACK_PAWNS_BASELINE_END
} from './board';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from './pieces';
import { sign } from './util';


export function generateMoves(board: Board, activeColor: i32): Array<i32> {
  let moves = new Array<i32>();

  for (let i = 21; i <= 98; i++) {
    const item = board.items[i];

    if (item == EMPTY || item == BOARD_BORDER) {
      continue;
    }

    const pieceColor = item < 0 ? BLACK : WHITE;
    if (pieceColor != activeColor) {
      continue;
    }

    switch (item) {
      case PAWN:
      case -PAWN:
        generatePawnMoves(moves, board, activeColor, item, i);
        continue;

      case KNIGHT:
      case -KNIGHT:
        generateKnightMoves(moves, board, activeColor, item, i);
        continue;

      case BISHOP:
      case -BISHOP:
        generateBishopMoves(moves, board, activeColor, item, i);
        continue;

      case ROOK:
      case -ROOK:
        generateRookMoves(moves, board, activeColor, item, i);
        continue;

      case QUEEN:
      case -QUEEN:
        generateQueenMoves(moves, board, activeColor, item, i);
        continue;

      case KING:
      case -KING:
        generateKingMoves(moves, board, activeColor, item, i);
        continue;

    }
  }

  return moves;
};


function generatePawnMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  const moveDirection = -activeColor;

  if ((activeColor == WHITE && start < 39) || (activeColor == BLACK && start > 80)) {
    generateDiagonalPawnMove(moves, board, activeColor, piece, start, start + 9 * moveDirection, true);
    generateStraightPawnMove(moves, board, activeColor, piece, start, start + 10 * moveDirection, true);
    generateDiagonalPawnMove(moves, board, activeColor, piece, start, start + 11 * moveDirection, true);
    return;
  }

  generateDiagonalPawnMove(moves, board, activeColor, piece, start, start + 9 * moveDirection, false);
  generateStraightPawnMove(moves, board, activeColor, piece, start, start + 10 * moveDirection, false);
  generateDiagonalPawnMove(moves, board, activeColor, piece, start, start + 11 * moveDirection, false);

  if (activeColor == WHITE && start >= WHITE_PAWNS_BASELINE_START && start <= WHITE_PAWNS_BASELINE_END) {
    generateStraightPawnMove(moves, board, activeColor, piece, start, start + 20 * moveDirection, false);
  } else if (activeColor == BLACK && start >= BLACK_PAWNS_BASELINE_START && start <= BLACK_PAWNS_BASELINE_END) {
    generateStraightPawnMove(moves, board, activeColor, piece, start, start + 20 * moveDirection, false);
  }
};

function generateStraightPawnMove(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): void {
  if (isValidStraightPawnMove(board, activeColor, piece, start, end) != VALID) {
    return;
  }

  if (createPromotions) {
    moves.push(encodeMove(KNIGHT, start, end));
    moves.push(encodeMove(BISHOP, start, end));
    moves.push(encodeMove(ROOK, start, end));
    moves.push(encodeMove(QUEEN, start, end));

  } else {
    moves.push(encodeMove(piece, start, end));

  }
}

function generateDiagonalPawnMove(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): void {
  if (isValidDiagonalPawnMove(board, activeColor, piece, start, end) != VALID) {
    return;
  }

  if (createPromotions) {
    moves.push(encodeMove(KNIGHT, start, end));
    moves.push(encodeMove(BISHOP, start, end));
    moves.push(encodeMove(ROOK, start, end));
    moves.push(encodeMove(QUEEN, start, end));

  } else {
    moves.push(encodeMove(piece, start, end));

  }
}


export const VALID = 0;
export const INVALID = 2;

// Only relevant for bishop, rook and queen who can traverse multiple fields in the same direction:
export const VALID_BLOCKING = 1;
export const INVALID_BLOCKING = 3;

function isValidStraightPawnMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {

  if (board.items[end] == BOARD_BORDER) {
    return INVALID;
  }

  const targetPiece = board.items[end];

  if (targetPiece != EMPTY) {
    return INVALID;
  }

  const direction = -activeColor;

  // 1 field move
  if (end - start == 10 * direction) {
    return moveResultsInCheck(board, piece, start, end, activeColor)
      ? INVALID
      : VALID
  }

  // 2 fields move from base line
  const noObstacleInBetween = board.items[start + direction * 10] == EMPTY;
  if (end - start == 20 * direction && noObstacleInBetween) {
    return moveResultsInCheck(board, piece, start, end, activeColor)
      ? INVALID
      : VALID;
  }

  return INVALID;
};

function isValidDiagonalPawnMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {

  if (board.items[end] == BOARD_BORDER) {
    return INVALID;
  }

  const targetPiece = board.items[end];
  const targetPieceColor: i32 = sign(targetPiece);

  // Diagonal => hit other piece
  if (targetPieceColor == -activeColor) {
    return moveResultsInCheck(board, piece, start, end, activeColor)
      ? INVALID
      : VALID;
  }

  // En passant?
  if (board.items[end] == EMPTY && board.isEnPassentPossible(activeColor, end)) {
    return moveResultsInCheck(board, piece, start, end, activeColor)
      ? INVALID
      : VALID;
  }

  return INVALID;
};


export const KNIGHT_DIRECTIONS: Array<i32> = [21, 19, 12, 8, -12, -21, -19, -8];

function isValidKnightMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {

  // General assumption is that the move already follows the knight move pattern

  if (board.items[end] == BOARD_BORDER) {
    return INVALID;
  }

  const targetPieceColor = sign(board.items[end]);

  if (activeColor == targetPieceColor) {
    return INVALID;
  }

  return moveResultsInCheck(board, piece, start, end, activeColor)
    ? INVALID
    : VALID;
};

function generateKnightMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < KNIGHT_DIRECTIONS.length; i++) {
    const offset = KNIGHT_DIRECTIONS[i];
    if (isValidKnightMove(board, activeColor, piece, start, start + offset) == VALID) {
      moves.push(encodeMove(piece, start, start + offset));
    }
  }
};


const DIAGONAL_DIRECTIONS: Array<i32> = [9, 11, -9, -11];
const MAX_FIELD_DISTANCE: i32 = 7; // maximum distance between two fields on the board

function isValidBishopMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {
  if (board.items[end] == BOARD_BORDER) {
    return INVALID_BLOCKING;
  }

  const pieceColor = sign(board.items[start]);
  if (pieceColor != activeColor) {
    return INVALID_BLOCKING;
  }

  const targetPieceColor = sign(board.items[end]);

  if (activeColor == targetPieceColor) {
    return INVALID_BLOCKING;
  }

  if (moveResultsInCheck(board, piece, start, end, activeColor)) {
    return board.items[end] == EMPTY
      ? INVALID
      : INVALID_BLOCKING
  }

  return board.items[end] == EMPTY
    ? VALID
    : VALID_BLOCKING

};


function generateBishopMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < DIAGONAL_DIRECTIONS.length; i++) {
    const direction = DIAGONAL_DIRECTIONS[i];
    generateBishopDirectionMoves(moves, board, activeColor, piece, start, direction);
  }
};

function generateBishopDirectionMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, direction: i32): void {
  for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
    const end = start + direction * distance;

    switch (isValidBishopMove(board, activeColor, piece, start, end)) {
      case VALID:
        moves.push(encodeMove(piece, start, end));
        break;

      case VALID_BLOCKING:
        moves.push(encodeMove(piece, start, end));
        return; // stop with this direction

      case INVALID:
        break; // skip this move, but continue in this direction

      case INVALID_BLOCKING:
        return; // stop with this direction
    }
  }
}

const ORTHOGONAL_DIRECTIONS: Array<i32> = [1, 10, -1, -10];

const WHITE_LEFT_ROOK_START = 91;
const WHITE_RIGHT_ROOK_START = 98;
const BLACK_LEFT_ROOK_START = 21;
const BLACK_RIGHT_ROOK_START = 28;

function isValidRookMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {
  if (board.items[end] == BOARD_BORDER) {
    return INVALID_BLOCKING;
  }

  const targetPieceColor = sign(board.items[end]);

  if (activeColor == targetPieceColor) {
    return INVALID_BLOCKING;
  }

  if (moveResultsInCheck(board, piece, start, end, activeColor)) {
    return board.items[end] == EMPTY
      ? INVALID
      : INVALID_BLOCKING
  }

  return board.items[end] == EMPTY
    ? VALID
    : VALID_BLOCKING
};


function generateRookMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < ORTHOGONAL_DIRECTIONS.length; i++) {
    const direction = ORTHOGONAL_DIRECTIONS[i];

    generateRookDirectionMoves(moves, board, activeColor, piece, start, direction);
  }
};

function generateRookDirectionMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, direction: i32): void {
  for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
    const end = start + direction * distance;

    switch (isValidRookMove(board, activeColor, piece, start, end)) {
      case VALID:
        moves.push(encodeMove(piece, start, end));
        break;

      case VALID_BLOCKING:
        moves.push(encodeMove(piece, start, end));
        return; // stop with this direction

      case INVALID:
        break; // skip this move, but continue in this direction

      case INVALID_BLOCKING:
        return; // stop with this direction
    }
  }
}

function generateQueenMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  // reuse move generators
  generateBishopMoves(moves, board, activeColor, piece, start);
  generateRookMoves(moves, board, activeColor, piece, start);
};


const KING_DIRECTIONS: Array<i32> = ORTHOGONAL_DIRECTIONS.concat(DIAGONAL_DIRECTIONS);
const WHITE_KING_START = 95;
const BLACK_KING_START = 25;

function isValidKingMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {
  if (board.items[end] == BOARD_BORDER) {
    return INVALID;
  }

  const targetPieceColor = sign(board.items[end]);

  if (activeColor == targetPieceColor) {
    return INVALID;
  }

  return moveResultsInCheck(board, piece, start, end, activeColor)
    ? INVALID
    : VALID;
};

function isValidWhiteSmallCastlingMove(board: Board): bool {
  return (board.items[WHITE_KING_START + 1] == EMPTY && board.items[WHITE_KING_START + 2] == EMPTY) &&
    !isAttacked(board, BLACK, WHITE_KING_START) &&
    !isAttacked(board, BLACK, WHITE_KING_START + 1) &&
    !isAttacked(board, BLACK, WHITE_KING_START + 2) &&
    !isAttacked(board, BLACK, WHITE_RIGHT_ROOK_START);
}

function isValidWhiteBigCastlingMove(board: Board): bool {
  return board.items[WHITE_KING_START - 1] == EMPTY && board.items[WHITE_KING_START - 2] == EMPTY &&
    board.items[WHITE_KING_START - 3] == EMPTY &&
    !isAttacked(board, BLACK, WHITE_KING_START) &&
    !isAttacked(board, BLACK, WHITE_KING_START - 1) &&
    !isAttacked(board, BLACK, WHITE_KING_START - 2) &&
    !isAttacked(board, BLACK, WHITE_KING_START - 3) &&
    !isAttacked(board, BLACK, WHITE_LEFT_ROOK_START);
}

function isValidBlackSmallCastlingMove(board: Board): bool {
  return board.items[BLACK_KING_START + 1] == EMPTY && board.items[BLACK_KING_START + 2] == EMPTY &&
    !isAttacked(board, WHITE, BLACK_KING_START) &&
    !isAttacked(board, WHITE, BLACK_KING_START + 1) &&
    !isAttacked(board, WHITE, BLACK_KING_START + 2) &&
    !isAttacked(board, WHITE, BLACK_RIGHT_ROOK_START);
}

function isValidBlackBigCastlingMove(board: Board): bool {
  return board.items[BLACK_KING_START - 1] == EMPTY && board.items[BLACK_KING_START - 2] == EMPTY && board.items[BLACK_KING_START - 3] == EMPTY &&
  !isAttacked(board, WHITE, BLACK_KING_START) &&
  !isAttacked(board, WHITE, BLACK_KING_START - 1) &&
  !isAttacked(board, WHITE, BLACK_KING_START - 2) &&
  !isAttacked(board, WHITE, BLACK_KING_START - 3) &&
  !isAttacked(board, WHITE, BLACK_LEFT_ROOK_START);
}

function generateKingMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i = 0; i < KING_DIRECTIONS.length; i++) {
    const end = start + KING_DIRECTIONS[i];
    if (isValidKingMove(board, activeColor, piece, start, end) == VALID) {
      moves.push(encodeMove(piece, start, end));
    }
  }

  if (activeColor == WHITE && start == WHITE_KING_START && !board.whiteKingMoved()) {
    if (!board.whiteRightRookMoved() && isValidWhiteSmallCastlingMove(board)) {
      moves.push(encodeMove(piece, start, start + 2));
    }

    if (!board.whiteLeftRookMoved() && isValidWhiteBigCastlingMove(board)) {
      moves.push(encodeMove(piece, start, start - 3));
    }

  } else if (activeColor == BLACK && start == BLACK_KING_START && !board.blackKingMoved()) {
    if (!board.blackRightRookMoved() && isValidBlackSmallCastlingMove(board)) {
      moves.push(encodeMove(piece, start, start + 2));
    }

    if (!board.blackLeftRookMoved() && isValidBlackBigCastlingMove(board)) {
      moves.push(encodeMove(piece, start, start - 3));
    }
  }
};


const EN_PASSANT_BIT = 1 << 31;

export function performEncodedMove(board: Board, encodedMove: i32): i32 {
  return performMove(board, decodePiece(encodedMove), decodeStartIndex(encodedMove), decodeEndIndex(encodedMove));
}

/** Applies the given move to the board.
 *
 * @returns The removed piece with the highest bit set to 1, if it was an en passant move.
 *
 */
export function performMove(board: Board, pieceId: i32, start: i32, end: i32): i32 {
  const pieceColor = sign(board.items[start]);

  let removedPiece = board.items[end];

  board.items[start] = EMPTY;

  board.clearEnPassentPossible();

  let isEnPassant: bool = false;

  if (pieceId == PAWN && board.items[end] == EMPTY) {

    // Special en passant handling
    if (abs(start - end) == 20) {
      board.setEnPassantPossible(start);

    } else if (abs(start - end) == 9) {
      removedPiece = board.items[start + pieceColor];
      board.items[start + pieceColor] = EMPTY;
      isEnPassant = true;

    } else if (abs(start - end) == 11) {
      removedPiece = board.items[start - pieceColor];
      board.items[start - pieceColor] = EMPTY;
      isEnPassant = true;

    }

  }

  board.items[end] = pieceId * pieceColor;

  if (pieceId == KING && pieceColor == WHITE) {
    board.updateKingPosition(WHITE, end);
    board.setWhiteKingMoved();

    // Special castling handling
    if (abs(start - end) == 2) {
      if (end == WHITE_KING_START + 2) {
        board.items[WHITE_KING_START + 1] = board.items[WHITE_RIGHT_ROOK_START];
        board.items[WHITE_RIGHT_ROOK_START] = EMPTY;
        board.setWhiteRightRookMoved();

      } else if (end == WHITE_KING_START - 2) {
        board.items[WHITE_KING_START - 1] = board.items[WHITE_LEFT_ROOK_START];
        board.items[WHITE_LEFT_ROOK_START] = EMPTY;
        board.setWhiteLeftRookMoved();

      }
    }

  } else if (pieceId == KING && pieceColor == BLACK) {
    board.updateKingPosition(BLACK, end);
    board.setBlackKingMoved();

    // Special castling handling
    if (abs(start - end) == 2) {
      if (end == BLACK_KING_START + 2) {
        board.items[BLACK_KING_START + 1] = board.items[BLACK_RIGHT_ROOK_START];
        board.items[BLACK_RIGHT_ROOK_START] = EMPTY;
        board.setBlackRightRookMoved();
      } else if (end == BLACK_KING_START - 2) {
        board.items[BLACK_KING_START - 1] = board.items[BLACK_LEFT_ROOK_START];
        board.items[BLACK_LEFT_ROOK_START] = EMPTY;
        board.setBlackLeftRookMoved();
      }
    }

  } else if (pieceId == ROOK && pieceColor == WHITE) {

    if (start == WHITE_LEFT_ROOK_START) {
      board.setWhiteLeftRookMoved();

    } else if (start == WHITE_RIGHT_ROOK_START) {
      board.setWhiteRightRookMoved();
    }

  } else if (pieceId == ROOK && pieceColor == BLACK) {

    if (start == BLACK_LEFT_ROOK_START) {
      board.setBlackLeftRookMoved();

    } else if (start == BLACK_RIGHT_ROOK_START) {
      board.setBlackRightRookMoved();

    }

  }

  if (isEnPassant) {
    return abs(removedPiece) | EN_PASSANT_BIT;
  } else {
    return abs(removedPiece);
  }
};


export function undoMove(board: Board, piece: i32, start: i32, end: i32, removedPieceId: i32, previousState: i32): void {
  board.setState(previousState);
  const pieceColor = sign(board.items[end]);
  board.items[start] = piece;

  const wasEnPassant = (removedPieceId & EN_PASSANT_BIT) != 0;
  if (wasEnPassant) {

    if (abs(start - end) == 9) {
      board.items[start + pieceColor] = removedPieceId & (EN_PASSANT_BIT - 1);
    } else if (abs(start - end) == 11) {
      board.items[start - pieceColor] = removedPieceId & (EN_PASSANT_BIT - 1);
    }

    board.items[end] = EMPTY;

  } else {
    board.items[end] = removedPieceId * (-pieceColor);

  }

  if (piece == KING) {
    board.updateKingPosition(WHITE, start);

    if (abs(start - end) == 2) {
      // Undo Castle
      if (end == WHITE_KING_START + 2) {
        board.items[WHITE_RIGHT_ROOK_START] = board.items[WHITE_KING_START + 1];
        board.items[WHITE_KING_START + 1] = EMPTY;

      } else if (end == WHITE_KING_START - 2) {
        board.items[WHITE_LEFT_ROOK_START] = board.items[WHITE_KING_START - 1];
        board.items[WHITE_KING_START - 1] = EMPTY;

      }
    }

  } else if (piece == -KING) {
    board.updateKingPosition(BLACK, start);

    if (abs(start - end) == 2) {
      // Undo Castle
      if (end == BLACK_KING_START + 2) {
        board.items[BLACK_RIGHT_ROOK_START] = board.items[BLACK_KING_START + 1];
        board.items[BLACK_KING_START + 1] = EMPTY;

      } else if (end == BLACK_KING_START - 2) {
        board.items[BLACK_LEFT_ROOK_START] = board.items[BLACK_KING_START - 1];
        board.items[BLACK_KING_START - 1] = EMPTY;

      }
    }

  }
};


function isInCheck(board: Board, activeColor: i32): bool {
  return isAttacked(board, -activeColor, board.findKingPosition(activeColor));
};


function moveResultsInCheck(board: Board, piece: i32, start: i32, end: i32, activeColor: i32): bool {
  const pieceId = abs(piece);
  const previousState = board.getState();
  const previousPiece = board.items[start]; // might be different from piece in case of pawn promotions

  const removedFigure = performMove(board, pieceId, start, end);
  const check = isInCheck(board, activeColor);

  undoMove(board, previousPiece, start, end, removedFigure, previousState);

  return check;
};


function isAttacked(board: Board, opponentColor: i32, pos: i32): bool {
  if (isAttackedByPawns(board, opponentColor, pos)) {
    return true;
  }

  // TODO: Additional optimizations: only check pieces that still exist, save piece positions in bit sets?

  if (isAttackedByKnights(board, opponentColor, pos)) {
    return true;
  }

  if (isAttackedDiagonally(board, opponentColor, pos)) {
    return true;
  }

  if (isAttackedOrthogonally(board, opponentColor, pos)) {
    return true;
  }

  return false;
};

function isAttackedByPawns(board: Board, opponentColor: i32, pos: i32): bool {
  if (board.items[pos + 9 * opponentColor] == PAWN * opponentColor) {
    return true;
  }

  if (board.items[pos + 11 * opponentColor] == PAWN * opponentColor) {
    return true;
  }

  return false;
}

function isAttackedByKnights(board: Board, opponentColor: i32, pos: i32): bool {
  for (let i: i32 = 0; i < KNIGHT_DIRECTIONS.length; i++) {
    const offset = KNIGHT_DIRECTIONS[i];
    if (board.items[pos + offset] == KNIGHT * opponentColor) {
      return true;
    }
  }

  return false;
}

function isAttackedDiagonally(board: Board, opponentColor: i32, pos: i32): bool {
  for (let i: i32 = 0; i < DIAGONAL_DIRECTIONS.length; i++) {
    const direction = DIAGONAL_DIRECTIONS[i];
    for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
      const piece = board.items[pos + direction * distance];
      if (piece == EMPTY) {
        continue;
      }

      if (piece == BOARD_BORDER) {
        break;
      }

      if (piece == BISHOP * opponentColor || piece == QUEEN * opponentColor) {
        return true;
      }

      if (distance == 1 && piece == KING * opponentColor) {
        return true;
      }

      break; // skip this direction => all other pieces block possible attacks
    }
  }

  return false;
}

function isAttackedOrthogonally(board: Board, opponentColor: i32, pos: i32): bool {
  for (let i: i32 = 0; i < ORTHOGONAL_DIRECTIONS.length; i++) {
    const direction = ORTHOGONAL_DIRECTIONS[i];
    for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
      const piece = board.items[pos + direction * distance];
      if (piece == EMPTY) {
        continue;
      }

      if (piece == BOARD_BORDER) {
        break;
      }

      if (piece == ROOK * opponentColor || piece == QUEEN * opponentColor) {
        return true;
      }

      if (distance == 1 && piece == KING * opponentColor) {
        return true;
      }

      break; // skip this direction => all other pieces block possible attacks
    }
  }

  return false;
}


export function isCheckMate(board: Board, activeColor: i32): bool {
  return (
    isInCheck(board, activeColor) &&
    generateMoves(board, activeColor).length == 0
  );
};

// Helper functions

export function encodeMove(piece: i32, start: i32, end: i32): i32 {
  return abs(piece) | (start << 3) | (end << 10);
}

export function decodePiece(encodedMove: i32): i32 {
  return encodedMove & 0x7;
}

export function decodeStartIndex(encodedMove: i32): i32 {
  return (encodedMove >> 3) & 0x7F;
}

export function decodeEndIndex(encodedMove: i32): i32 {
  return (encodedMove >> 10) & 0x7F;
}

