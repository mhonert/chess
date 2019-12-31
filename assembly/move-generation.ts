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
  BLACK, BLACK_LEFT_ROOK_START,
  BLACK_PAWNS_BASELINE_END,
  BLACK_PAWNS_BASELINE_START, BLACK_RIGHT_ROOK_START,
  Board,
  BOARD_BORDER,
  EMPTY,
  WHITE, WHITE_LEFT_ROOK_START,
  WHITE_PAWNS_BASELINE_END,
  WHITE_PAWNS_BASELINE_START, WHITE_RIGHT_ROOK_START
} from './board';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from './pieces';
import { differentColor, sameColor, sign } from './util';


export function generateMoves(board: Board, activeColor: i32): Array<i32> {
  const moves = new Array<i32>();

  for (let i = 21; i <= 98; i++) {
    const item = board.getItem(i);

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


// Generates and filters out any moves that would leave the own king in check.
export function generateFilteredMoves(board: Board, activeColor: i32): Array<i32> {
  const moves = generateMoves(board, activeColor);
  const filteredMoves: Array<i32> = new Array<i32>();

  for (let i = 0; i < moves.length; i++) {
    const startIndex = decodeStartIndex(moves[i]);
    if (moveResultsInCheck(board, decodePiece(moves[i]), startIndex, decodeEndIndex(moves[i]), activeColor )) {
      continue;
    }

    filteredMoves.push(moves[i]);
  }

  return filteredMoves;
}


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

  if (board.isBorder(end)) {
    return INVALID;
  }

  const targetPiece = board.getItem(end);

  if (targetPiece != EMPTY) {
    return INVALID;
  }

  const direction = -activeColor;

  // 1 field move
  if (end - start == 10 * direction) {
    return VALID;
  }

  // 2 fields move from base line
  const noObstacleInBetween = board.isEmpty(start + direction * 10);
  if (end - start == 20 * direction && noObstacleInBetween) {
      return VALID;
  }

  return INVALID;
};

function isValidDiagonalPawnMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {

  if (board.isBorder(end)) {
    return INVALID;
  }

  const targetPiece = board.getItem(end);

  // Diagonal => hit other piece
  if (targetPiece != EMPTY) {
    if (differentColor(targetPiece, activeColor)) {
      return VALID;
    }
  } else if (board.isEnPassentPossible(activeColor, end)) {
    return VALID;
  }

  return INVALID;
};


export const KNIGHT_DIRECTIONS: Array<i32> = [21, 19, 12, 8, -12, -21, -19, -8];

function isValidKnightMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {
  // General assumption is that the move already follows the knight move pattern

  if (board.isBorder(end)) {
    return INVALID;
  }

  const targetPiece = board.getItem(end);
  if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
    return INVALID;
  }

  return VALID;
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
  const targetPiece = board.getItem(end);
  if (targetPiece == BOARD_BORDER) {
    return INVALID_BLOCKING;
  }

  if (targetPiece == EMPTY) {
    return VALID;
  }

  if (sameColor(targetPiece, activeColor)) {
    return INVALID_BLOCKING;
  }

  return VALID_BLOCKING;
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

function isValidRookMove(board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {
  const targetPiece = board.getItem(end);
  if (targetPiece == BOARD_BORDER) {
    return INVALID_BLOCKING;
  }

  if (targetPiece == EMPTY) {
    return VALID;
  }

  if (sameColor(targetPiece, activeColor)) {
    return INVALID_BLOCKING;
  }

  return VALID_BLOCKING;
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
  const targetPiece = board.getItem(end);
  if (targetPiece == BOARD_BORDER) {
    return INVALID;
  }

  if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
    return INVALID;
  }

  return VALID;

};

function isValidWhiteSmallCastlingMove(board: Board): bool {
  return (board.isEmpty(WHITE_KING_START + 1) && board.isEmpty(WHITE_KING_START + 2)) &&
    !isAttacked(board, BLACK, WHITE_KING_START) &&
    !isAttacked(board, BLACK, WHITE_KING_START + 1) &&
    !isAttacked(board, BLACK, WHITE_KING_START + 2);
}

function isValidWhiteBigCastlingMove(board: Board): bool {
  return board.isEmpty(WHITE_KING_START - 1) && board.isEmpty(WHITE_KING_START - 2) &&
    board.isEmpty(WHITE_KING_START - 3) &&
    !isAttacked(board, BLACK, WHITE_KING_START) &&
    !isAttacked(board, BLACK, WHITE_KING_START - 1) &&
    !isAttacked(board, BLACK, WHITE_KING_START - 2);
}

function isValidBlackSmallCastlingMove(board: Board): bool {
  return board.isEmpty(BLACK_KING_START + 1) && board.isEmpty(BLACK_KING_START + 2) &&
    !isAttacked(board, WHITE, BLACK_KING_START) &&
    !isAttacked(board, WHITE, BLACK_KING_START + 1) &&
    !isAttacked(board, WHITE, BLACK_KING_START + 2);
}

function isValidBlackBigCastlingMove(board: Board): bool {
  return board.isEmpty(BLACK_KING_START - 1) && board.isEmpty(BLACK_KING_START - 2) && board.isEmpty(BLACK_KING_START - 3) &&
  !isAttacked(board, WHITE, BLACK_KING_START) &&
  !isAttacked(board, WHITE, BLACK_KING_START - 1) &&
  !isAttacked(board, WHITE, BLACK_KING_START - 2);
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
      moves.push(encodeMove(piece, start, start - 2));
    }

  } else if (activeColor == BLACK && start == BLACK_KING_START && !board.blackKingMoved()) {
    if (!board.blackRightRookMoved() && isValidBlackSmallCastlingMove(board)) {
      moves.push(encodeMove(piece, start, start + 2));
    }

    if (!board.blackLeftRookMoved() && isValidBlackBigCastlingMove(board)) {
      moves.push(encodeMove(piece, start, start - 2));
    }
  }
};


