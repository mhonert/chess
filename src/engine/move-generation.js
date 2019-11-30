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
  BOARD_BORDER, EN_PASSANT,
  getState,
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
import { getPieceById, pieces } from './pieces';

const isValidPawnMove = (
  board,
  activeColor,
  piece,
  start,
  end,
  ignoreCheck = false
) => {
  if (board[end] === BOARD_BORDER) {
    return false;
  }

  const pieceColor = Math.sign(board[start]);
  if (activeColor !== pieceColor) {
    return false;
  }

  const targetPieceColor = Math.sign(board[end]);

  if (pieceColor === targetPieceColor) {
    return false;
  }

  if (
    !ignoreCheck &&
    moveResultsInCheck(board, { piece, start, end }, activeColor)
  ) {
    return false;
  }

  const direction = -pieceColor;

  // Horizontal => 1 field move
  if (end - start === 10 * direction && board[end] === 0) {
    return true;
  }

  // Horizontal => 2 fields from base line
  const baseLineStart = pieceColor === WHITE ? 81 : 31;
  const baseLineEnd = pieceColor === WHITE ? 88 : 38;

  const isBaseLine = start >= baseLineStart && start <= baseLineEnd;
  const noObstacleInBetween = board[start + direction * 10] === 0;
  if (
    end - start === 20 * direction &&
    isBaseLine &&
    noObstacleInBetween &&
    board[end] === 0
  ) {
    return true;
  }

  // Diagonal => hit other piece
  if (
    (end - start === 11 * direction || end - start === 9 * direction) &&
    board[end] !== 0
  ) {
    return true;
  }

  if (
    (end - start === 11 * direction || end - start === 9 * direction) &&
    board[end] === 0 &&
    enPassentPossible(board, pieceColor, end)
  ) {
    return true;
  }

  return false;
};

const enPassentPossible = (board, pieceColor, pos) => {
  const state = getState(board);
  if (pos > 40 && pos < 49 && pieceColor === WHITE) {
    return (state & EN_PASSANT[pos - 41]) !== 0;
  } else if (pos > 70 && pos < 79 && pieceColor === BLACK) {
    return (state & EN_PASSANT[pos - 71 + 8]) !== 0;
  }

  return false;
};

const getPromoPieces = () => [
  pieces.QUEEN,
  pieces.ROOK,
  pieces.BISHOP,
  pieces.KNIGHT
];

const generatePawnMoves = (board, activeColor, piece, start) => {
  const direction = -activeColor;

  if (activeColor === WHITE && start < 39) {
    // Check white pawn promotion
    return [9, 10, 11, 20]
      .filter(offset =>
        isValidPawnMove(
          board,
          activeColor,
          piece,
          start,
          start + offset * direction
        )
      )
      .flatMap(offset =>
        getPromoPieces().map(promoPiece => ({
          piece: promoPiece,
          start,
          end: start + offset * direction
        }))
      );
  } else if (activeColor === BLACK && start > 80) {
    // Check black pawn promotion
    return [9, 10, 11, 20]
      .filter(offset =>
        isValidPawnMove(
          board,
          activeColor,
          piece,
          start,
          start + offset * direction
        )
      )
      .flatMap(offset =>
        getPromoPieces().map(promoPiece => ({
          piece: promoPiece,
          start,
          end: start + offset * direction
        }))
      );
  }

  return [9, 10, 11, 20]
    .filter(offset =>
      isValidPawnMove(
        board,
        activeColor,
        piece,
        start,
        start + offset * direction
      )
    )
    .map(offset => ({ piece, start, end: start + offset * direction }));
};

const KNIGHT_DIRECTIONS = [21, 19, 12, 8, -12, -21, -19, -8];

const isValidKnightMove = (
  board,
  activeColor,
  piece,
  start,
  end,
  ignoreCheck = false
) => {
  if (board[end] === BOARD_BORDER) {
    return false;
  }

  const pieceColor = Math.sign(board[start]);
  if (activeColor !== pieceColor) {
    return false;
  }

  const targetPieceColor = Math.sign(board[end]);

  if (pieceColor === targetPieceColor) {
    return false;
  }

  if (
    !ignoreCheck &&
    moveResultsInCheck(board, { piece, start, end }, activeColor)
  ) {
    return false;
  }

  return KNIGHT_DIRECTIONS.some(dir => end === start + dir);
};

