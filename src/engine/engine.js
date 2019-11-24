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

import memoize from 'memoizee';
import {
  generateMoves,
  isAttacked,
  isCheckMate,
  performMove,
  undoMove
} from './move-generation';
import { getPieceById, K, P, pieces, R } from './pieces';
import {
  BLACK,
  blackKingMoved,
  blackLeftRookMoved,
  blackRightRookMoved,
  BOARD_BORDER,
  EMPTY,
  getState,
  WHITE,
  whiteKingMoved,
  whiteLeftRookMoved,
  whiteRightRookMoved
} from './board';

/** Returns the current row (0-7) for the given board index (21-98)
 */
export const boardRowFromIndex = index => (index - 21) % 10;

/** Evaluates the current position and generates a score.
 *  Scores below 0 are better for the black and above 0 better for the white player.
 *
 * @param board
 * @returns {number} Position score
 */
export const evaluatePosition = board => {
  // Check mate is the best possible score for the other player
  if (isCheckMate(board, WHITE)) {
    return -100000; // best score for black
  } else if (isCheckMate(board, BLACK)) {
    return 100000; // best score for white
  }

  let materialValue = 0;
  let positionValue = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let whiteKnights = 0;
  let blackKnights = 0;

  let whitePawnRows = 0;
  let blackPawnRows = 0;
  for (let i = 21; i <= 98; i++) {
    const pieceId = board[i];
    if (
      pieceId === EMPTY ||
      pieceId === BOARD_BORDER ||
      Math.abs(pieceId) === pieces.KING.id
    ) {
      continue;
    }

    // Sum of all piece values (material) on the board
    const pieceValue = getPieceById(Math.abs(pieceId)).value;
    materialValue += pieceValue * Math.sign(pieceId);

    if (pieceId === -1) {
      const rowBitPattern = 1 << boardRowFromIndex(i);
      if ((blackPawnRows & rowBitPattern) !== 0) {
        positionValue += 5; // worse score for double pawns
      } else {
        blackPawnRows |= rowBitPattern;
      }
    } else if (pieceId === 1) {
      const rowBitPattern = 1 << boardRowFromIndex(i);
      if ((whitePawnRows & rowBitPattern) !== 0) {
        positionValue -= 5; // worse score for double pawns
      } else {
        whitePawnRows |= rowBitPattern;
      }
    } else if (pieceId === -2) {
      blackKnights++;
    } else if (pieceId === 2) {
      whiteKnights++;
    } else if (pieceId === -3) {
      blackBishops++;
    } else if (pieceId === 3) {
      whiteBishops++;
    }

    // Bonus point for pieces outside the starting positions
    if (i >= 41 && i <= 88) {
      if (board[i] < -1 && board[i] > -4) {
        positionValue -= 2;
      } else if (board[i] > 1 && board[i] < 4) {
        positionValue += 2;
      }
    }
  }

  // Bonus points if knights exist as pair
  if (whiteKnights === 2) {
    positionValue += 400;
  }

  if (blackKnights === 2) {
    positionValue -= 400;
  }

  // Bonus points if bishops exist as pair
  if (whiteBishops === 2) {
    positionValue += 600;
  }

  if (blackBishops === 2) {
    positionValue -= 600;
  }

  // Bonus points, if pawns occupy the center positions
  if (board[54] === -1) {
    positionValue -= 2;
  }

  if (board[55] === -1) {
    positionValue -= 2;
  }

  if (board[64] === 1) {
    positionValue += 2;
  }

  if (board[65] === 1) {
    positionValue += 2;
  }

  // Bonus points if pieces involved in castling have not yet moved
  let castleValue = 0;

  if (whiteKingMoved(board)) {
    castleValue--;
  }

  if (whiteRightRookMoved(board)) {
    castleValue--;
  }

  if (whiteLeftRookMoved(board)) {
    castleValue--;
  }

  if (blackKingMoved(board)) {
    castleValue++;
  }

  if (blackRightRookMoved(board)) {
    castleValue++;
  }

  if (blackLeftRookMoved(board)) {
    castleValue++;
  }

  // Bonus points for safe castle positions
  if (
    board[27] === -K &&
    board[26] === -R &&
    board[36] === -P &&
    board[37] === -P &&
    board[38] === -P
  ) {
    castleValue -= 10;
  } else if (
    board[22] === -K &&
    board[23] === -R &&
    board[31] === -P &&
    board[32] === -P &&
    board[33] === -P
  ) {
    castleValue -= 10;
  }

  if (
    board[97] === K &&
    board[96] === R &&
    board[86] === P &&
    board[87] === P &&
    board[88] === P
  ) {
    castleValue += 10;
  } else if (
    board[92] === K &&
    board[93] === R &&
    board[81] === P &&
    board[82] === P &&
    board[83] === P
  ) {
    castleValue += 10;
  }

  for (let i = 31; i <= 33; i++) {
    if (board[i] !== -1) {
      castleValue++;
    }
  }

  for (let i = 36; i <= 38; i++) {
    if (board[i] !== -1) {
      castleValue++;
    }
  }

  for (let i = 81; i <= 83; i++) {
    if (board[i] !== 1) {
      castleValue--;
    }
  }

  for (let i = 86; i <= 88; i++) {
    if (board[i] !== 1) {
      castleValue--;
    }
  }

  return materialValue * 1000 + positionValue + castleValue;
};

