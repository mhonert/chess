/*
 * Chess App using React and Web Workers
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
  blackKingMoved,
  blackLeftRookMoved,
  blackRightRookMoved,
  BOARD_BORDER,
  getState, isEnPassentPossible,
  setBlackKingMoved,
  setBlackLeftRookMoved,
  setBlackRightRookMoved,
  setWhiteKingMoved,
  setWhiteLeftRookMoved,
  setWhiteRightRookMoved,
  WHITE,
  whiteKingMoved,
  whiteLeftRookMoved,
  whiteRightRookMoved
} from './board';
import { BISHOP, KNIGHT, PAWN, pieces, QUEEN, ROOK } from './pieces';


function generatePawnMoves(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32): void {
  const moveDirection = -activeColor;

  if ((activeColor == WHITE && start < 39) || (activeColor == BLACK && start > 80)) {
    generatePromotionPawnMove(moves, board, activeColor, piece, start, start + 9 * moveDirection);
    generatePromotionPawnMove(moves, board, activeColor, piece, start, start + 10 * moveDirection);
    generatePromotionPawnMove(moves, board, activeColor, piece, start, start + 11 * moveDirection);
    return;
  }

  generateStandardPawnMove(moves, board, activeColor, piece, start, start + 9 * moveDirection);
  generateStandardPawnMove(moves, board, activeColor, piece, start, start + 10 * moveDirection);
  generateStandardPawnMove(moves, board, activeColor, piece, start, start + 11 * moveDirection);
  generateStandardPawnMove(moves, board, activeColor, piece, start, start + 20 * moveDirection);
};

function generateStandardPawnMove(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32, end: i32): void {
  if (!isValidPawnMove(board, activeColor, piece, start, end,false)) {
    return;
  }

  moves.push(encodeMove(piece, start, end));
}

function generatePromotionPawnMove(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32, end: i32): void {
  if (!isValidPawnMove(board, activeColor, piece, start, end,false)) {
    return;
  }

  moves.push(encodeMove(KNIGHT, start, end));
  moves.push(encodeMove(BISHOP, start, end));
  moves.push(encodeMove(ROOK, start, end));
  moves.push(encodeMove(QUEEN, start, end));
}

function isValidPawnMove(
  board: Array<i32>,
  activeColor: i32,
  piece: i32,
  start: i32,
  end: i32,
  ignoreCheck: bool = false
): bool {
  if (board[end] == BOARD_BORDER) {
    return false;
  }

  const pieceColor: i32 = sign(board[start]);
  if (activeColor != pieceColor) {
    return false;
  }

  const targetPiece = board[end];
  const targetPieceColor: i32 = sign(targetPiece);

  if (pieceColor == targetPieceColor) {
    return false;
  }

  // if (
  //   !ignoreCheck &&
  //   moveResultsInCheck(board, { piece, start, end }, activeColor)
  // ) {
  //   return false;
  // }

  const direction = -pieceColor;

  // Horizontal => 1 field move
  if (end - start == 10 * direction && board[end] == 0) {
    return true;
  }

  // Horizontal => 2 fields from base line
  const baseLineStart = pieceColor == WHITE ? 81 : 31;
  const baseLineEnd = pieceColor == WHITE ? 88 : 38;

  const isBaseLine = start >= baseLineStart && start <= baseLineEnd;
  const noObstacleInBetween = board[start + direction * 10] == 0;
  if (
    end - start == 20 * direction &&
    isBaseLine &&
    noObstacleInBetween &&
    board[end] == 0
  ) {
    return true;
  }

  // Diagonal => hit other piece
  if (
    (end - start == 11 * direction || end - start == 9 * direction) &&
    board[end] != 0
  ) {
    return true;
  }

  if (
    (end - start == 11 * direction || end - start == 9 * direction) &&
    board[end] == 0 &&
    isEnPassentPossible(board, pieceColor, end)
  ) {
    return true;
  }

  return false;
};

export const KNIGHT_DIRECTIONS: Array<i32> = [21, 19, 12, 8, -12, -21, -19, -8];

function isValidKnightMove(
  board: Array<i32>,
  activeColor: i32,
  piece: i32,
  start: i32,
  end: i32,
  ignoreCheck: bool = false
): bool {

  // General assumption is that the move already follows the knight move pattern

  if (board[end] == BOARD_BORDER) {
    return false;
  }

  const pieceColor = Math.sign(board[start]);
  if (activeColor != pieceColor) {
    return false;
  }

  const targetPieceColor = Math.sign(board[end]);

  if (pieceColor == targetPieceColor) {
    return false;
  }

  // if (
  //   !ignoreCheck &&
  //   moveResultsInCheck(board, { piece, start, end }, activeColor)
  // ) {
  //   return false;
  // }

  return true;
};

function generateKnightMoves(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < KNIGHT_DIRECTIONS.length; i++) {
    const offset = KNIGHT_DIRECTIONS[i];
    if (isValidKnightMove(board, activeColor, piece, start, start + offset)) {
      moves.push(encodeMove(piece, start, start + offset));
    }
  }
};


const DIAGONAL_DIRECTIONS: Array<i32> = [9, 11, -9, -11];
const MAX_FIELD_DISTANCE: i32 = 7; // maximum distance between two fields on the board

function isValidBishopMove(
  board: Array<i32>,
  activeColor: i32,
  piece: i32,
  start: i32,
  end: i32,
  ignoreCheck: bool = false
): bool {
  if (board[end] == BOARD_BORDER) {
    return false;
  }

  const pieceColor = sign(board[start]);
  if (activeColor != pieceColor) {
    return false;
  }

  const targetPieceColor = sign(board[end]);

  if (pieceColor == targetPieceColor) {
    return false;
  }

  // if (
  //   !ignoreCheck &&
  //   moveResultsInCheck(board, { piece, start, end }, activeColor)
  // ) {
  //   return false;
  // }

  return true;
};

function generateBishopMoves(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < DIAGONAL_DIRECTIONS.length; i++) {
    const direction = DIAGONAL_DIRECTIONS[i];

    for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
      const end = start + direction * distance;

      if (isValidBishopMove(board, activeColor, piece, start, end, false)) {
        moves.push(encodeMove(piece, start, end));

      } else {
        break;

      }

      if (board[end] !== 0) {
        // path blocked by piece
        break;
      }
    }

  }
};


const ORTHOGONAL_DIRECTIONS: Array<i32> = [1, 10, -1, -10];

function isValidRookMove(
  board: Array<i32>,
  activeColor: i32,
  piece: i32,
  start: i32,
  end: i32,
  ignoreCheck: bool = false
): bool {
  if (board[end] == BOARD_BORDER) {
    return false;
  }

  const pieceColor = sign(board[start]);
  if (activeColor != pieceColor) {
    return false;
  }

  const targetPieceColor = sign(board[end]);

  if (pieceColor == targetPieceColor) {
    return false;
  }

  // if (
  //   !ignoreCheck &&
  //   moveResultsInCheck(board, { piece, start, end }, activeColor)
  // ) {
  //   return false;
  // }

  return true;
};


function generateRookMoves(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32): void {
  for (let i: i32 = 0; i < ORTHOGONAL_DIRECTIONS.length; i++) {
    const direction = ORTHOGONAL_DIRECTIONS[i];

    for (let distance: i32 = 1; distance <= MAX_FIELD_DISTANCE; distance++) {
      const end = start + direction * distance;

      if (isValidRookMove(board, activeColor, piece, start, end, false)) {
        moves.push(encodeMove(piece, start, end));

      } else {
        break;

      }

      if (board[end] !== 0) {
        // path blocked by piece
        break;
      }
    }

  }
};


function generateQueenMoves(moves: Array<i32>, board: Array<i32>, activeColor: i32, piece: i32, start: i32): void {
  generateBishopMoves(moves, board, activeColor, piece, start);
  generateRookMoves(moves, board, activeColor, piece, start);
};

//
// const KING_DIRECTIONS = ORTHOGONAL_DIRECTIONS.concat(DIAGONAL_DIRECTIONS);
//
// const isValidKingMove = (
//   board,
//   activeColor,
//   piece,
//   start,
//   end,
//   ignoreCheck = false
// ) => {
//   if (board[end] == BOARD_BORDER) {
//     return false;
//   }
//
//   const pieceColor = Math.sign(board[start]);
//   if (activeColor != pieceColor) {
//     return false;
//   }
//
//   const targetPieceColor = Math.sign(board[end]);
//
//   if (pieceColor == targetPieceColor) {
//     return false;
//   }
//
//   // White: Small castle
//   if (!whiteKingMoved(board)) {
//     if (
//       !whiteRightRookMoved(board) &&
//       activeColor == WHITE &&
//       start == 95 &&
//       end == 97 &&
//       board[96] == 0 &&
//       board[97] == 0 &&
//       !isAttacked(board, -activeColor, 95) &&
//       !isAttacked(board, -activeColor, 96) &&
//       !isAttacked(board, -activeColor, 97)
//     ) {
//       return true;
//     }
//
//     // White: Big castle
//     if (
//       !whiteLeftRookMoved(board) &&
//       activeColor == WHITE &&
//       start == 95 &&
//       end == 93 &&
//       board[94] == 0 &&
//       board[93] == 0 &&
//       board[92] == 0 &&
//       !isAttacked(board, -activeColor, 95) &&
//       !isAttacked(board, -activeColor, 94) &&
//       !isAttacked(board, -activeColor, 93) &&
//       !isAttacked(board, -activeColor, 92)
//     ) {
//       return true;
//     }
//   }
//
//   if (!blackKingMoved(board)) {
//     // Black: Small castle
//     if (
//       !blackRightRookMoved(board) &&
//       activeColor == BLACK &&
//       start == 25 &&
//       end == 27 &&
//       board[26] == 0 &&
//       board[27] == 0 &&
//       !isAttacked(board, -activeColor, 25) &&
//       !isAttacked(board, -activeColor, 26) &&
//       !isAttacked(board, -activeColor, 27)
//     ) {
//       return true;
//     }
//
//     // Black: Big castle
//     if (
//       !blackLeftRookMoved(board) &&
//       activeColor == BLACK &&
//       start == 25 &&
//       end == 23 &&
//       board[24] == 0 &&
//       board[23] == 0 &&
//       board[22] == 0 &&
//       !isAttacked(board, -activeColor, 25) &&
//       !isAttacked(board, -activeColor, 24) &&
//       !isAttacked(board, -activeColor, 23) &&
//       !isAttacked(board, -activeColor, 22)
//     ) {
//       return true;
//     }
//   }
//
//   const validDirection = KING_DIRECTIONS.some(dir => start + dir == end);
//
//   return (
//     validDirection &&
//     (ignoreCheck ||
//       !moveResultsInCheck(board, { piece, start, end }, activeColor))
//   );
// };
//
// const generateKingMoves = (board, activeColor, piece, start) => {
//   const moves = KING_DIRECTIONS.filter(offset =>
//     isValidKingMove(board, activeColor, piece, start, start + offset)
//   ).map(offset => ({ piece, start, end: start + offset }));
//
//   if (
//     (activeColor == WHITE && start == 95) ||
//     (activeColor == BLACK && start == 25)
//   ) {
//     if (isValidKingMove(board, activeColor, piece, start, start + 2)) {
//       moves.push({ piece, start, end: start + 2 });
//     }
//     if (isValidKingMove(board, activeColor, piece, start, start - 2)) {
//       moves.push({ piece, start, end: start - 2 });
//     }
//   }
//
//   return moves;
// };
//
// export const performMove = (board, move) => {
//   const { piece, start, end } = move;
//   const pieceColor = Math.sign(board[start]);
//
//   let removedFigure = board[end];
//
//   board[start] = 0;
//   if (piece.id == 1 && board[end] == 0) {
//     if (abs(start - end) == 9) {
//       // En passant
//       removedFigure = board[start + pieceColor];
//       board[start + pieceColor] = 0;
//       move.enPassant = true;
//     } else if (abs(start - end) == 11) {
//       // En passant
//       removedFigure = board[start - pieceColor];
//       board[start - pieceColor] = 0;
//       move.enPassant = true;
//     }
//   }
//   board[end] = piece.id * pieceColor;
//
//   if (piece.id == 6) {
//     if (pieceColor == WHITE) {
//       setWhiteKingMoved(board);
//     } else {
//       setBlackKingMoved(board);
//     }
//
//     if (abs(start - end) == 2) {
//       // Castle
//       if (end == 97) {
//         board[96] = board[98];
//         board[98] = 0;
//         setWhiteRightRookMoved(board);
//       } else if (end == 93) {
//         board[94] = board[91];
//         board[91] = 0;
//         setWhiteLeftRookMoved(board);
//       } else if (end == 27) {
//         board[26] = board[28];
//         board[28] = 0;
//         setBlackRightRookMoved(board);
//       } else if (end == 23) {
//         board[24] = board[21];
//         board[21] = 0;
//         setBlackLeftRookMoved(board);
//       }
//     }
//   }
//
//   if (piece.id == 4) {
//     if (start == 91) {
//       setWhiteLeftRookMoved(board);
//     } else if (start == 98) {
//       setWhiteRightRookMoved(board);
//     } else if (start == 21) {
//       setBlackLeftRookMoved(board);
//     } else if (start == 28) {
//       setBlackRightRookMoved(board);
//     }
//   }
//
//   clearEnPassentPossible(board);
//
//   if (piece.id == 1 && abs(start - end) == 20) {
//     setEnPassentPossible(board, start, pieceColor);
//   }
//
//   return removedFigure;
// };
//
// const clearEnPassentPossible = board => {
//   board[board.length - 1] = getState(board) & (EN_PASSANT[0] - 1);
// };
//
// const setEnPassentPossible = (board, pos, color) => {
//   const index = color == BLACK ? pos - 31 : pos - 81 + 8;
//   board[board.length - 1] = getState(board) | EN_PASSANT[index];
// };
//
// export const undoMove = (
//   board,
//   { start, end, piece, enPassant },
//   removedFigure,
//   previousState
// ) => {
//   board[board.length - 1] = previousState;
//   board[start] = board[end];
//   board[end] = enPassant ? 0 : removedFigure;
//
//   if (enPassant) {
//     const pieceColor = Math.sign(board[start]);
//
//     if (abs(start - end) == 9) {
//       board[start + pieceColor] = removedFigure;
//     } else if (abs(start - end) == 11) {
//       board[start - pieceColor] = removedFigure;
//     }
//   }
//
//   if (piece.id == 6) {
//     if (abs(start - end) == 2) {
//       // Undo Castle
//       if (end == 97) {
//         board[98] = board[96];
//         board[96] = 0;
//       } else if (end == 93) {
//         board[91] = board[94];
//         board[94] = 0;
//       } else if (end == 27) {
//         board[28] = board[26];
//         board[26] = 0;
//       } else if (end == 23) {
//         board[21] = board[24];
//         board[24] = 0;
//       }
//     }
//   }
// };
//
// export const isInCheck = (board, activeColor) => {
//   const kingPos = board.findIndex(
//     item => item == pieces.KING.id * activeColor
//   );
//   if (!kingPos) {
//     return true;
//   }
//
//   return isAttacked(board, -activeColor, kingPos);
// };
//
// export const moveResultsInCheck = (board, move, activeColor) => {
//   const previousState = getState(board);
//   const removedFigure = performMove(board, move);
//   const check = isInCheck(board, activeColor);
//   undoMove(board, move, removedFigure, previousState);
//
//   return check;
// };
//
// const isValidMoveFns = [
//   isValidPawnMove,
//   isValidKnightMove,
//   isValidBishopMove,
//   isValidRookMove,
//   isValidQueenMove,
//   isValidKingMove
// ];
//
// export const isValidMove = (board, playerColor, piece, start, end) => {
//   const isValidMove = isValidMoveFns[piece.id - 1];
//
//   return isValidMove(board, playerColor, piece, start, end, true);
// }
//
// export const isAttacked = (board, opponentColor, position) => {
//   return board.some((item, index) => {
//     if (index == board.length - 1) {
//       return false;
//     }
//
//     if (item == 0 || item == BOARD_BORDER) {
//       return false;
//     }
//
//     const pieceColor = Math.sign(item);
//     if (pieceColor != opponentColor) {
//       return false;
//     }
//
//     const pieceId = abs(item);
//     const piece = getPieceById(pieceId);
//     const isValidMove = isValidMoveFns[pieceId - 1];
//
//     return isValidMove(board, opponentColor, piece, index, position, true);
//   });
// };
//
// const generateMovesFns = [
//   generatePawnMoves,
//   generateKnightMoves,
//   generateBishopMoves,
//   generateRookMoves,
//   generateQueenMoves,
//   generateKingMoves
// ];
//

export function generateMoves(board: Array<i32>, activeColor: i32): Array<i32> {
  let moves = new Array<i32>();

  for (let i = 21; i <= 98; i++) {
    const item = board[i];

    if (item == 0 || item == BOARD_BORDER) {
      continue;
    }

    const pieceColor = item < 0 ? -1 : 1;
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

    }
  }

  return moves;
};


// Helper functions

export function encodeMove(piece: i32, start: i32, end: i32): i32 {
  return abs(piece) | (start << 4) | (end << 12);
}

export function decodePiece(encodedMove: i32): i32 {
  return encodedMove & 0xF;
}

export function decodeStartIndex(encodedMove: i32): i32 {
  return (encodedMove >> 4) & 0xFF;
}

export function decodeEndIndex(encodedMove: i32): i32 {
  return (encodedMove >> 12) & 0xFF;
}

function sign(value: i32): i32 {
  if (value == 0) {
    return 0;
  }

  return value < 0 ? -1 : 1;
}

//
// export const isCheckMate = (board, activeColor) => {
//   return (
//     isInCheck(board, activeColor) &&
//     generateMoves(board, activeColor).length == 0
//   );
// };
