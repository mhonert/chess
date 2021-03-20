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

import { BLACK, Board, EMPTY, EN_PASSANT_BIT, WHITE } from './board';
import { fromFEN, STARTPOS } from './fen';
import { PositionHistory } from './history';
import { HistoryHeuristics } from './history-heuristics';
import { clock, stdio } from './io';
import {
  decodeEndIndex,
  decodeMove,
  decodePiece,
  decodeScore,
  decodeStartIndex,
  encodeScoredMove,
  generateCaptureMoves,
  generateFilteredMoves,
  generateMoves,
  isCheckMate,
  isValidMove
} from './move-generation';
import { getCaptureOrderScore, sortByScoreAscending, sortByScoreDescending } from './move-ordering';
import { findOpeningMove, getOpeningBookPlyLimit } from './opening-book';
import { perft } from './perft';
import {
  getDepth,
  getScoredMove,
  getScoreType,
  ScoreType,
  TRANSPOSITION_MAX_DEPTH,
  TranspositionTable
} from './transposition-table';
import { UCIMove } from './uci-move-notation';

export const MIN_SCORE = -16383;
export const MAX_SCORE = 16383;

export const WHITE_MATE_SCORE: i32 = -16000;
export const BLACK_MATE_SCORE: i32 = 16000;

const CANCEL_SEARCH = i32.MAX_VALUE - 1;

const LMR_THRESHOLD: i32 = 4;
const LMR_REDUCTIONS: i32 = 2;

const FUTILITY_MARGIN_MULTIPLIER: i32 = 51;

const FUTILE_MOVE_REDUCTIONS: i32 = 2;
const LOSING_MOVE_REDUCTIONS: i32 = 2;

const QS_SEE_THRESHOLD: i32 = 104;
const QS_PRUNE_MARGIN: i32 = 989;

const PRIMARY_KILLER_SCORE_BONUS: i32 = -2267;
const SECONDARY_KILLER_SCORE_BONUS: i32 = -3350;

export const TIMEEXT_MULTIPLIER: i32 = 5;
const TIMEEXT_SCORE_CHANGE_THRESHOLD: i32 = 80;
const TIMEEXT_SCORE_FLUCTUATION_THRESHOLD: i32 = 130;
const TIMEEXT_SCORE_FLUCTUATION_REDUCTIONS = 90; // reduction percentage per search iteration

const RAZOR_MARGIN: i32 = 130;

export class Engine {

  private transpositionTable: TranspositionTable = new TranspositionTable();
  private historyHeuristics: HistoryHeuristics = new HistoryHeuristics();
  private history: PositionHistory = new PositionHistory();
  private board: Board;
  private startTime: i64 = 0;
  private nodeCount: u64 = 0;
  private timeLimitMillis: i64;
  private isCancelPossible: bool = false;
  private useOpeningBook: bool = false;
  private openingBookPlyLimit: i32 = getOpeningBookPlyLimit();

  constructor() {
    this.board = fromFEN(STARTPOS);
    this.board.setHistory(this.history);
  }

  resizeTranspositionTable(sizeInMB: u32): void {
    this.transpositionTable.resize(sizeInMB);
  }

  reset(): void {
    this.transpositionTable.clear();
    this.history.clear();
    this.board = fromFEN(STARTPOS);
    this.board.setHistory(this.history);
  }

  setBoard(board: Board): void {
    this.historyHeuristics.clear();
    this.transpositionTable.increaseAge();

    this.board = board;

    this.history.clear();

    this.board.setHistory(this.history);
  }

  setUseOpeningBook(use: bool): void {
    this.useOpeningBook = use;
  }

  refreshStateAfterMove(increaseTTableAge: bool): void {
    if (increaseTTableAge) {
      this.transpositionTable.increaseAge();
    }
    this.historyHeuristics.clear();
    if (this.board.getHalfMoveClock() == 0) {
      this.history.clear();
    }
  }

