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

import { BLACK, Board, WHITE } from './board';
import {
  decodeEndIndex,
  decodePiece,
  decodeStartIndex, generateFilteredMoves,
  generateMoves,
  isCheckMate, isInCheck,
  performMove,
  undoMove
} from './move-generation';


const MIN_SCORE = -16383;
const MAX_SCORE = 16383;

export const WHITE_MATE_SCORE: i32 = -16000;
export const BLACK_MATE_SCORE: i32 = 16000;

export function findBestMove(board: Board, playerColor: i32, exactDepth: i32): i32 {
  return findBestMoveIncrementally(board, playerColor, exactDepth, exactDepth, 0);
}


/** Finds the best move for the current player color.
 *
 * @param board
 * @param playerColor BLACK (-1) or WHITE (1)
 * @param startingDepth Starting depth level for incremental search
 * @param minimumDepth Minimum depth level to achieve
 * @param timeLimitMillis Time limit for the search in milliseconds
 */
export function findBestMoveIncrementally(board: Board, playerColor: i32, startingDepth: i32, minimumDepth: i32, timeLimitMillis: i32): i32 {
  let alpha: i32 = MIN_SCORE;
  let beta: i32 = MAX_SCORE;

  const result = recFindBestMove(board, alpha, beta, playerColor, startingDepth, minimumDepth, timeLimitMillis, 0);

  return decodeMove(result);
};


// Used within recFindBestMove for time management and statistics
let startTime: i64 = 0;
let moveCount = 0;
let skippedRootMoves = 0;

// Recursively calls itself with alternating player colors to
// find the best possible move in response to the current board position.
function recFindBestMove(board: Board, alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, minimumDepth: i32, timeLimitMillis: i32, depth: i32): i32 {

  if (remainingLevels <= 0) {
    return encodeScoredMove(0, adjustedPositionScore(board, depth) * playerColor);
  }

  let moves: Array<i32>;
  if (depth == 0) {
    startTime = Date.now();
    skippedRootMoves = 0;
    moves = sortMovesByScore(board, generateFilteredMoves(board, playerColor), playerColor);
  } else {
    moves = sortMovesByScore(board, generateMoves(board, playerColor), playerColor);
  }

  if (moves.length == 0) {
    // no more moves possible (i.e. check mate or stale mate)
    return encodeScoredMove(0, adjustedPositionScore(board, depth) * playerColor);
  }


  if (depth == 0 && moves.length == 1) {
    const score = decodeScore(moves[0]);
    const move = decodeMove(moves[0]);
    return encodeScoredMove(move, score * playerColor);
  }

  let bestMove: i32 = 0;
  let medianScore: i32 = MIN_SCORE;

  const initialAlpha = alpha;

  do {
    alpha = initialAlpha;
    let bestScore: i32 = MIN_SCORE;
    let scoredMoves = 0;

    for (let i: i32 = 0; i < moves.length; i++) {
      const scoredMove = moves[i];

      if (depth == 0 && remainingLevels >= 5 && decodeScore(scoredMove) < medianScore) {
        skippedRootMoves++;
        continue;
      }

      const move = decodeMove(scoredMove);
      const previousState = board.getState();

      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = board.getItem(moveStart);
      const previousHalfMoveClock = board.getHalfMoveClock();

      const removedPiece = performMove(board, targetPieceId, moveStart, moveEnd);
      moveCount++;

      let score = i32.MIN_VALUE; // Score for invalid move
      if (!isInCheck(board, playerColor)) {
        const result = recFindBestMove(
          board,
          -beta,
          -alpha,
          -playerColor,
          remainingLevels - 1,
          minimumDepth,
          timeLimitMillis,
          depth + 1
        );
        if (result == -1) {
          if (depth > 0) {
            return -1;
          }
          trace('Stop search due to time limit: ', 2, remainingLevels, scoredMoves);
          break;
        }

        let unadjustedScore: i32 = decodeScore(result);

        score = -unadjustedScore;
      }

      undoMove(board, previousPiece, moveStart, moveEnd, removedPiece, previousState, previousHalfMoveClock);

      if (score == i32.MIN_VALUE) {
        continue; // skip this invalid move
      }

      // Use mini-max algorithm ...
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      if (depth == 0) {
        moves[i] = encodeScoredMove(move, score);
        scoredMoves++;

        if (remainingLevels > minimumDepth && Date.now() - startTime >= timeLimitMillis) {
          trace('Stop search due to time limit: ', 2, remainingLevels, scoredMoves);
          break;
        }

      } else if (depth == minimumDepth && Date.now() - startTime >= timeLimitMillis) {
        // Cancel search
        return -1;
      }

      // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
      alpha = max(alpha, bestScore);
      if (alpha >= beta) {
        break;
      }
    }

    if (depth > 0) {
      if (bestMove == 0) { // no legal move found?
        if (isInCheck(board, playerColor)) {
          // Check mate
          return encodeScoredMove(0, WHITE_MATE_SCORE - (100 - depth));
        }

        // Stalemate
        return encodeScoredMove(0, 0);
      }

      return encodeScoredMove(bestMove, bestScore);
    }

    moves.sort(whiteScoringComparator);

    const move = moves[0];

    if (remainingLevels >= minimumDepth && (Date.now() - startTime >= timeLimitMillis || remainingLevels > 64)) {
      trace('---------------------------------------------------');
      trace('Evaluated ' + moveCount.toString() + ' moves');
      trace('Skipped ' + skippedRootMoves.toString() + ' root moves');
      logScoredMove(move, 'Selected move');
      moveCount = 0;
      return move;
    }

    resetScores(moves);
    if (moves.length > 8) {
      medianScore = decodeScore(moves[moves.length / 2]);
    } else {
      medianScore = MIN_SCORE;
    }

    trace('---------------------------------------------------');
    trace('Finished depth: ', 1, remainingLevels);
    logScoredMove(move, 'Current best move');

    remainingLevels += 2;

  } while (true);

  return 0;
};


