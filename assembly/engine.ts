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

import { BLACK, Board, EMPTY, WHITE } from './board';
import {
  decodeEndIndex, decodeMove,
  decodePiece, decodeScore,
  decodeStartIndex, encodeScoredMove,
  generateFilteredMoves,
  generateMoves,
  isCheckMate
} from './move-generation';
import { ScoreType, TRANSPOSITION_MAX_DEPTH, TranspositionTable } from './transposition-table';
import { fromFEN } from './fen';
import { PositionHistory } from './history';
import { PIECE_VALUES } from './pieces';


export const MIN_SCORE = -16383;
export const MAX_SCORE = 16383;

export const WHITE_MATE_SCORE: i32 = -8000;
export const BLACK_MATE_SCORE: i32 = 8000;

const CANCEL_SEARCH = i32.MAX_VALUE - 1;

export class Engine {

  private transpositionTable: TranspositionTable = new TranspositionTable();
  private history: PositionHistory = new PositionHistory();
  private board: Board;
  private startTime: i64 = 0;
  private moveCount: i32 = 0;
  private cacheHits: i32 = 0;
  private timeLimitMillis: i32;
  private minimumDepth: i32;
  private moveHits: i32 = 0;
  private contemptFactor: i32 = 10;

  private previousHalfMoveClock: i32 = 0;

  constructor() {
    this.reset();
  }

  setBoard(board: Board): void {
    this.board = board;

    if (this.board.getHalfMoveClock() == 0 || this.previousHalfMoveClock > this.board.getHalfMoveClock()) {
      this.history.clear();
    }

    this.previousHalfMoveClock = this.board.getHalfMoveClock();
    this.board.setHistory(this.history);
  }

  reset(): void {
    this.history.clear();
    this.board = fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    this.board.setHistory(this.history);
    this.transpositionTable.clear();
  }

  // Find the best possible move in response to the current board position.
  findBestMove(alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, minimumDepth: i32, timeLimitMillis: i32, depth: i32): i32 {

    this.timeLimitMillis = timeLimitMillis;
    this.minimumDepth = minimumDepth;
    this.startTime = Date.now();
    this.moveCount = 0;
    this.cacheHits = 0;
    this.moveHits = 0;

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
        if (result == CANCEL_SEARCH) {
          this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
          if (depth > 0) {
            return CANCEL_SEARCH;
          }
          trace('Stop search due to time limit: ', 2, remainingLevels, scoredMoves);
          break;
        }

        const score = -result;

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
      }

      if (remainingLevels >= minimumDepth && (Date.now() - this.startTime >= timeLimitMillis || (remainingLevels + 1) > TRANSPOSITION_MAX_DEPTH)) {
        trace('---------------------------------------------------');
        trace('Evaluated ' + this.moveCount.toString() + ' moves');
        trace('Cache hits ' + this.cacheHits.toString());
        trace('Best move hits ' + this.moveHits.toString());

        const evaluatedMoveSubSet: Int32Array = moves.subarray(0, max(1, scoredMoves));
        this.sortByScoreDescending(evaluatedMoveSubSet);

        const selectedMove = evaluatedMoveSubSet[0];
        logScoredMove(selectedMove, 'Selected move');
        return selectedMove;
      }

      let currentBestMove = encodeScoredMove(bestMove, bestScore);
      logScoredMove(currentBestMove, 'Current best move');

