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
  decodeStartIndex,
  generateFilteredMoves,
  generateMoves,
  isCheckMate,
} from './move-generation';
import {
  decodeTranspositionDepth,
  decodeTranspositionScore,
  encodeTranspositionEntry,
  matchesTranspositionHash,
  TRANSPOSITION_INDEX_BITMASK,
  TRANSPOSITION_MAX_DEPTH,
  TRANSPOSITION_TABLE
} from './transposition-table';


export const MIN_SCORE = -16383;
export const MAX_SCORE = 16383;

export const WHITE_MATE_SCORE: i32 = -16000;
export const BLACK_MATE_SCORE: i32 = 16000;

export class Engine {

  private board: Board;
  private startTime: i64 = 0;
  private moveCount: i32 = 0;
  private cacheHits: i32 = 0;
  private timeLimitMillis: i32;
  private minimumDepth: i32;

  setBoard(board: Board): void {
    this.board = board;
  }

  // Find the best possible move in response to the current board position.
  findBestMove(alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, minimumDepth: i32, timeLimitMillis: i32, depth: i32): i32 {

    this.timeLimitMillis = timeLimitMillis;
    this.minimumDepth = minimumDepth;
    this.startTime = Date.now();
    this.moveCount = 0;
    this.cacheHits = 0;

    const moves = this.sortMovesByScore(generateFilteredMoves(this.board, playerColor), playerColor);

    if (moves.length == 1) {
      const score = decodeScore(unchecked(moves[0]));
      const move = decodeMove(unchecked(moves[0]));
      return encodeScoredMove(move, score * playerColor);
    }

    if (moves.length == 0) {
      // no more moves possible (i.e. check mate or stale mate)
      return encodeScoredMove(0, this.adjustedPositionScore(depth) * playerColor);
    }


    let bestMove: i32 = 0;

    const initialAlpha = alpha;

    // Use iterative deepening, i.e. increase the search depth after each iteration
    do {
      trace('---------------------------------------------------');
      trace('Start with search depth: ', 1, remainingLevels);

      alpha = initialAlpha;
      let bestScore: i32 = MIN_SCORE;
      let scoredMoves = 0;

      for (let i: i32 = 0; i < moves.length; i++) {
        const scoredMove = unchecked(moves[i]);

        const move = decodeMove(scoredMove);

        const targetPieceId = decodePiece(move);
        const moveStart = decodeStartIndex(move);
        const moveEnd = decodeEndIndex(move);
        const previousPiece = this.board.getItem(moveStart);

        const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);
        this.moveCount++;


        const result = this.recFindBestMove(
          -beta,
          -alpha,
          -playerColor,
          remainingLevels - 1,
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

        const score = -unadjustedScore;

        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

        // Use mini-max algorithm ...
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }

        unchecked(moves[i] = encodeScoredMove(move, score));
        scoredMoves++;

        if (remainingLevels > minimumDepth && Date.now() - this.startTime >= timeLimitMillis) {
          trace('Stop search due to time limit: ', 2, remainingLevels, scoredMoves);
          break;
        }

        // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
        alpha = max(alpha, bestScore);
        if (alpha >= beta) {
          break;
        }
      }

      this.sortByScoreDescending(moves);

      const move = unchecked(moves[0]);

      if (remainingLevels >= minimumDepth && (Date.now() - this.startTime >= timeLimitMillis || (remainingLevels + 2) > TRANSPOSITION_MAX_DEPTH)) {
        trace('---------------------------------------------------');
        trace('Evaluated ' + this.moveCount.toString() + ' moves');
        trace('Cache hits ' + this.cacheHits.toString());
        logScoredMove(move, 'Selected move');
        return move;
      }

      this.resetScores(moves);

      logScoredMove(move, 'Current best move');

      remainingLevels += 2;

    } while (true);

