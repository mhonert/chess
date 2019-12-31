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
import { differentColor, sameColor } from './util';


export function generateMoves(board: Board, activeColor: i32): Array<i32> {
  const moves = new Array<i32>();

  generatePieceMoves(moves, board, PAWN * activeColor, activeColor, generatePawnMoves);
  generatePieceMoves(moves, board, KNIGHT * activeColor, activeColor, generateKnightMoves);
  generatePieceMoves(moves, board, BISHOP * activeColor, activeColor, generateBishopMoves);
  generatePieceMoves(moves, board, ROOK * activeColor, activeColor, generateRookMoves);
  generatePieceMoves(moves, board, QUEEN * activeColor, activeColor, generateQueenMoves);

  // King moves
  const pos = board.findKingPosition(activeColor);
  generateKingMoves(moves, board, activeColor, KING * activeColor, pos);

  return moves;
}

@inline
function generatePieceMoves(moves: Array<i32>, board: Board, piece: i32, activeColor: i32,
                            generate: (moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32) => void): void {
  let bitboard = board.getBitBoard(piece + 6);

  while (bitboard != 0) {
    const bitPos: u64 = ctz(bitboard);
    bitboard ^= 1 << bitPos; // unset bit
    const pos = u32(21 + (bitPos & 7) + ((bitPos >> 3) * 10)); // calculate letter board position from bit index
    generate(moves, board, activeColor, piece, pos);
  }
}


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
    generateStraightDoublePawnMove(moves, board, activeColor, piece, start, start + 20 * moveDirection);
  } else if (activeColor == BLACK && start >= BLACK_PAWNS_BASELINE_START && start <= BLACK_PAWNS_BASELINE_END) {
    generateStraightDoublePawnMove(moves, board, activeColor, piece, start, start + 20 * moveDirection);
  }
};

function generateStraightPawnMove(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): void {
  if (!board.isEmpty(end)) {
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

function generateStraightDoublePawnMove(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, end: i32): void {
  if (!board.isEmpty(end)) {
    return;
  }

  const direction = -activeColor;
  if (!board.isEmpty(start + direction * 10)) {
    return;
  }

  moves.push(encodeMove(piece, start, end));
}

function generateDiagonalPawnMove(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, end: i32, createPromotions: bool): void {
  const targetPiece = board.getItem(end);
  if (targetPiece == BOARD_BORDER) {
    return;
  }

  if (targetPiece == EMPTY) {
    if (!board.isEnPassentPossible(activeColor, end)) {
      return;
    }
  } else if (!differentColor(targetPiece, activeColor)) {
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

export const KNIGHT_DIRECTIONS: Array<i32> = [21, 19, 12, 8, -12, -21, -19, -8];

function generateKnightMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < KNIGHT_DIRECTIONS.length; i++) {
    const offset = KNIGHT_DIRECTIONS[i];

    const end = start + offset;
    if (board.isBorder(end)) {
      continue;
    }

    const targetPiece = board.getItem(end);
    if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
      continue;
    }

    moves.push(encodeMove(piece, start, start + offset));
  }
};


const DIAGONAL_DIRECTIONS: Array<i32> = [9, 11, -9, -11];
const MAX_FIELD_DISTANCE: i32 = 7; // maximum distance between two fields on the board

@inline
function generateBishopMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < DIAGONAL_DIRECTIONS.length; i++) {
    const direction = DIAGONAL_DIRECTIONS[i];
    generateSlidingPieceMoves(moves, board, activeColor, piece, start, direction);
  }
};

const ORTHOGONAL_DIRECTIONS: Array<i32> = [1, 10, -1, -10];

@inline
function generateRookMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < ORTHOGONAL_DIRECTIONS.length; i++) {
    const direction = ORTHOGONAL_DIRECTIONS[i];

    generateSlidingPieceMoves(moves, board, activeColor, piece, start, direction);
  }
};

function generateSlidingPieceMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32, direction: i32): void {
  for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
    const end = start + direction * distance;

    const targetPiece = board.getItem(end);
    if (targetPiece == EMPTY) {
      moves.push(encodeMove(piece, start, end));
      continue;
    }

    if (sameColor(targetPiece, activeColor)) {
      return;
    }

    if (targetPiece == BOARD_BORDER) {
      return;
    }

    moves.push(encodeMove(piece, start, end));
    return;
  }
}

function generateQueenMoves(moves: Array<i32>, board: Board, activeColor: i32, piece: i32, start: i32): void {
  // reuse move generators
  generateBishopMoves(moves, board, activeColor, piece, start);
  generateRookMoves(moves, board, activeColor, piece, start);
};


const KING_DIRECTIONS: Array<i32> = ORTHOGONAL_DIRECTIONS.concat(DIAGONAL_DIRECTIONS);

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

    const targetPiece = board.getItem(end);
    if (targetPiece != EMPTY && sameColor(targetPiece, activeColor)) {
      continue;
    }

    if (targetPiece == BOARD_BORDER) {
      continue;
    }

    moves.push(encodeMove(piece, start, end));
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