function resetScores(moves: Array<i32>): void {
  // const resetScore = WHITE_MATE_SCORE + 100 + moves.length;
  for (let i: i32 = 0; i < moves.length; i++) {
    let score: i32 = decodeScore(moves[i]) - 9;
    if (score < WHITE_MATE_SCORE) {
      score = WHITE_MATE_SCORE;
    }
    moves[i] = encodeScoredMove(decodeMove(moves[i]), score);
  }
}


// Evaluate board position with the given move performed
// (low values are better for black and high values are better for white)
function evaluateMoveScore(board: Board, encodedMove: i32): i32 {
  const previousState = board.getState();

  const targetPieceId = decodePiece(encodedMove);
  const moveStart = decodeStartIndex(encodedMove);
  const moveEnd = decodeEndIndex(encodedMove);
  const previousPiece = board.getItem(moveStart);


  const previousHalfMoveClock = board.getHalfMoveClock();
  const removedPiece = performMove(board, targetPieceId, moveStart, moveEnd);

  const score = evaluatePosition(board);

  undoMove(board, previousPiece, moveStart, moveEnd, removedPiece, previousState, previousHalfMoveClock);

  return score;
};


// Evaluates and sorts all given moves.
// The moves will be sorted in descending order starting with the best scored moved for the given player color.
//
// The score will be encoded in the same 32-Bit integer value that encodes the move (see encodeScoreMove), so
// the moves array can be modified and sorted in-place.
function sortMovesByScore(board: Board, moves: Array<i32>, playerColor: i32): Array<i32> {

  for (let i: i32 = 0; i < moves.length; i++) {
    const score: i32 = evaluateMoveScore(board, moves[i]);
    moves[i] = encodeScoredMove(moves[i], score);
  }

  if (playerColor == WHITE) {
    moves.sort(whiteScoringComparator);
  } else {
    moves.sort(blackScoringComparator);
  }

  return moves;
};

function whiteScoringComparator(a: i32, b: i32): i32 {
  return decodeScore(b) - decodeScore(a);
}

function blackScoringComparator(a: i32, b: i32): i32 {
  return decodeScore(a) - decodeScore(b);
}


/** Evaluates the current position and generates a score.
 *  Scores below 0 are better for the black and above 0 better for the white player.
 *
 * @param board
 * @returns {number} Position score
 */
export function evaluatePosition(board: Board): i32 {
  // Check mate is the best possible score for the other player
  if (isCheckMate(board, BLACK)) {
    return BLACK_MATE_SCORE;
  } else if (isCheckMate(board, WHITE)) {
    return WHITE_MATE_SCORE;
  }

  return board.getScore();
};

// If a check mate position can be achieved, then earlier check mates should have a better score than later check mates
// to prevent unnecessary delays.
function adjustedPositionScore(board: Board, depth: i32): i32 {
  const score = evaluatePosition(board);

  if (score == BLACK_MATE_SCORE) {
    return score + (100 - depth);
  } else if (score == WHITE_MATE_SCORE) {
    return score - (100 - depth);
  }

  return score;
};


export function encodeScoredMove(move: i32, score: i32): i32 {
  if (score < 0) {
    return move | 0x80000000 | (-score << 17);

  } else {
    return move | (score << 17);
  }
}

export function decodeScore(scoredMove: i32): i32 {
  return (scoredMove & 0x80000000) != 0
    ? -((scoredMove & 0x7FFE0000) >>> 17)
    : scoredMove >>> 17;
}

export function decodeMove(scoredMove: i32): i32 {
  return scoredMove & 0x1FFFF;
}


export function logScoredMoves(moves: Array<i32>): void {
  trace('# of moves:', 1, moves.length);

  for (let i = 0; i < moves.length; i++) {
    logScoredMove(moves[i]);
  }
}

export function logScoredMove(scoredMove: i32, prefix: string = ''): void {
  const move = decodeMove(scoredMove);
  const score = decodeScore(scoredMove);

  const piece = decodePiece(move);
  const start = decodeStartIndex(move);
  const end = decodeEndIndex(move);
  trace(prefix + ' - Move ' + move.toString() + ': ' + piece.toString() + ' from ' + start.toString() + ' to ' + end.toString() + ' for score ' + score.toString());
}