  // Find the best possible move in response to the current board position.
  findBestMove(playerColor: i32, minimumDepth: i32, timeLimitMillis: i64, isStrictTimeLimit: bool): i32 {
    let alpha: i32 = MIN_SCORE;
    let beta: i32 = MAX_SCORE;

    this.historyHeuristics.clearHistory();

    this.timeLimitMillis = timeLimitMillis;
    this.startTime = clock.currentMillis();

    const moves = this.sortMovesByScore(generateFilteredMoves(this.board, playerColor), playerColor);

    if (moves.length == 1) {
      const score = decodeScore(unchecked(moves[0]));
      const move = decodeMove(unchecked(moves[0]));
      return encodeScoredMove(move, score * playerColor);
    }

    if (moves.length == 0) {
      // no more moves possible (i.e. check mate or stale mate)
      return encodeScoredMove(0, this.terminalScore(playerColor, 0) * playerColor);
    }

    // Check opening book for a move
    if (this.useOpeningBook && this.board.getHalfMoveCount() < this.openingBookPlyLimit) {
      const move = findOpeningMove(this.board);
      if (move != 0 && isValidMove(this.board, playerColor, move)) {
        return encodeScoredMove(move, 0);
      }
    }

    let currentBestScoredMove: i32 = 0;

    this.isCancelPossible = false;
    this.nodeCount = 0;

    let alreadyExtendedTimeLimit = false;
    let iterationDuration: i64 = 0;

    let previousBestMove: i32 = 0;
    let previousBestScore: i32 = 0;

    let fluctuationCount: i32 = 0;
    let scoreFluctuations: i32 = 0;

    // Use iterative deepening, i.e. increase the search depth after each iteration
    for (let depth: i32 = min(minimumDepth, 2); depth < TRANSPOSITION_MAX_DEPTH; depth++) {
      let bestScore: i32 = MIN_SCORE;
      let scoredMoves = 0;

      let previousAlpha = alpha;
      let previousBeta = beta;

      const iterationStartTime = clock.currentMillis();

      let bestMove: i32 = 0;

      let a = -beta; // Search principal variation node with full window

      let evaluatedMoveCount = 0;

      let iterationCancelled = false;
      for (let i: i32 = 0; i < moves.length; i++) {
        const scoredMove = unchecked(moves[i]);

        const move = decodeMove(scoredMove);

        const targetPieceId = decodePiece(move);
        const moveStart = decodeStartIndex(move);
        const moveEnd = decodeEndIndex(move);
        const previousPiece = this.board.getItem(moveStart);

        const removedPieceId = this.board.performMove(targetPieceId, moveStart, moveEnd);

        const givesCheck = this.board.isInCheck(-playerColor);

        // Use principal variation search
        let result = this.recFindBestMove(a, -alpha, -playerColor, depth - 1, 1, false, true, givesCheck);
        if (result == CANCEL_SEARCH) {
          iterationCancelled = true;
        }

        // Repeat search if it falls outside the window
        if (-result > alpha && -result < beta) {
          result = this.recFindBestMove(-beta, -alpha, -playerColor, depth - 1, 1, false, true, givesCheck);
          if (result == CANCEL_SEARCH) {
            iterationCancelled = true;
          }
        }

        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);

        if (iterationCancelled) {
          if (bestMove != 0 && previousBestMove != 0) {
            scoreFluctuations = scoreFluctuations * 100 / TIMEEXT_SCORE_FLUCTUATION_REDUCTIONS;
            scoreFluctuations += abs(bestScore - previousBestScore);

            if (abs(bestScore) >= (BLACK_MATE_SCORE - TRANSPOSITION_MAX_DEPTH)) {
              // Reset score fluctuation statistic, if a check mate is found
              scoreFluctuations = 0;
            }
          }

          if (!isStrictTimeLimit && !alreadyExtendedTimeLimit && shouldExtendTimeLimit(bestMove, bestScore, previousBestMove, previousBestScore, scoreFluctuations, fluctuationCount))  {

            alreadyExtendedTimeLimit = true;
            this.timeLimitMillis *= TIMEEXT_MULTIPLIER;

            iterationCancelled = false;
            continue;
          }
          break;
        }

        const score = -result;
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
          alpha = max(alpha, bestScore);
        }

        evaluatedMoveCount++;
        a = -(alpha + 1); // Search all other moves (after principal variation) with a zero window

        unchecked(moves[i] = encodeScoredMove(move, score));
        scoredMoves++;

      }

      const currentTime = clock.currentMillis();
      iterationDuration = currentTime - iterationStartTime;
      const totalDuration = currentTime - this.startTime;
      const remainingTime = timeLimitMillis - totalDuration;