const generateKnightMoves = (board, activeColor, piece, start) => {
  return KNIGHT_DIRECTIONS.filter(offset =>
    isValidKnightMove(board, activeColor, piece, start, start + offset)
  ).map(offset => ({ piece, start, end: start + offset }));
};

const DIAGONAL_DIRECTIONS = [9, 11, -9, -11];

const isValidBishopMove = (
  board,
  activeColor,
  piece,
  start,
  end,
  ignoreCheck = false
) => {
  if (board[end] === BOARD_BORDER) {
    return false;
  }

  const pieceColor = Math.sign(board[start]);
  if (activeColor !== pieceColor) {
    return false;
  }

  const targetPieceColor = Math.sign(board[end]);

  if (pieceColor === targetPieceColor) {
    return false;
  }

  if (
    !ignoreCheck &&
    moveResultsInCheck(board, { piece, start, end }, activeColor)
  ) {
    return false;
  }

  return DIAGONAL_DIRECTIONS.some(dir => {
    for (let i = 1; i <= 7; i++) {
      // Target reached?
      if (end === start + dir * i) {
        return true;
      }

      // Obstacle in the way?
      if (board[start + dir * i] !== 0) {
        return false;
      }
    }
    return false;
  });
};

const generateBishopMoves = (board, activeColor, piece, start) => {
  return DIAGONAL_DIRECTIONS.flatMap(offset => {
    const moves = [];
    for (let i = 1; i <= 7; i++) {
      if (
        !isValidBishopMove(board, activeColor, piece, start, start + offset * i)
      ) {
        if (board[start + offset * i] === 0) {
          continue;
        }
        return moves;
      }
      moves.push({ piece, start, end: start + offset * i });
    }
    return moves;
  });
};

const ORTHOGONAL_DIRECTIONS = [1, 10, -1, -10];

const isValidRookMove = (
  board,
  activeColor,
  piece,
  start,
  end,
  ignoreCheck = false
) => {
  if (board[end] === BOARD_BORDER) {
    return false;
  }

  const pieceColor = Math.sign(board[start]);
  if (activeColor !== pieceColor) {
    return false;
  }

  const targetPieceColor = Math.sign(board[end]);

  if (pieceColor === targetPieceColor) {
    return false;
  }

  if (
    !ignoreCheck &&
    moveResultsInCheck(board, { piece, start, end }, activeColor)
  ) {
    return false;
  }

  return ORTHOGONAL_DIRECTIONS.some(dir => {
    for (let i = 1; i <= 7; i++) {
      // Target reached?
      if (end === start + dir * i) {
        return true;
      }

      // Obstacle in the way?
      if (board[start + dir * i] !== 0) {
        return false;
      }
    }

    return false;
  });
};

const generateRookMoves = (board, activeColor, piece, start) => {
  return ORTHOGONAL_DIRECTIONS.flatMap(offset => {
    const moves = [];
    for (let i = 1; i <= 7; i++) {
      if (
        !isValidRookMove(board, activeColor, piece, start, start + offset * i)
      ) {
        if (board[start + offset * i] === 0) {
          continue;
        }
        return moves;
      }
      moves.push({ piece, start, end: start + offset * i });
    }
    return moves;
  });
};

const isValidQueenMove = (
  board,
  activeColor,
  piece,
  start,
  end,
  ignoreCheck = false
) => {
  return (
    isValidBishopMove(board, activeColor, piece, start, end, ignoreCheck) ||
    isValidRookMove(board, activeColor, piece, start, end, ignoreCheck)
  );
};

const generateQueenMoves = (board, activeColor, piece, start) => {
  return generateBishopMoves(board, activeColor, piece, start).concat(
    generateRookMoves(board, activeColor, piece, start)
  );
};

const KING_DIRECTIONS = ORTHOGONAL_DIRECTIONS.concat(DIAGONAL_DIRECTIONS);

