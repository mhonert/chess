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
  isLikelyValidMove
} from './move-generation';
import {
  getDepth,
  getScoredMove, getScoreType,
  ScoreType,
  TRANSPOSITION_MAX_DEPTH,
  TranspositionTable
} from './transposition-table';
import { fromFEN, STARTPOS } from './fen';
import { PositionHistory } from './history';
import { PAWN, PAWN_VALUE, PIECE_VALUES, QUEEN_VALUE, ROOK_VALUE } from './pieces';
import { KillerMoveTable } from './killermove-table';
import { clock, stdio } from './io';
import { UCIMove } from './uci-move-notation';
import { perft } from './perft';

export const MIN_SCORE = -16383;
export const MAX_SCORE = 16383;

export const WHITE_MATE_SCORE: i32 = -16000;
export const BLACK_MATE_SCORE: i32 = 16000;

const CANCEL_SEARCH = i32.MAX_VALUE - 1;

const PRUNE_SAFETY_MARGINS = StaticArray.fromArray<i32>([0, PAWN_VALUE, ROOK_VALUE, ROOK_VALUE + PAWN_VALUE, QUEEN_VALUE, QUEEN_VALUE + PAWN_VALUE]);
const PRUNE_MAX_LEVEL: i32 = PRUNE_SAFETY_MARGINS.length;

export class Engine {

  private transpositionTable: TranspositionTable = new TranspositionTable();
  private killerMoveTable: KillerMoveTable = new KillerMoveTable();
  private history: PositionHistory = new PositionHistory();
  private board: Board;
  private startTime: i64 = 0;
  private nodeCount: u64 = 0;
  private timeLimitMillis: i64;
  private isEndGame: bool = false;
  private isCancelPossible: bool = false;

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
    this.killerMoveTable.clear();
    this.transpositionTable.increaseAge();

    this.board = board;

    this.history.clear();

    this.board.setHistory(this.history);