const EN_PASSANT_BIT = 1 << 31;

export function performEncodedMove(board: Board, encodedMove: i32): i32 {
  return performMove(board, decodePiece(encodedMove), decodeStartIndex(encodedMove), decodeEndIndex(encodedMove));
}

/** Applies the given move to the board.
 *
 * @returns The removed piece ID or the highest bit set to 1, if it was an en passant move.
 *
 */
export function performMove(board: Board, pieceId: i32, start: i32, end: i32): i32 {
  board.storeState();
  const pieceColor = sign(board.getItem(start));
  board.increaseHalfMoveCount();

  let removedPiece = board.getItem(end) != EMPTY ? board.removePiece(end) : EMPTY;

  board.removePiece(start);

  board.clearEnPassentPossible();

  let isEnPassant: bool = false;

  if (pieceId == PAWN) {
    board.resetHalfMoveClock();

    if (removedPiece == EMPTY) {

      // Special en passant handling
      if (abs(start - end) == 20) {
        board.setEnPassantPossible(start);

      } else if (abs(start - end) == 9) {
        removedPiece = board.removePiece(start + pieceColor);
        isEnPassant = true;

      } else if (abs(start - end) == 11) {
        removedPiece = board.removePiece(start - pieceColor);
        isEnPassant = true;

      }
    }

  } else if (removedPiece != EMPTY) {
    board.resetHalfMoveClock();

  }

  board.addPiece(pieceColor, pieceId, end);

  if (pieceId == KING && pieceColor == WHITE) {
    board.updateKingPosition(WHITE, end);
    board.setWhiteKingMoved();

    // Special castling handling
    if (abs(start - end) == 2) {
      if (end == WHITE_KING_START + 2) {
        board.removePiece(WHITE_RIGHT_ROOK_START);
        board.addPiece(pieceColor, ROOK, WHITE_KING_START + 1);

      } else if (end == WHITE_KING_START - 2) {
        board.removePiece(WHITE_LEFT_ROOK_START);
        board.addPiece(pieceColor, ROOK, WHITE_KING_START - 1);

      }
    }

  } else if (pieceId == KING && pieceColor == BLACK) {
    board.updateKingPosition(BLACK, end);
    board.setBlackKingMoved();

    // Special castling handling
    if (abs(start - end) == 2) {
      if (end == BLACK_KING_START + 2) {
        board.removePiece(BLACK_RIGHT_ROOK_START);
        board.addPiece(pieceColor, ROOK, BLACK_KING_START + 1);
      } else if (end == BLACK_KING_START - 2) {
        board.removePiece(BLACK_LEFT_ROOK_START);
        board.addPiece(pieceColor, ROOK, BLACK_KING_START - 1);
      }
    }
  }

  if (isEnPassant) {
    return EN_PASSANT_BIT;
  } else {
    return abs(removedPiece);
  }
};


export function undoMove(board: Board, piece: i32, start: i32, end: i32, removedPieceId: i32): void {
  const pieceColor = sign(piece);
  board.removePiece(end);
  board.addPiece(pieceColor, abs(piece), start);

  if (removedPieceId == EN_PASSANT_BIT) {

    if (abs(start - end) == 9) {
      board.addPiece(-pieceColor, PAWN, start + pieceColor);
    } else if (abs(start - end) == 11) {
      board.addPiece(-pieceColor, PAWN, start - pieceColor);
    }

  } else if (removedPieceId != EMPTY) {
    board.addPiece(-pieceColor, removedPieceId, end);

  }

  if (piece == KING) {
    board.updateKingPosition(WHITE, start);

    if (abs(start - end) == 2) {
      // Undo Castle
      if (end == WHITE_KING_START + 2) {
        board.removePiece(WHITE_KING_START + 1);
        board.addPiece(pieceColor, ROOK, WHITE_RIGHT_ROOK_START);

      } else if (end == WHITE_KING_START - 2) {
        board.removePiece(WHITE_KING_START - 1);
        board.addPiece(pieceColor, ROOK, WHITE_LEFT_ROOK_START);

      }
    }

  } else if (piece == -KING) {
    board.updateKingPosition(BLACK, start);

    if (abs(start - end) == 2) {
      // Undo Castle
      if (end == BLACK_KING_START + 2) {
        board.removePiece(BLACK_KING_START + 1);
        board.addPiece(pieceColor, ROOK, BLACK_RIGHT_ROOK_START);

      } else if (end == BLACK_KING_START - 2) {
        board.removePiece(BLACK_KING_START - 1);
        board.addPiece(pieceColor, ROOK, BLACK_LEFT_ROOK_START);

      }
    }

  }

  board.restoreState();
};


