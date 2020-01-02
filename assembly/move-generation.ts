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
  BLACK_KING_START,
  BLACK_PAWNS_BASELINE_END,
  BLACK_PAWNS_BASELINE_START,
  Board,
  BOARD_BORDER,
  EMPTY,
  WHITE,
  WHITE_KING_START,
  WHITE_PAWNS_BASELINE_END,
  WHITE_PAWNS_BASELINE_START
} from './board';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from './pieces';
import { differentColor, sameColor, toInt32Array } from './util';


const MAX_MOVES = 218;

export function generateMoves(board: Board, activeColor: i32): Int32Array {
  const moves = new Int32Array(MAX_MOVES);

  let count = generatePieceMoves(moves, 0, board, PAWN * activeColor, activeColor, generatePawnMoves);
  count = generatePieceMoves(moves, count, board, KNIGHT * activeColor, activeColor, generateKnightMoves);
  count = generatePieceMoves(moves, count, board, BISHOP * activeColor, activeColor, generateBishopMoves);
  count = generatePieceMoves(moves, count, board, ROOK * activeColor, activeColor, generateRookMoves);
  count = generatePieceMoves(moves, count, board, QUEEN * activeColor, activeColor, generateQueenMoves);

  // King moves
  const pos = board.findKingPosition(activeColor);
  count = generateKingMoves(moves, count, board, activeColor, KING * activeColor, pos);

  return moves.subarray(0, count);
}


@inline
function generatePieceMoves(moves: Int32Array, count: i32, board: Board, piece: i32, activeColor: i32,
                            generate: (moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32) => i32): i32 {
  let bitboard = board.getBitBoard(piece + 6);

  while (bitboard != 0) {
    const bitPos: u64 = ctz(bitboard);
    bitboard ^= 1 << bitPos; // unset bit
    const pos = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
    count = generate(moves, count, board, activeColor, piece, pos);
  }

  return count;
}


// Generates and filters out any moves that would leave the own king in check.
export function generateFilteredMoves(board: Board, activeColor: i32): Int32Array {
  const moves = generateMoves(board, activeColor);
  const filteredMoves: Int32Array = new Int32Array(moves.length);

  let index = 0;
  for (let i = 0; i < moves.length; i++) {
    const startIndex = decodeStartIndex(moves[i]);
    if (moveResultsInCheck(board, decodePiece(moves[i]), startIndex, decodeEndIndex(moves[i]), activeColor )) {
      continue;
    }

    filteredMoves[index++] = moves[i];
  }

  return filteredMoves.subarray(0, index);
}


function generatePawnMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32): i32 {
  const moveDirection = -activeColor;

  if ((activeColor == WHITE && start < 39) || (activeColor == BLACK && start > 80)) {
    count = generateDiagonalPawnMove(moves, count, board, activeColor, piece, start, start + 9 * moveDirection, true);
    count = generateStraightPawnMove(moves, count, board, activeColor, piece, start, start + 10 * moveDirection, true);
    count = generateDiagonalPawnMove(moves, count, board, activeColor, piece, start, start + 11 * moveDirection, true);
    return count;
  }

  count = generateDiagonalPawnMove(moves, count, board, activeColor, piece, start, start + 9 * moveDirection, false);
  count = generateStraightPawnMove(moves, count, board, activeColor, piece, start, start + 10 * moveDirection, false);
  count = generateDiagonalPawnMove(moves, count, board, activeColor, piece, start, start + 11 * moveDirection, false);

  if (activeColor == WHITE && start >= WHITE_PAWNS_BASELINE_START && start <= WHITE_PAWNS_BASELINE_END) {
    count = generateStraightDoublePawnMove(moves, count, board, activeColor, piece, start, start + 20 * moveDirection);
  } else if (activeColor == BLACK && start >= BLACK_PAWNS_BASELINE_START && start <= BLACK_PAWNS_BASELINE_END) {
    count = generateStraightDoublePawnMove(moves, count, board, activeColor, piece, start, start + 20 * moveDirection);
  }

  return count;
};


function generateStraightPawnMove(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): i32 {
  if (!board.isEmpty(end)) {
    return count;
  }

  if (createPromotions) {
    unchecked(moves[count++] = encodeMove(KNIGHT, start, end));
    unchecked(moves[count++] = encodeMove(BISHOP, start, end));
    unchecked(moves[count++] = encodeMove(ROOK, start, end));
    unchecked(moves[count++] = encodeMove(QUEEN, start, end));

  } else {
    unchecked(moves[count++] = encodeMove(piece, start, end));

  }

  return count;
}

function generateStraightDoublePawnMove(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32, end: i32): i32 {
  if (!board.isEmpty(end)) {
    return count;
  }

  const direction = -activeColor;
  if (!board.isEmpty(start + direction * 10)) {
    return count;
  }

  unchecked(moves[count++] = encodeMove(piece, start, end));

  return count;
}