      this.sortByScoreDescending(moves);
      remainingLevels += 1;

    } while (true);

    return 0;
  };

  // Recursively calls itself with alternating player colors to
  // find the best possible move in response to the current board position.
  private recFindBestMove(alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, depth: i32): i32 {

    if (this.board.isThreefoldRepetion()) {
      return this.contemptFactor * playerColor;
    }

    const ttHash = this.board.getHash();
    if (remainingLevels <= 0) {
      const score = this.evaluatePosition();
      if (score == BLACK_MATE_SCORE) {
        return (score - depth) * playerColor;
      } else if (score == WHITE_MATE_SCORE) {
        return (score + depth) * playerColor;
      }

      return score * playerColor;
    }

    let scoredMove = this.transpositionTable.getScoredMove(ttHash);

    let moves: Int32Array | null = null;

    let moveIndex: i32 = 0;
    if (scoredMove != 0) {
      if (this.transpositionTable.getDepth(ttHash) == remainingLevels) {
        this.cacheHits++;
        return decodeScore(scoredMove);
      }

      this.moveHits++;

    } else {
      moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor);
      if (moves.length == 0) {
        // no more moves possible (i.e. check mate or stale mate)
        return this.adjustedPositionScore(depth) * playerColor;
      }
      scoredMove = moves[0];
      moveIndex++;
    }

    let bestMove: i32 = 0;
    let bestScore: i32 = MIN_SCORE;

    let resultType = ScoreType.NO_CUTOFF;

    do {
      const move = decodeMove(scoredMove);

      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);
      this.moveCount++;


      if (this.board.isInCheck(playerColor)) {
        // skip invalid move
        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

      } else {

        const result = this.recFindBestMove(
          -beta,
          -alpha,
          -playerColor,
          remainingLevels - 1,
          depth + 1
        );
        if (result == CANCEL_SEARCH) {
          this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
          return CANCEL_SEARCH;
        }

        const score = -result;

        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

        // Use mini-max algorithm ...
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }

        // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
        alpha = max(alpha, bestScore);
        if (alpha >= beta) {
          resultType = ScoreType.CUTOFF;

          break;
        }
      }

      if (depth == this.minimumDepth && Date.now() - this.startTime >= this.timeLimitMillis) {
        // Cancel search
        return CANCEL_SEARCH;
      }

      if (moves == null) {
        moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor);

        if (moves.length == 0) {
          // no more moves possible (i.e. check mate or stale mate)
          break;
        }

      } else if (moveIndex == moves.length) {
          break;
      }

      scoredMove = unchecked(moves[moveIndex]);
      moveIndex++;

    } while (true);

    if (bestMove == 0) { // no legal move found?
      if (this.board.isInCheck(playerColor)) {
        // Check mate
        return WHITE_MATE_SCORE + depth;
      }

      // Stalemate
      return 0;
    }

    this.transpositionTable.writeEntry(ttHash, remainingLevels, bestMove, bestScore, resultType);

    return bestScore;
  };


  // Move evaluation heuristic for initial move ordering
  // (low values are better for black and high values are better for white)
  evaluateMoveScore(activePlayer: i32, encodedMove: i32): i32 {
    const ownTargetPieceId = decodePiece(encodedMove);
    const moveStart = decodeStartIndex(encodedMove);
    const moveEnd = decodeEndIndex(encodedMove);
    const ownOriginalPieceId = activePlayer * this.board.getItem(moveStart); // might be different in case of pawn promotions

    const posScore = this.board.calculateScore(moveEnd, activePlayer, ownTargetPieceId) - this.board.calculateScore(moveStart, activePlayer, ownOriginalPieceId);
    const capturedPieceId = this.board.getItem(moveEnd);

    const captureScore = capturedPieceId == EMPTY ? 0 : activePlayer * (100 - unchecked(PIECE_VALUES[ownOriginalPieceId - 1]) + unchecked(PIECE_VALUES[capturedPieceId - 1]));
    return captureScore * 8 + posScore;
  };


  // Evaluates and sorts all given moves.
  // The moves will be sorted in descending order starting with the best scored moved for the given player color.
  //
  // The score will be encoded in the same 32-Bit integer value that encodes the move (see encodeScoreMove), so
  // the moves array can be modified and sorted in-place.
  sortMovesByScore(moves: Int32Array, playerColor: i32): Int32Array {

    for (let i: i32 = 0; i < moves.length; i++) {
      const score: i32 = this.evaluateMoveScore(playerColor, unchecked(moves[i]));
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
  @inline
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
  adjustedPositionScore(depth: i32): i32 {
    const score = this.evaluatePosition();

    if (score == BLACK_MATE_SCORE) {
      return score - depth;
    } else if (score == WHITE_MATE_SCORE) {
      return score + depth;
    }

    return score;
  };
}

const ENGINE = new Engine();

export function reset(): void {
  ENGINE.reset();
}

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


export function logScoredMove(scoredMove: i32, prefix: string = ''): void {
  const move = decodeMove(scoredMove);
  const score = decodeScore(scoredMove);

  const piece = decodePiece(move);
  const start = decodeStartIndex(move);
  const end = decodeEndIndex(move);
  trace(prefix + ' - Move ' + move.toString() + ': ' + piece.toString() + ' from ' + start.toString() + ' to ' + end.toString() + ' for score ' + score.toString());
}