      if (!iterationCancelled) {
        const depthInfo = "depth " + depth.toString();
        const scoreInfo = this.getScoreInfo(bestScore);
        const pvInfo = " pv " + this.extractPV(bestMove, depth - 1);
        const nodesPerSecond = totalDuration > 0 ? this.nodeCount * 1000 / totalDuration : 0;

        const nodesInfo = " nodes " + this.nodeCount.toString();
        const npsInfo = nodesPerSecond > 0 ? " nps " + nodesPerSecond.toString() : "";

        const timeInfo = " time " + totalDuration.toString();

        stdio.writeLine("info " + depthInfo + scoreInfo + nodesInfo + npsInfo + timeInfo + pvInfo);

        if (previousBestMove != 0) {
          scoreFluctuations = scoreFluctuations * 100 / TIMEEXT_SCORE_FLUCTUATION_REDUCTIONS;
          scoreFluctuations += abs(bestScore - previousBestScore);
          fluctuationCount++;
        }

        this.isCancelPossible = depth >= minimumDepth;
        if (this.isCancelPossible && (remainingTime <= (iterationDuration * 2))) {
          // Not enough time left for another iteration

          if (isStrictTimeLimit || alreadyExtendedTimeLimit || !shouldExtendTimeLimit(bestMove, bestScore, previousBestMove, previousBestScore, scoreFluctuations, fluctuationCount)) {
            iterationCancelled = true;
          }

        }
      }

      if (iterationCancelled) {
        if (bestMove != 0) {
          currentBestScoredMove = encodeScoredMove(bestMove, bestScore);
        }
        break;
      }

      currentBestScoredMove = encodeScoredMove(bestMove, bestScore);
      previousBestMove = bestMove;
      previousBestScore = bestScore;

      sortByScoreDescending(moves);