const isValidKingMove = (
  board,
  activeColor,
  piece,
  start,
  end,
  ignoreCheck = false
) => {
  if (board[end] === BOARD_BORDER) {
    return false;
  }

  const pieceColor = Math.sign(board[start]);
  if (activeColor !== pieceColor) {
    return false;
  }

  const targetPieceColor = Math.sign(board[end]);

  if (pieceColor === targetPieceColor) {
    return false;
  }

  // White: Small castle
  if (!whiteKingMoved(board)) {
    if (
      !whiteRightRookMoved(board) &&
      activeColor === WHITE &&
      start === 95 &&
      end === 97 &&
      board[96] === 0 &&
      board[97] === 0 &&
      !isAttacked(board, -activeColor, 95) &&
      !isAttacked(board, -activeColor, 96) &&
      !isAttacked(board, -activeColor, 97)
    ) {
      return true;
    }

    // White: Big castle
    if (
      !whiteLeftRookMoved(board) &&
      activeColor === WHITE &&
      start === 95 &&
      end === 93 &&
      board[94] === 0 &&
      board[93] === 0 &&
      board[92] === 0 &&
      !isAttacked(board, -activeColor, 95) &&
      !isAttacked(board, -activeColor, 94) &&
      !isAttacked(board, -activeColor, 93) &&
      !isAttacked(board, -activeColor, 92)
    ) {
      return true;
    }
  }

  if (!blackKingMoved(board)) {
    // Black: Small castle
    if (
      !blackRightRookMoved(board) &&
      activeColor === BLACK &&
      start === 25 &&
      end === 27 &&
      board[26] === 0 &&
      board[27] === 0 &&
      !isAttacked(board, -activeColor, 25) &&
      !isAttacked(board, -activeColor, 26) &&
      !isAttacked(board, -activeColor, 27)
    ) {
      return true;
    }

    // Black: Big castle
    if (
      !blackLeftRookMoved(board) &&
      activeColor === BLACK &&
      start === 25 &&
      end === 23 &&
      board[24] === 0 &&
      board[23] === 0 &&
      board[22] === 0 &&
      !isAttacked(board, -activeColor, 25) &&
      !isAttacked(board, -activeColor, 24) &&
      !isAttacked(board, -activeColor, 23) &&
      !isAttacked(board, -activeColor, 22)
    ) {
      return true;
    }
  }

  const validDirection = KING_DIRECTIONS.some(dir => start + dir === end);

  return (
    validDirection &&
    (ignoreCheck ||
      !moveResultsInCheck(board, { piece, start, end }, activeColor))
  );
};

const generateKingMoves = (board, activeColor, piece, start) => {
  const moves = KING_DIRECTIONS.filter(offset =>
    isValidKingMove(board, activeColor, piece, start, start + offset)
  ).map(offset => ({ piece, start, end: start + offset }));

  if (
    (activeColor === WHITE && start === 95) ||
    (activeColor === BLACK && start === 25)
  ) {
    if (isValidKingMove(board, activeColor, piece, start, start + 2)) {
      moves.push({ piece, start, end: start + 2 });
    }
    if (isValidKingMove(board, activeColor, piece, start, start - 2)) {
      moves.push({ piece, start, end: start - 2 });
    }
  }

  return moves;
};

export const performMove = (board, { piece, start, end }) => {
  const pieceId = Math.abs(piece);
  const pieceColor = Math.sign(board[start]);

  let removedFigure = board[end];

  board[start] = 0;
  if (pieceId === 1 && board[end] === 0) {
    if (Math.abs(start - end) === 9) {
      // En passant
      removedFigure = board[start + pieceColor];
      board[start + pieceColor] = 0;
    } else if (Math.abs(start - end) === 11) {
      // En passant
      removedFigure = board[start - pieceColor];
      board[start - pieceColor] = 0;
    }
  }
  board[end] = piece;

  if (pieceId === 6) {
    if (pieceColor === WHITE) {
      setWhiteKingMoved(board);
    } else {
      setBlackKingMoved(board);
    }

    if (Math.abs(start - end) === 2) {
      // Castle
      if (end === 97) {
        board[96] = board[98];
        board[98] = 0;
        setWhiteRightRookMoved(board);
      } else if (end === 93) {
        board[94] = board[91];
        board[91] = 0;
        setWhiteLeftRookMoved(board);
      } else if (end === 27) {
        board[26] = board[28];
        board[28] = 0;
        setBlackRightRookMoved(board);
      } else if (end === 23) {
        board[24] = board[21];
        board[21] = 0;
        setBlackLeftRookMoved(board);
      }
    }
  }

  if (pieceId === 4) {
    if (start === 91) {
      setWhiteLeftRookMoved(board);
    } else if (start === 98) {
      setWhiteRightRookMoved(board);
    } else if (start === 21) {
      setBlackLeftRookMoved(board);
    } else if (start === 28) {
      setBlackRightRookMoved(board);
    }
  }

  clearEnPassentPossible(board);

  if (pieceId === 1 && Math.abs(start - end) === 20) {
    setEnPassentPossible(board, start, pieceColor);
  }

  return removedFigure;
};