    this.isEndGame = board.isEndGame();
  }

  refreshStateAfterMove(increaseTTableAge: bool): void {
    if (increaseTTableAge) {
      this.transpositionTable.increaseAge();
    }
    this.killerMoveTable.clear();
    if (this.board.getHalfMoveClock() == 0) {
      this.history.clear();
    }
    this.isEndGame = this.board.isEndGame();
  }

  // Find the best possible move in response to the current board position.
  findBestMove(playerColor: i32, minimumDepth: i32, timeLimitMillis: i64): i32 {
    let alpha: i32 = MIN_SCORE;
    let beta: i32 = MAX_SCORE;

    this.timeLimitMillis = timeLimitMillis;
    this.startTime = clock.currentMillis();

    const isInCheck = this.board.isInCheck(playerColor);
    const moves = this.sortMovesByScore(generateFilteredMoves(this.board, playerColor), playerColor, 0, 0);

    if (moves.length == 1) {
      const score = decodeScore(unchecked(moves[0]));
      const move = decodeMove(unchecked(moves[0]));
      return encodeScoredMove(move, score * playerColor);
    }

    if (moves.length == 0) {
      // no more moves possible (i.e. check mate or stale mate)
      return encodeScoredMove(0, this.terminalScore(playerColor, 0) * playerColor);
    }


    let bestScoredMove: i32 = 0;

    this.isCancelPossible = false;

    // Use iterative deepening, i.e. increase the search depth after each iteration
    for (let depth: i32 = 2; depth < TRANSPOSITION_MAX_DEPTH; depth++) {
      this.nodeCount = 0;
      let bestScore: i32 = MIN_SCORE;
      let scoredMoves = 0;

      let previousAlpha = alpha;
      let previousBeta = beta;

      const iterationStartTime = clock.currentMillis();

      let bestMove: i32 = 0;

      let a = -beta; // Search principal variation node with full window

      const allowReductions = !isInCheck && depth >= 7;
      let moveCountAfterPVChange = 0;

      for (let i: i32 = 0; i < moves.length; i++) {
        const scoredMove = unchecked(moves[i]);

        const move = decodeMove(scoredMove);

        const targetPieceId = decodePiece(move);
        const moveStart = decodeStartIndex(move);
        const moveEnd = decodeEndIndex(move);
        const previousPiece = this.board.getItem(moveStart);

        const removedPieceId = this.board.performMove(targetPieceId, moveStart, moveEnd);

        let reductions: i32 = (allowReductions && removedPieceId == EMPTY && moveCountAfterPVChange > 3 && !isPawnMoveCloseToPromotion(previousPiece, targetPieceId) && !this.board.isInCheck(-playerColor))
          ? 2 : 0;

        // Use principal variation search
        let result = this.recFindBestMove(a, -alpha, -playerColor, depth - reductions - 1, 1, false, true);
        if (result == CANCEL_SEARCH) {
          this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);
          break;
        }

        // Repeat search if it falls outside the window
        if (-result > alpha && (-result < beta || reductions > 0)) {
          result = this.recFindBestMove(-beta, -alpha, -playerColor, depth - 1, 1, false, true);
          if (result == CANCEL_SEARCH) {
            this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);
            break;
          }
        }

        const score = -result;

        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);

        if (score > bestScore) {
          moveCountAfterPVChange = 0;
          bestScore = score;
          bestMove = move;
          alpha = max(alpha, bestScore);
        }

        moveCountAfterPVChange++;
        a = -(alpha + 1); // Search all other moves (after principal variation) with a zero window

        unchecked(moves[i] = encodeScoredMove(move, score));
        scoredMoves++;

        if (this.isCancelPossible && clock.currentMillis() - this.startTime >= timeLimitMillis) {
          break;
        }

      }

      const currentTime = clock.currentMillis();
      const iterationDuration = currentTime - iterationStartTime;
      const totalDuration = currentTime - this.startTime;
      const remainingTime = timeLimitMillis - totalDuration;

      if (this.isCancelPossible && (remainingTime <= (iterationDuration * 2))) {
        if (bestMove != 0) {
          bestScoredMove = encodeScoredMove(bestMove, bestScore);
          break;

        } else {
          // Last search is incomplete => use result of previous iteration
          break;

        }
      }

      bestScoredMove = encodeScoredMove(bestMove, bestScore);
      const depthInfo = "depth " + depth.toString();
      const scoreInfo = " score cp " + (bestScore * playerColor).toString();
      const pvInfo = " pv " + this.extractPV(bestMove, depth - 1);
      const nodesPerSecond = iterationDuration > 0 ? this.nodeCount * 1000 / iterationDuration : 0;

      const nodesInfo = " nodes " + this.nodeCount.toString();
      const npsInfo = nodesPerSecond > 0 ? " nps " + nodesPerSecond.toString() : "";

      const timeInfo = " time " + totalDuration.toString();

      stdio.writeLine("info " + depthInfo + scoreInfo + nodesInfo + npsInfo + timeInfo + pvInfo);

      this.sortByScoreDescending(moves);

      alpha = previousAlpha;
      beta = previousBeta;
      this.isCancelPossible = depth >= minimumDepth;
    };

    return bestScoredMove;
  };

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

    const followUpUciMoves = nextMove != 0 && isLikelyValidMove(this.board, this.board.getActivePlayer(), nextMove)
      ? " " + this.extractPV(nextMove, depth - 1)
      : "";

    this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);

    return uciMove + followUpUciMoves;
  }

  // Recursively calls itself with alternating player colors to
  // find the best possible move in response to the current board position.
  private recFindBestMove(alpha: i32, beta: i32, playerColor: i32, depth: i32, ply: i32, nullMovePerformed: bool, nullMoveVerification: bool): i32 {

    this.nodeCount++;

    const isPV: bool = (alpha + 1) < beta; // in a principal variation search, non-PV nodes are searched with a zero-window

    if (this.board.isEngineDraw()) {
      return 0;
    }

    const isInCheck = this.board.isInCheck(playerColor);

    // Extend search if current player is in check
    if (depth <= 0 && isInCheck) {
      depth = 1;
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


    // Check transposition table
    const ttHash = this.board.getHash();
    let ttEntry = this.transpositionTable.getEntry(ttHash);

    // Internal iterative deepening
    if (ttEntry == 0 && isPV && depth >= 5) {
      const reducedDepth = depth >= 12 ? depth / 3 + 1 : depth / 2;
      const result = this.recFindBestMove(alpha, beta, playerColor, reducedDepth, ply + 1, false, nullMoveVerification);
      if (result == CANCEL_SEARCH) {
        return CANCEL_SEARCH;
      }

      ttEntry = this.transpositionTable.getEntry(ttHash);
    }

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
      if (move == 0 || !isLikelyValidMove(this.board, playerColor, decodeMove(scoredMove))) {
        scoredMove = 0;
      }

      hashMove = move;
    }

    let failHigh: bool = false;

    // Null move pruning
    if (!isPV && !nullMovePerformed && depth > 2 && !isInCheck) {
      this.board.performNullMove();
      const result = this.recFindBestMove(-beta, -beta + 1, -playerColor, depth - 4, ply + 1, true, false);
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

    const primaryKillerMove = this.killerMoveTable.getPrimaryKiller(ply);
    const secondaryKillerMove = this.killerMoveTable.getSecondaryKiller(ply);

    if (scoredMove == 0) {
      // Generate moves, if no valid moves were found in the transposition or killer move tables
      moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor, primaryKillerMove, secondaryKillerMove);
      if (moves.length == 0) {
        // no more moves possible (i.e. check mate or stale mate)
        return this.terminalScore(playerColor, ply) * playerColor;
      }
      scoredMove = moves[0];
      move = decodeMove(scoredMove);
      moveIndex++;
    }

    let bestMove: i32 = 0;
    let bestScore: i32 = MIN_SCORE;
    let scoreType: ScoreType = ScoreType.UPPER_BOUND;
    let evaluatedMoveCount: i32 = 0;
    let hasValidMoves: bool = false;

    const allowReductions: bool = depth > 2;

    let moveCountAfterPVChange = 0;

    do {

      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      const removedPieceId = this.board.performMove(targetPieceId, moveStart, moveEnd);

      let skip: bool = this.board.isInCheck(playerColor); // skip if move would put own king in check

      let reductions: i32 = 0;

      if (!skip && !this.board.isInCheck(-playerColor))  {
        hasValidMoves = true;

        if (depth <= PRUNE_MAX_LEVEL)  {
          const pruneLowScore = this.board.getScore() * playerColor + unchecked(PRUNE_SAFETY_MARGINS[depth - 1]);
          // Skip moves which, even with an added safety margin, are unlikely to increase alpha
          if (pruneLowScore <= alpha) {
            skip = true;
            if (pruneLowScore > bestScore) {
              bestMove = 0;
              bestScore = pruneLowScore; // remember score with added margin for cases when all moves are pruned
            }
          }
        }

        if (!skip && !isInCheck && allowReductions) {
          if (moveCountAfterPVChange > 3 && removedPieceId == EMPTY && !isPawnMoveCloseToPromotion(previousPiece, moveEnd)) {
            // Reduce search depth for late moves (i.e. after trying the most promising moves)
            reductions = 2;
          } else if (removedPieceId <= abs(previousPiece) && this.board.isAttacked(-playerColor, moveEnd) && !this.board.isAttacked(playerColor, moveEnd)) {
            // Reduce search depth if the target square is empty or has a lower/equal value, is defended and not defended by an own piece
            reductions = 2;
          }
        }

      }

      if (skip) {
        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);

      } else {
        hasValidMoves = true;
        evaluatedMoveCount++;

        let a = evaluatedMoveCount > 1 ? -(alpha + 1) : -beta;
        let result = this.recFindBestMove(a, -alpha, -playerColor, depth - reductions - 1, ply + 1, false, nullMoveVerification);
        if (result == CANCEL_SEARCH) {
          this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);
          return CANCEL_SEARCH;
        }

        if (-result > alpha && (-result < beta || reductions > 0)) {
          // Repeat search without reduction
          result = this.recFindBestMove(-beta, -alpha, -playerColor, depth - 1, ply + 1, false, nullMoveVerification);
          if (result == CANCEL_SEARCH) {
            this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);
            return CANCEL_SEARCH;
          }

        }

        const score = -result;

        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPieceId);

        // Use mini-max algorithm ...
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;

          // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
          if (bestScore > alpha) {
            moveCountAfterPVChange = 0;
            alpha = bestScore;
            scoreType = ScoreType.EXACT;
          }
          if (alpha >= beta) {
            this.transpositionTable.writeEntry(ttHash, depth, encodeScoredMove(bestMove, bestScore), ScoreType.LOWER_BOUND);

            if (bestMove != hashMove && removedPieceId == EMPTY) {
              this.killerMoveTable.writeEntry(ply, moveStart, moveEnd, bestMove);
            }
            return alpha;
          }
        }
      }
      moveCountAfterPVChange++;

      if (this.isCancelPossible && (this.nodeCount & 15) == 0 && clock.currentMillis() - this.startTime >= this.timeLimitMillis) {
        // Cancel search
        return CANCEL_SEARCH;
      }

      if (moves == null) {
        moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor, primaryKillerMove, secondaryKillerMove);

        if (moves.length == 0) {
          // no more moves possible (i.e. check mate or stale mate)
          break;
        }

      } else if (moveIndex == moves.length) {
        if (failHigh && bestScore < beta) {
          // research required, because a Zugzwang position was detected (fail-high report by null search, but no found cutoff)
          depth++;
          nullMoveVerification = true;
          failHigh = false;
          moveIndex = 0;
        } else {
          // Last move has been evaluated
          break;
        }
      }

      scoredMove = unchecked(moves[moveIndex]);
      move = decodeMove(scoredMove);

      moveIndex++;

    } while (true);

    if (!hasValidMoves) {
      if (this.board.isInCheck(playerColor)) {
        // Check mate
        return WHITE_MATE_SCORE + ply;
      }

      // Stalemate
      return 0;
    }

    this.transpositionTable.writeEntry(ttHash, depth, encodeScoredMove(bestMove, bestScore), scoreType);

    return bestScore;
  };

  quiescenceSearch(activePlayer: i32, alpha: i32, beta: i32, ply: i32): i32 {
    this.nodeCount++;

    if (this.board.isEngineDraw()) {
      return 0;
    }

    const standPat = this.evaluatePosition(activePlayer, ply) * activePlayer;

    if (ply >= TRANSPOSITION_MAX_DEPTH) {
      return standPat;
    }

    if (standPat >= beta) {
      return beta;
    }

    // Delta pruning
    if (!this.isEndGame && standPat < alpha - QUEEN_VALUE) {
      return alpha;
    }

    if (alpha < standPat) {
      alpha = standPat;
    }

    const moves = this.sortMovesByScore(generateCaptureMoves(this.board, activePlayer), activePlayer, ply, 0);

    for (let i = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);
      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      if (abs(this.board.getItem(moveEnd)) <= abs(previousPiece) && this.board.isAttacked(-activePlayer, moveEnd)) {
        const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);
        const isAttackerDefended = this.board.isAttacked(activePlayer, moveEnd);
        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

        if (!isAttackerDefended) {
          // skip move if the attacked piece has lower or equal value, is defended and not defended by an own piece
          continue;
        }
      }

      const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);

      if (this.board.isInCheck(activePlayer)) {
        // Invalid move
        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
        continue;
      }

      const score = -this.quiescenceSearch(-activePlayer, -beta, -alpha, ply++);
      this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

      if (score >= beta) {
        return beta;
      }

      if (score > alpha) {
        alpha = score;
      }
    }
    return alpha;
  }

  // Move evaluation heuristic for initial move ordering
  // (low values are better for black and high values are better for white)
  @inline
  evaluateMoveScore(activePlayer: i32, encodedMove: i32): i32 {
    const ownTargetPieceId = decodePiece(encodedMove);
    const moveStart = decodeStartIndex(encodedMove);
    const moveEnd = decodeEndIndex(encodedMove);
    const ownOriginalPieceId = activePlayer * this.board.getItem(moveStart); // might be different in case of pawn promotions

    const posScore = this.board.calculateScore(moveEnd, activePlayer, ownTargetPieceId) - this.board.calculateScore(moveStart, activePlayer, ownOriginalPieceId);
    const capturedPieceId = this.board.getItem(moveEnd);

    const captureScore = capturedPieceId == EMPTY ? -activePlayer * 4096 : activePlayer * (unchecked(PIECE_VALUES[capturedPieceId - 1]) - unchecked(PIECE_VALUES[ownOriginalPieceId - 1]));
    return captureScore + posScore;
  };


  // Evaluates and sorts all given moves.
  // The moves will be sorted in descending order starting with the best scored moved for the given player color.
  //
  // The score will be encoded in the same 32-Bit integer value that encodes the move (see encodeScoreMove), so
  // the moves array can be modified and sorted in-place.
  @inline
  sortMovesByScore(moves: StaticArray<i32>, playerColor: i32, primaryKillerMove: i32, secondaryKillerMove: i32): StaticArray<i32> {
    const killerScore = 256 * playerColor;

    for (let i: i32 = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);
      let score: i32 = this.evaluateMoveScore(playerColor, move);

      if (move == primaryKillerMove) {
        score += killerScore;
      } else if (move == secondaryKillerMove) {
        score += killerScore / 2;
      }

      unchecked(moves[i] = encodeScoredMove(move, score));
    }

    if (playerColor == WHITE) {
      this.sortByScoreDescending(moves);
    } else {
      this.sortByScoreAscending(moves);
    }

    return moves;
  };

  @inline
  sortByScoreDescending(moves: StaticArray<i32>): void {
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

  @inline
  sortByScoreAscending(moves: StaticArray<i32>): void {
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
   */
  @inline
  evaluatePosition(activePlayer: i32, ply: i32): i32 {
    return this.board.getScore();
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
}

@inline
function isPawnMoveCloseToPromotion(previousPiece: i32, moveEnd: i32): bool {
  return (previousPiece == PAWN && moveEnd <= 23) || // White moves to last three lines
         (previousPiece == -PAWN && moveEnd >= 40); // Black moves to last three lines
}

class EngineControl {
  private board: Board;
  private engine: Engine = new Engine();

  setPosition(fen: string): void {
    this.setBoard(fromFEN(fen));
  }

  setBoard(board: Board): void {
    this.board = board;
    this.board.updateEndGameStatus();
    this.engine.setBoard(board);
  }

  performMove(move: i32, increaseTTableAge: bool = true): void {
    this.board.performEncodedMove(move);
    this.board.updateEndGameStatus();
    this.engine.refreshStateAfterMove(increaseTTableAge);
  }

  perft(depth: i32): u64 {
    return perft(this.getBoard(), depth);
  }

  /** Finds the best move for the current player color.
   *
   * @param minimumDepth Minimum search depth
   * @param timeLimitMillis Time limit for the search in milliseconds
   */
  findBestMove(minimumDepth: i32, timeLimitMillis: u64): i32 {
    const result = this.engine.findBestMove(this.board.getActivePlayer(), minimumDepth, timeLimitMillis);

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
}

const CONTROL_INSTANCE = new EngineControl();

export default CONTROL_INSTANCE;