function generateDiagonalPawnMove(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): i32 {
  const targetPiece = board.getItem(end);
  if (targetPiece == BOARD_BORDER) {
    return count;
  }

  if (targetPiece == EMPTY) {
    if (!board.isEnPassentPossible(activeColor, end)) {
      return count;
    }
  } else if (!differentColor(targetPiece, activeColor)) {
    return count;
  }

  if (createPromotions) {
    unchecked(moves[count++] = encodeMove(KNIGHT, start, end));
    unchecked(moves[count++] = encodeMove(BISHOP, start, end));
    unchecked(moves[count++] = encodeMove(ROOK, start, end));
    unchecked(moves[count++] = encodeMove(QUEEN, start, end));

  } else {
    unchecked(moves[count++] = encodeMove(piece, start, end));

  }

  return count;
}

export const KNIGHT_DIRECTIONS: Int32Array = toInt32Array([21, 19, 12, 8, -12, -21, -19, -8]);

function generateKnightMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32): i32 {
  for (let i: i32 = 0; i < KNIGHT_DIRECTIONS.length; i++) {
    const offset = unchecked(KNIGHT_DIRECTIONS[i]);

    const end = start + offset;
    if (board.isBorder(end)) {
      continue;
    }

    const targetPiece = board.getItem(end);
    if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
      continue;
    }

    unchecked(moves[count++] = encodeMove(piece, start, start + offset));
  }
  return count;
};


@inline
function generateBishopMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32): i32 {
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, 9);
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, 11);
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, -9);
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, -11);
  return count;
};

@inline
function generateRookMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32): i32 {
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, 1);
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, 10);
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, -1);
  count = generateSlidingPieceMoves(moves, count, board, activeColor, piece, start, -10);
  return count;
};


const MAX_FIELD_DISTANCE: i32 = 7; // maximum distance between two fields on the board

function generateSlidingPieceMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32, direction: i32): i32 {
  for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
    const end = start + direction * distance;

    const targetPiece = board.getItem(end);
    if (targetPiece == EMPTY) {
      unchecked(moves[count++] = encodeMove(piece, start, end));
      continue;
    }

    if (sameColor(targetPiece, activeColor)) {
      return count;
    }

    if (targetPiece == BOARD_BORDER) {
      return count;
    }

    unchecked(moves[count++] = encodeMove(piece, start, end));
    return count;
  }

  return count;
}

function generateQueenMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32): i32 {
  // reuse move generators
  count = generateBishopMoves(moves, count, board, activeColor, piece, start);
  return generateRookMoves(moves, count, board, activeColor, piece, start);
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

const KING_DIRECTIONS: Int32Array = toInt32Array([1, 10, -1, -10, 9, 11, -9, -11]);

function generateKingMoves(moves: Int32Array, count: i32, board: Board, activeColor: i32, piece: i32, start: i32): i32 {
  for (let i = 0; i < KING_DIRECTIONS.length; i++) {
    const end = start + unchecked(KING_DIRECTIONS[i]);

    const targetPiece = board.getItem(end);
    if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
      continue;
    }

    if (targetPiece == BOARD_BORDER) {
      continue;
    }

    unchecked(moves[count++] = encodeMove(piece, start, end));
  }

  if (activeColor == WHITE && start == WHITE_KING_START && !board.whiteKingMoved()) {
    if (!board.whiteRightRookMoved() && isValidWhiteSmallCastlingMove(board)) {
      unchecked(moves[count++] = encodeMove(piece, start, start + 2));
    }

    if (!board.whiteLeftRookMoved() && isValidWhiteBigCastlingMove(board)) {
      unchecked(moves[count++] = encodeMove(piece, start, start - 2));
    }

  } else if (activeColor == BLACK && start == BLACK_KING_START && !board.blackKingMoved()) {
    if (!board.blackRightRookMoved() && isValidBlackSmallCastlingMove(board)) {
      unchecked(moves[count++] = encodeMove(piece, start, start + 2));
    }

    if (!board.blackLeftRookMoved() && isValidBlackBigCastlingMove(board)) {
      unchecked(moves[count++] = encodeMove(piece, start, start - 2));
    }
  }

  return count;
};


export function isInCheck(board: Board, activeColor: i32): bool {
  return isAttacked(board, -activeColor, board.findKingPosition(activeColor));
};


export function moveResultsInCheck(board: Board, pieceId: i32, start: i32, end: i32, activeColor: i32): bool {
  const previousPiece = board.getItem(start); // might be different from piece in case of pawn promotions

  const removedFigure = board.performMove(pieceId, start, end);
  const check = isInCheck(board, activeColor);

  board.undoMove(previousPiece, start, end, removedFigure);

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


function hasNoValidMoves(board: Board, activeColor: i32, moves: Int32Array): bool {
  for (let i = 0; i < moves.length; i++) {
    const move = unchecked(moves[i]);
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

export function logMoves(moves: Int32Array): void {
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