export function isInCheck(board: Board, activeColor: i32): bool {
  return isAttacked(board, -activeColor, board.findKingPosition(activeColor));
};


export function moveResultsInCheck(board: Board, pieceId: i32, start: i32, end: i32, activeColor: i32): bool {
  const previousPiece = board.getItem(start); // might be different from piece in case of pawn promotions

  const removedFigure = performMove(board, pieceId, start, end);
  const check = isInCheck(board, activeColor);

  undoMove(board, previousPiece, start, end, removedFigure);

  return check;
};


function isAttacked(board: Board, opponentColor: i32, pos: i32): bool {
  if (isAttackedByPawns(board, opponentColor, pos)) {
    return true;
  }

  if (board.isKnightAttacked(opponentColor, pos)) {
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
  if (board.getItem(pos + 9 * opponentColor) == PAWN * opponentColor) {
    return true;
  }

  if (board.getItem(pos + 11 * opponentColor) == PAWN * opponentColor) {
    return true;
  }

  return false;
}

export function isAttackedDiagonally(board: Board, opponentColor: i32, pos: i32): bool {
  const kingDistance = abs(board.findKingPosition(opponentColor) - pos);
  if (kingDistance == 9 || kingDistance == 11) {
    return true;
  }

  const diaUpAttack = board.isDiagonallyUpAttacked(opponentColor, pos);

  if (diaUpAttack < 0) {
    if (isAttackedInDirection(board, BISHOP, opponentColor, pos, diaUpAttack)) {
      return true;
    }
  } else if (diaUpAttack > 0) {
    if (isAttackedInDirection(board, BISHOP, opponentColor, pos, diaUpAttack) || isAttackedInDirection(board, BISHOP, opponentColor, pos, -diaUpAttack)) {
      return true;
    }
  }

  const diaDownAttack = board.isDiagonallyDownAttacked(opponentColor, pos);

  if (diaDownAttack < 0) {
    return isAttackedInDirection(board, BISHOP, opponentColor, pos, diaDownAttack);
  } else if (diaDownAttack > 0) {
    return isAttackedInDirection(board, BISHOP, opponentColor, pos, diaDownAttack) || isAttackedInDirection(board, BISHOP, opponentColor, pos, -diaDownAttack);

  }

  return false;
}


function isAttackedInDirection(board: Board, slidingPiece: i32, opponentColor: i32, pos: i32, direction: i32): bool {
  const opponentPiece = slidingPiece * opponentColor;
  const opponentQueen = QUEEN * opponentColor;

  for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
    pos += direction
    const piece = board.getItem(pos);
    if (piece == EMPTY) {
      continue;
    }

    if (piece == opponentPiece || piece == opponentQueen) {
      return true;
    }

    return false;

  }

  return false;
}

function isAttackedOrthogonally(board: Board, opponentColor: i32, pos: i32): bool {
  const kingDistance = abs(board.findKingPosition(opponentColor) - pos);
  if (kingDistance == 1 || kingDistance == 10) {
    return true;
  }

  const horAttack = board.isHorizontallyAttacked(opponentColor, pos);
  if (horAttack < 0) {
    if (isAttackedInDirection(board, ROOK, opponentColor, pos, horAttack)) {
      return true;
    }
  } else if (horAttack > 0) {
    if (isAttackedInDirection(board, ROOK, opponentColor, pos, horAttack) || isAttackedInDirection(board, ROOK, opponentColor, pos, -horAttack)) {
      return true;
    }
  }

  const verAttack = board.isVerticallyAttacked(opponentColor, pos);
  if (verAttack < 0) {
    return isAttackedInDirection(board, ROOK, opponentColor, pos, verAttack);
  } else if (verAttack > 0) {
    return isAttackedInDirection(board, ROOK, opponentColor, pos, verAttack) || isAttackedInDirection(board, ROOK, opponentColor, pos, -verAttack);

  }

  return false;
}


export function isCheckMate(board: Board, activeColor: i32): bool {
  return isInCheck(board, activeColor) && hasNoValidMoves(board, activeColor, generateMoves(board, activeColor));
}


function hasNoValidMoves(board: Board, activeColor: i32, moves: Array<i32>): bool {
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!moveResultsInCheck(board, decodePiece(move), decodeStartIndex(move), decodeEndIndex(move), activeColor)) {
      return false;
    }
  }
  return true;
}


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

export function logMoves(moves: Array<i32>): void {
  trace("# of moves:", 1, moves.length);

  for (let i = 0; i < moves.length; i++) {
    logMove(moves[i]);
  }
}

export function logMove(move: i32, prefix: string = ""): void {

  const piece = decodePiece(move);
  const start = decodeStartIndex(move);
  const end = decodeEndIndex(move);
  trace(prefix + " - Move " + piece.toString() + " from " + start.toString() + " to " + end.toString());
}