const clearEnPassentPossible = board => {
  board[board.length - 1] = getState(board) & (EN_PASSANT[0] - 1);
};

const setEnPassentPossible = (board, pos, color) => {
  const index = color === BLACK ? pos - 31 : pos - 81 + 8;
  board[board.length - 1] = getState(board) | EN_PASSANT[index];
};

export const undoMove = (
  board,
  { start, end, piece, enPassant },
  removedFigure,
  previousState
) => {
  board[board.length - 1] = previousState;
  board[start] = board[end];
  board[end] = enPassant ? 0 : removedFigure;

  if (enPassant) {
    const pieceColor = Math.sign(board[start]);

    if (Math.abs(start - end) === 9) {
      board[start + pieceColor] = removedFigure;
    } else if (Math.abs(start - end) === 11) {
      board[start - pieceColor] = removedFigure;
    }
  }

  if (piece.id === 6) {
    if (Math.abs(start - end) === 2) {
      // Undo Castle
      if (end === 97) {
        board[98] = board[96];
        board[96] = 0;
      } else if (end === 93) {
        board[91] = board[94];
        board[94] = 0;
      } else if (end === 27) {
        board[28] = board[26];
        board[26] = 0;
      } else if (end === 23) {
        board[21] = board[24];
        board[24] = 0;
      }
    }
  }
};

export const isInCheck = (board, activeColor) => {
  const kingPos = board.findIndex(
    item => item === pieces.KING.id * activeColor
  );
  if (!kingPos) {
    return true;
  }

  return isAttacked(board, -activeColor, kingPos);
};

export const moveResultsInCheck = (board, move, activeColor) => {
  const previousState = getState(board);
  const removedFigure = performMove(board, move);
  const check = isInCheck(board, activeColor);
  undoMove(board, move, removedFigure, previousState);

  return check;
};

const isValidMoveFns = [
  isValidPawnMove,
  isValidKnightMove,
  isValidBishopMove,
  isValidRookMove,
  isValidQueenMove,
  isValidKingMove
];

export const isValidMove = (board, playerColor, piece, start, end) => {
  const isValidMove = isValidMoveFns[piece.id - 1];

  return isValidMove(board, playerColor, piece, start, end, true);
}

export const isAttacked = (board, opponentColor, position) => {
  return board.some((item, index) => {
    if (index === board.length - 1) {
      return false;
    }

    if (item === 0 || item === BOARD_BORDER) {
      return false;
    }

    const pieceColor = Math.sign(item);
    if (pieceColor !== opponentColor) {
      return false;
    }

    const pieceId = Math.abs(item);
    const piece = getPieceById(pieceId);
    const isValidMove = isValidMoveFns[pieceId - 1];

    return isValidMove(board, opponentColor, piece, index, position, true);
  });
};

const generateMovesFns = [
  generatePawnMoves,
  generateKnightMoves,
  generateBishopMoves,
  generateRookMoves,
  generateQueenMoves,
  generateKingMoves
];

export const generateMoves = (board, activeColor) => {
  return board.flatMap((item, index) => {
    if (index === board.length - 1) {
      return [];
    }

    if (item === 0 || item === BOARD_BORDER) {
      return [];
    }

    const pieceColor = Math.sign(item);
    if (pieceColor !== activeColor) {
      return [];
    }

    const pieceId = Math.abs(item);
    const piece = getPieceById(pieceId);
    const generateMovesFn = generateMovesFns[pieceId - 1];

    return generateMovesFn(board, activeColor, piece, index);
  });
};

export const isCheckMate = (board, activeColor) => {
  return (
    isInCheck(board, activeColor) &&
    generateMoves(board, activeColor).length === 0
  );
};