      alpha = previousAlpha;
      beta = previousBeta;
    }

    return currentBestScoredMove;
  };

  private getScoreInfo(score: i32): string {
    if (score <= WHITE_MATE_SCORE + TRANSPOSITION_MAX_DEPTH) {
      return " score mate " + ((WHITE_MATE_SCORE - score - 1) / 2).toString();
    } else if (score >= BLACK_MATE_SCORE - TRANSPOSITION_MAX_DEPTH) {
      return " score mate " + ((BLACK_MATE_SCORE - score + 1) / 2).toString();
    }

    return " score cp " + score.toString();
  }

  private extractPV(move: i32, depth: i32): string {
    const uciMove = UCIMove.fromEncodedMove(this.board, move).toUCINotation();
    if (depth == 0) {
      return uciMove;
    }

    const targetPieceId = decodePiece(move);
    const moveStart = decodeStartIndex(move);
    const moveEnd = decodeEndIndex(move);
    const previousPiece = this.board.getItem(moveStart);
    const removedPieceId = this.board.performMove(targetPieceId, moveStart, moveEnd);

    const entry = this.transpositionTable.getEntry(this.board.getHash());
    const nextMove = entry != 0 ? decodeMove(getScoredMove(entry)) : 0;

    const isValidFollowUpMove = nextMove != 0 && isValidMove(this.board, this.board.getActivePlayer(), nextMove);
    const followUpUciMoves =  isValidFollowUpMove
      ? " " + this.extractPV(nextMove, depth - 1)
      : "";

    this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);

    return uciMove + followUpUciMoves;
  }

  // Recursively calls itself with alternating player colors to
  // find the best possible move in response to the current board position.
  private recFindBestMove(alpha: i32, beta: i32, playerColor: i32, depth: i32, ply: i32, nullMovePerformed: bool, nullMoveVerification: bool, isInCheck: bool): i32 {

    if (this.isCancelPossible && (this.nodeCount & 1023) == 0 && clock.currentMillis() - this.startTime >= this.timeLimitMillis) {
      // Cancel search if the time limit has been reached or exceeded
      return CANCEL_SEARCH;
    }

    const isPV: bool = (alpha + 1) < beta; // in a principal variation search, non-PV nodes are searched with a zero-window

    if (this.board.isEngineDraw()) {
      this.nodeCount++;
      return 0;
    }

    if (isInCheck) {
      // Extend search when in check
      if (depth < 0) {
        depth = 1;
      } else {
        depth++;
      }

    } else if (depth == 1 && this.board.getScore() * playerColor < alpha - RAZOR_MARGIN) {
      // Directly jump to quiescence search, if current position score is below a certain threshold
      depth = 0;
    }

    // Quiescence search
    if (depth <= 0) {
      const score = this.quiescenceSearch(playerColor, alpha, beta, ply);
      if (score == BLACK_MATE_SCORE) {
        return (score - ply);
      } else if (score == WHITE_MATE_SCORE) {
        return (score + ply);
      }
      return score;
    }

    this.nodeCount++;

    // Check transposition table
    const ttHash = this.board.getHash();
    let ttEntry = this.transpositionTable.getEntry(ttHash);

    let scoredMove = getScoredMove(ttEntry);

    let moves: StaticArray<i32> | null = null;

    let move: i32 = 0;
    let hashMove: i32 = 0;
    let moveIndex: i32 = 0;

    if (scoredMove != 0) {
      if (getDepth(ttEntry) >= depth) {
        const score = decodeScore(scoredMove);

        switch (getScoreType(ttEntry)) {
          case ScoreType.EXACT:
            return score;

          case ScoreType.UPPER_BOUND:
            if (score <= alpha) {
              return alpha;
            }

            break;

          case ScoreType.LOWER_BOUND:
            if (score >= beta) {
              return beta;
            }
        }
      }

      move = decodeMove(scoredMove);

      // Validate hash move for additional protection against hash collisions
      if (move == 0 || !isValidMove(this.board, playerColor, decodeMove(scoredMove))) {
        scoredMove = 0;
        move = 0;
      }

      hashMove = move;
    }

    let failHigh: bool = false;

    // Null move pruning
    if (!isPV && !nullMovePerformed && depth > 2 && !isInCheck) {
      this.board.performNullMove();
      const result = this.recFindBestMove(-beta, -beta + 1, -playerColor, depth - 4, ply + 1, true, false, false);
      this.board.undoNullMove();
      if (result == CANCEL_SEARCH) {
        return CANCEL_SEARCH;
      }
      if (-result >= beta) {
        if (nullMoveVerification) {
          depth--;
          nullMoveVerification = false;
          failHigh = true;
        } else {
          return -result;
        }
      }
    }

    const primaryKillerMove = this.historyHeuristics.getPrimaryKiller(ply);
    const secondaryKillerMove = this.historyHeuristics.getSecondaryKiller(ply);

    if (scoredMove == 0) {
      // Generate moves, if no valid moves were found in the transposition table
      moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor, primaryKillerMove, secondaryKillerMove);
      if (moves.length == 0) {
        // no more moves possible (i.e. check mate or stale mate)
        return this.terminalScore(playerColor, ply) * playerColor;
      }
      scoredMove = unchecked(moves[0]);
      move = decodeMove(scoredMove);
      moveIndex++;
    }

    let bestMove: i32 = 0;
    let bestScore: i32 = MIN_SCORE;
    let scoreType: ScoreType = ScoreType.UPPER_BOUND;
    let evaluatedMoveCount: i32 = 0;
    let hasValidMoves: bool = false;

    const allowReductions: bool = depth > 2 && !isInCheck;

    // Futile move pruning
    let allowFutileMovePruning: bool = false;
    let pruneLowScore: i32 = 0;
    if (!isPV && depth <= 4) {
      pruneLowScore = this.board.getScore() * playerColor + this.getFutilityPruneMargin(depth);
      allowFutileMovePruning = pruneLowScore <= alpha;
    }

    let givesCheck: bool = false;

    do {

      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      const moveState = this.board.performMove(targetPieceId, moveStart, moveEnd);
      const removedPieceId = moveState & ~EN_PASSANT_BIT;

      let skip: bool = this.board.isInCheck(playerColor); // skip if move would put own king in check

      let reductions: i32 = 0;

      if (!skip)  {
        hasValidMoves = true;
        givesCheck = this.board.isInCheck(-playerColor);
        if (removedPieceId == EMPTY) {
          const hasNegativeHistory = this.historyHeuristics.hasNegativeHistory(playerColor, depth, moveStart, moveEnd);
          const ownMovesLeft = (depth + 1) / 2;
          if (!givesCheck && allowReductions && evaluatedMoveCount > LMR_THRESHOLD && !this.board.isPawnMoveCloseToPromotion(previousPiece, moveEnd, ownMovesLeft - 1)) {
            // Reduce search depth for late moves (i.e. after trying the most promising moves)
            reductions = LMR_REDUCTIONS;
            if (hasNegativeHistory || this.board.seeScore(-playerColor, moveStart, moveEnd, targetPieceId, EMPTY) < 0) {
              // Reduce more, if move has negative history or SEE score
              reductions++;
            }

          } else if (!givesCheck && allowFutileMovePruning && targetPieceId == abs(previousPiece)) {
            if (ownMovesLeft <= 1 || (hasNegativeHistory && this.board.seeScore(-playerColor, moveStart, moveEnd, targetPieceId, EMPTY) < 0)) {
              // Prune futile move
              skip = true;
              if (pruneLowScore > bestScore) {
                bestMove = 0;
                bestScore = pruneLowScore; // remember score with added margin for cases when all moves are pruned
              }
            } else {
              // Reduce futile move
              reductions = FUTILE_MOVE_REDUCTIONS;
            }
          } else if (hasNegativeHistory || this.board.seeScore(-playerColor, moveStart, moveEnd, targetPieceId, EMPTY) < 0) {
            // Reduce search depth for moves with negative history or negative SEE score
            reductions = LOSING_MOVE_REDUCTIONS;
          }
        } else if (removedPieceId <= abs(previousPiece) && this.board.seeScore(-playerColor, moveStart, moveEnd, targetPieceId, removedPieceId) < 0) {
          // Reduce search depth for moves with negative capture moves with negative SEE score
          reductions = LOSING_MOVE_REDUCTIONS;
        }
      }

      if (skip) {
        this.board.undoMove(previousPiece, moveStart, moveEnd, moveState);

      } else {
        if (removedPieceId == EMPTY) {
          this.historyHeuristics.updatePlayedMoves(playerColor, moveStart, moveEnd);
        }
        hasValidMoves = true;
        evaluatedMoveCount++;

        let a = evaluatedMoveCount > 1 ? -(alpha + 1) : -beta;
        let result = this.recFindBestMove(a, -alpha, -playerColor, depth - reductions - 1, ply + 1, false, nullMoveVerification, givesCheck);
        if (result == CANCEL_SEARCH) {
          this.board.undoMove(previousPiece, moveStart, moveEnd, moveState);
          return CANCEL_SEARCH;
        }

        if (-result > alpha && (-result < beta || reductions > 0)) {
          // Repeat search without reduction
          result = this.recFindBestMove(-beta, -alpha, -playerColor, depth - 1, ply + 1, false, nullMoveVerification, givesCheck);
          if (result == CANCEL_SEARCH) {
            this.board.undoMove(previousPiece, moveStart, moveEnd, moveState);
            return CANCEL_SEARCH;
          }
        }

        const score = -result;

        this.board.undoMove(previousPiece, moveStart, moveEnd, moveState);

        let improvedAlpha = false;
        // Use mini-max algorithm ...
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;

          // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree
          if (bestScore > alpha) {
            alpha = bestScore;
            scoreType = ScoreType.EXACT;
            improvedAlpha = true;

          }
          if (alpha >= beta) {
            this.transpositionTable.writeEntry(ttHash, depth, encodeScoredMove(bestMove, bestScore), ScoreType.LOWER_BOUND);

            if (removedPieceId == EMPTY) {
              this.historyHeuristics.update(ply, playerColor, moveStart, moveEnd, bestMove);
            }

            return alpha;
          }
        }
      }

      if (moves == null) {
        moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor, primaryKillerMove, secondaryKillerMove);

        if (moves.length == 0) {
          // no more moves possible (i.e. check mate or stale mate)
          break;
        }

      } else if (moveIndex == moves.length) {
        if (failHigh && hasValidMoves) {
          // research required, because a Zugzwang position was detected (fail-high report by null search, but no found cutoff)
          depth++;
          nullMoveVerification = true;
          failHigh = false;
          moveIndex = 0;
          move = bestMove;
          continue;

        } else {
          // Last move has been evaluated
          break;
        }
      }

      scoredMove = unchecked(moves[moveIndex]);
      move = decodeMove(scoredMove);

      moveIndex++;
      while (moveIndex < moves.length && decodeMove(unchecked(moves[moveIndex])) == hashMove) {
        moveIndex++;
      }

    } while (true);

    if (!hasValidMoves) {
      if (isInCheck) {
        // Check mate
        return WHITE_MATE_SCORE + ply;
      }

      // Stalemate
      return 0;
    }

    this.transpositionTable.writeEntry(ttHash, depth, encodeScoredMove(bestMove, bestScore), scoreType);

    return bestScore;
  };

  @inline
  getFutilityPruneMargin(depth: i32): i32 {
    return depth * FUTILITY_MARGIN_MULTIPLIER;
  }

  quiescenceSearch(activePlayer: i32, alpha: i32, beta: i32, ply: i32): i32 {
    this.nodeCount++;

    if (this.board.isEngineDraw()) {
      return 0;
    }

    const positionScore = this.board.getScore() * activePlayer;

    if (ply >= TRANSPOSITION_MAX_DEPTH) {
      return positionScore;
    }

    if (positionScore >= beta) {
      return beta;
    }

    // Prune nodes where the position score is already so far below alpha that it is very unlikely to be raised by any available move
    if (positionScore < alpha - QS_PRUNE_MARGIN) {
      return alpha;
    }

    if (alpha < positionScore) {
      alpha = positionScore;
    }

    const moves = this.sortCaptureMovesByScore(generateCaptureMoves(this.board, activePlayer), activePlayer);

    let threshold = alpha - positionScore - QS_SEE_THRESHOLD;

    for (let i = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);
      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);
      const previousPieceId = abs(previousPiece);
      const capturedPieceId = abs(this.board.getItem(moveEnd));

      // skip captures with a SEE score below the given threshold
      if (this.board.seeScore(-activePlayer, moveStart, moveEnd, previousPieceId, capturedPieceId) <= threshold) {
        continue;
      }

      const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);

      if (this.board.isInCheck(activePlayer)) {
        // Invalid move
        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
        continue;
      }

      const score = -this.quiescenceSearch(-activePlayer, -beta, -alpha, ply + 1);
      this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

      if (score >= beta) {
        return beta;
      }

      if (score > alpha) {
        alpha = score;
        threshold = alpha - positionScore - QS_SEE_THRESHOLD;
      }
    }
    return alpha;
  }

  // Move evaluation heuristic for initial move ordering
  // (low values are better for black and high values are better for white)
  @inline
  evaluateMoveScore(activePlayer: i32, encodedMove: i32): i32 {
    const moveStart = decodeStartIndex(encodedMove);
    const moveEnd = decodeEndIndex(encodedMove);

    const capturedPiece = this.board.getItem(moveEnd);

    if (capturedPiece == EMPTY) {
      const historyScore = this.historyHeuristics.getHistoryScore(activePlayer, moveStart, moveEnd) * activePlayer;
      return -activePlayer * 4096 + historyScore;

    } else {
      const ownOriginalPieceId = activePlayer * this.board.getItem(moveStart); // might be different in case of pawn promotions
      const capturedPieceId = abs(capturedPiece);

      return activePlayer * getCaptureOrderScore(ownOriginalPieceId, capturedPieceId);
    }
  };

  @inline
  evaluateCaptureMoveScore(activePlayer: i32, encodedMove: i32): i32 {
    const moveStart = decodeStartIndex(encodedMove);
    const moveEnd = decodeEndIndex(encodedMove);

    const capturedPiece = this.board.getItem(moveEnd);

    const ownOriginalPieceId = activePlayer * this.board.getItem(moveStart); // might be different in case of pawn promotions
    const capturedPieceId = abs(capturedPiece);

    return activePlayer * getCaptureOrderScore(ownOriginalPieceId, capturedPieceId);
  };

  // Evaluates and sorts all given moves.
  // The moves will be sorted in descending order starting with the best scored moved for the given player color.
  //
  // The score will be encoded in the same 32-Bit integer value that encodes the move (see encodeScoreMove), so
  // the moves array can be modified and sorted in-place.
  @inline
  sortMovesByScore(moves: StaticArray<i32>, playerColor: i32, primaryKillerMove: i32 = 0, secondaryKillerMove: i32 = 0): StaticArray<i32> {
    for (let i: i32 = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);
      let score: i32;

      if (move == primaryKillerMove) {
        score = PRIMARY_KILLER_SCORE_BONUS * playerColor;
      } else if (move == secondaryKillerMove) {
        score = SECONDARY_KILLER_SCORE_BONUS * playerColor;
      } else {
        score = this.evaluateMoveScore(playerColor, move);
      }

      unchecked(moves[i] = encodeScoredMove(move, score));
    }

    if (playerColor == WHITE) {
      sortByScoreDescending(moves);
    } else {
      sortByScoreAscending(moves);
    }

    return moves;
  };

  @inline
  sortCaptureMovesByScore(moves: StaticArray<i32>, playerColor: i32): StaticArray<i32> {
    for (let i: i32 = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);
      const score: i32 = this.evaluateCaptureMoveScore(playerColor, move);

      unchecked(moves[i] = encodeScoredMove(move, score));
    }

    if (playerColor == WHITE) {
      sortByScoreDescending(moves);
    } else {
      sortByScoreAscending(moves);
    }

    return moves;
  };

  // If a check mate position can be achieved, then earlier check mates should have a better score than later check mates
  // to prevent unnecessary delays.
  terminalScore(activePlayer: i32, ply: i32): i32 {
    if (activePlayer == WHITE && isCheckMate(this.board, WHITE)) {
      return WHITE_MATE_SCORE + ply;
    } else if (activePlayer == BLACK && isCheckMate(this.board, BLACK)) {
      return BLACK_MATE_SCORE - ply;
    } else {
      // Stalemate
      return 0;
    }
  };

  getNodeCount(): u64 {
    return this.nodeCount;
  }
}