    return 0;
  };

  // Recursively calls itself with alternating player colors to
  // find the best possible move in response to the current board position.
  private recFindBestMove(alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, depth: i32): i32 {

    if (remainingLevels <= 0) {
      return encodeScoredMove(0, this.adjustedPositionScore(depth) * playerColor);
    }

    const moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor);

    if (moves.length == 0) {
      // no more moves possible (i.e. check mate or stale mate)
      return encodeScoredMove(0, this.adjustedPositionScore(depth) * playerColor);
    }

    let bestMove: i32 = 0;

    let bestScore: i32 = MIN_SCORE;

    const len = moves.length;
    for (let i: i32 = 0; i < len; i++) {
      const scoredMove = unchecked(moves[i]);

      const move = decodeMove(scoredMove);

      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);
      this.moveCount++;


      let score = i32.MIN_VALUE; // Score for invalid move

      const transpositionIndex = i32(this.board.getHash() & TRANSPOSITION_INDEX_BITMASK);
      const cacheEntry = unchecked(TRANSPOSITION_TABLE[transpositionIndex]);

      if (cacheEntry != 0 && decodeTranspositionDepth(cacheEntry) == remainingLevels && matchesTranspositionHash(this.board.getHash(), cacheEntry)) {
        score = decodeTranspositionScore(cacheEntry);
        this.cacheHits++;

      } else if (!this.board.isInCheck(playerColor)) {
        const result = this.recFindBestMove(
          -beta,
          -alpha,
          -playerColor,
          remainingLevels - 1,
          depth + 1
        );
        if (result == -1) {
          return -1;
        }

        let unadjustedScore: i32 = decodeScore(result);

        score = -unadjustedScore;

        unchecked(TRANSPOSITION_TABLE[transpositionIndex] = encodeTranspositionEntry(this.board.getHash(), remainingLevels, score));
      }

      this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

      if (score == i32.MIN_VALUE) {
        continue; // skip this invalid move
      }

      // Use mini-max algorithm ...
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      if (depth == this.minimumDepth && Date.now() - this.startTime >= this.timeLimitMillis) {
        // Cancel search
        return -1;
      }

      // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
      alpha = max(alpha, bestScore);
      if (alpha >= beta) {
        break;
      }
    }

    if (bestMove == 0) { // no legal move found?
      if (this.board.isInCheck(playerColor)) {
        // Check mate
        return encodeScoredMove(0, WHITE_MATE_SCORE - (100 - depth));
      }

      // Stalemate
      return encodeScoredMove(0, 0);
    }

    return encodeScoredMove(bestMove, bestScore);
  };


  resetScores(moves: Int32Array): void {
    for (let i: i32 = 0; i < moves.length; i++) {
      let score: i32 = decodeScore(unchecked(moves[i])) - 9;
      if (score < WHITE_MATE_SCORE) {
        score = WHITE_MATE_SCORE;
      }
      moves[i] = encodeScoredMove(decodeMove(unchecked(moves[i])), score);
    }
  }


  // Evaluate board position with the given move performed
  // (low values are better for black and high values are better for white)
  evaluateMoveScore(encodedMove: i32): i32 {

    const targetPieceId = decodePiece(encodedMove);
    const moveStart = decodeStartIndex(encodedMove);
    const moveEnd = decodeEndIndex(encodedMove);
    const previousPiece = this.board.getItem(moveStart);

    const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);

    const score = this.evaluatePosition();

    this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

    return score;
  };


  // Evaluates and sorts all given moves.
  // The moves will be sorted in descending order starting with the best scored moved for the given player color.
  //
  // The score will be encoded in the same 32-Bit integer value that encodes the move (see encodeScoreMove), so
  // the moves array can be modified and sorted in-place.
  sortMovesByScore(moves: Int32Array, playerColor: i32): Int32Array {

    for (let i: i32 = 0; i < moves.length; i++) {
      const score: i32 = this.evaluateMoveScore(unchecked(moves[i]));
      unchecked(moves[i] = encodeScoredMove(moves[i], score));
    }

    if (playerColor == WHITE) {
      this.sortByScoreDescending(moves);
    } else {
      this.sortByScoreAscending(moves);
    }

    return moves;
  };

  sortByScoreDescending(moves: Int32Array): void {
    // Basic insertion sort
    for (let i = 1; i < moves.length; i++) {
      const x = unchecked(moves[i]);
      const xScore = decodeScore(x);
      let j = i - 1;
      while (j >= 0) {
        const y = unchecked(moves[j]);
        if (decodeScore(y) >= xScore) {
          break;
        }
        unchecked(moves[j + 1] = y);
        j--;
      }
      unchecked(moves[j + 1] = x);
    }
  }

  sortByScoreAscending(moves: Int32Array): void {
    // Basic insertion sort
    for (let i = 1; i < moves.length; i++) {
      const x = unchecked(moves[i]);
      const xScore = decodeScore(x);
      let j = i - 1;
      while (j >= 0) {
        const y = unchecked(moves[j]);
        if (decodeScore(y) <= xScore) {
          break;
        }
        unchecked(moves[j + 1] = y);
        j--;
      }
      unchecked(moves[j + 1] = x);
    }
  }


  /** Evaluates the current position and generates a score.
   *  Scores below 0 are better for the black and above 0 better for the white player.
   *
   * @param board
   * @returns {number} Position score
   */
  evaluatePosition(): i32 {
    // Check mate is the best possible score for the other player
    if (isCheckMate(this.board, BLACK)) {
      return BLACK_MATE_SCORE;
    } else if (isCheckMate(this.board, WHITE)) {
      return WHITE_MATE_SCORE;
    }

    return this.board.getScore();
  };

  // If a check mate position can be achieved, then earlier check mates should have a better score than later check mates
  // to prevent unnecessary delays.
  adjustedPositionScore( depth: i32): i32 {
    const score = this.evaluatePosition();

    if (score == BLACK_MATE_SCORE) {
      return score + (100 - depth);
    } else if (score == WHITE_MATE_SCORE) {
      return score - (100 - depth);
    }

    return score;
  };
}

const ENGINE = new Engine();

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

  ENGINE.setBoard(board);
  const result = ENGINE.findBestMove(alpha, beta, playerColor, startingDepth, minimumDepth, timeLimitMillis, 0);

  return decodeMove(result);
};


// Helper functions

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