// Evaluate board position with the given move performed
const evaluateMoveScore = (board, move) => {
  const previousState = getState(board);
  const removedFigure = performMove(board, move);
  const score = evaluatePosition(board);
  undoMove(board, move, removedFigure, previousState);
  return score;
};

const movesSortedByScore = (board, moves, playerColor) => {
  return moves
    .map(move => ({ ...move, score: evaluateMoveScore(board, move) }))
    .sort((moveA, moveB) => playerColor * (moveB.score - moveA.score));
};

/** Finds the best move for the current player color.
 *
 * @param board
 * @param playerColor BLACK (-1) or WHITE (1)
 * @param remainingHalfMoves Half moves to search for
 */
export const findBestMove = (board, playerColor, remainingHalfMoves) => {
  let alpha = -10000000000;
  let beta = 10000000000;

  const [score, move] = recFindBestMove(
    board,
    alpha,
    beta,
    playerColor,
    remainingHalfMoves,
    0,
    true
  );

  return move;
};

// If a check mate position can be achieved, then earlier check mates should have a better score than later check mates
// to prevent unnecessary delays.
const adjustScore = (board, realDepth) => {
  const score = evaluatePosition(board);

  if (score === 100000) {
    return score + (100 - realDepth);
  } else if (score === -100000) {
    return score - (100 - realDepth);
  }

  return score;
};

// Recursively calls itself with alternating player colors to
// find the best possible move in response to the current board position.
//
const recFindBestMove = (
  board,
  alpha,
  beta,
  playerColor,
  remainingLevels,
  depth,
  isRoot
) => {
  if (remainingLevels <= 0) {
    return [adjustScore(board, depth) * playerColor, null];
  }

  const moves = movesSortedByScore(
    board,
    generateMoves(board, playerColor),
    playerColor
  );

  if (moves.length === 0) {
    // no more moves possible (i.e. check mate or stale mate)
    return [adjustScore(board, depth) * playerColor, null];
  }

  let bestScore = -10000000;
  let bestMove = null;

  // Use memoized version of this function to save intermediate results in a cache
  // (except for the last level to reduce required cache size)
  const findMoveFn = remainingLevels > 1 ? memRecFindBestMove : recFindBestMove;

  for (const move of moves) {
    const previousState = getState(board);
    const removedFigure = performMove(board, move);

    let [unadjustedScore] = findMoveFn(
      board,
      -beta,
      -alpha,
      -playerColor,
      remainingLevels - 1,
      depth + 1,
      false
    );

    const score = -unadjustedScore;
    undoMove(board, move, removedFigure, previousState);

    // Use mini-max algorithm ...
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      bestMove.score = score;
    }

    // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
    alpha = Math.max(alpha, bestScore);
    if (alpha >= beta) {
      break;
    }
  }

  return isRoot ? [bestScore, bestMove] : [bestScore, null]; // do not return actual move for sub-levels to save memory in the memoization cache
};

// Memoize (cache) intermediate results for recFindBestMove function
const memRecFindBestMove = memoize(recFindBestMove, {
  max: 500000,
  normalizer: function(args) {
    const board = args[0];
    let boardKey = '';
    for (let i = 21; i <= 98; i++) {
      boardKey += board[i];
    }

    return boardKey + args[3] + args[4]; // board, playerColor and remainingLevels
  }
});