function shouldExtendTimeLimit(newMove: i32, newScore: i32, previousMove: i32, previousScore: i32, scoreFluctuations: i32, fluctuationCount: i32): bool {
  if (previousMove == 0 || newMove == 0) {
    return false;
  }

  const avgFluctuations = fluctuationCount > 0 ? scoreFluctuations / fluctuationCount : 0;

  return newMove != previousMove || abs(newScore - previousScore) >= TIMEEXT_SCORE_CHANGE_THRESHOLD || avgFluctuations >= TIMEEXT_SCORE_FLUCTUATION_THRESHOLD;
}


class EngineControl {
  private board: Board = fromFEN(STARTPOS);
  private engine: Engine = new Engine();

  setPosition(fen: string): void {
    this.setBoard(fromFEN(fen));
  }

  setBoard(board: Board): void {
    this.board = board;
    this.engine.setBoard(board);
  }

  performMove(move: i32, increaseTTableAge: bool = true): void {
    this.board.performEncodedMove(move);
    this.engine.refreshStateAfterMove(increaseTTableAge);
  }

  perft(depth: i32): u64 {
    return perft(this.getBoard(), depth);
  }

  setUseOpeningBook(useBook: bool): void {
    this.engine.setUseOpeningBook(useBook);
  }

  /** Finds the best move for the current player color.
   *
   * @param minimumDepth Minimum search depth
   * @param timeLimitMillis Time limit for the search in milliseconds
   * @param isStrictTimeLimit Flag to indicate that the time limit is strict and cannot be extended
   */
  findBestMove(minimumDepth: i32, timeLimitMillis: u64, isStrictTimeLimit: bool): i32 {
    const result = this.engine.findBestMove(this.board.getActivePlayer(), minimumDepth, timeLimitMillis, isStrictTimeLimit);

    return decodeMove(result);
  }

  reset(): void {
    this.engine.reset();
  }

  generateAvailableMoves(): StaticArray<i32> {
    return generateFilteredMoves(this.board, this.board.getActivePlayer());
  }

  getBoard(): Board {
    return this.board;
  }

  resizeTranspositionTable(sizeInMB: u32): void {
    this.engine.resizeTranspositionTable(sizeInMB);
  }

  getNodeCount(): u64 {
    return this.engine.getNodeCount();
  }

}

const CONTROL_INSTANCE = new EngineControl();

export default CONTROL_INSTANCE;
