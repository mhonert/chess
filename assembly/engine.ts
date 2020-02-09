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
  isCheckMate
} from './move-generation';
import { ScoreType, TRANSPOSITION_MAX_DEPTH, TranspositionTable } from './transposition-table';
import { fromFEN, STARTPOS } from './fen';
import { PositionHistory } from './history';
import { PIECE_VALUES, QUEEN_VALUE } from './pieces';
import { KillerMoveTable } from './killermove-table';
import { clock, stdio } from './io';
import { UCIMove } from './uci-move-notation';
import { perft } from './perft';

export const MIN_SCORE = -16383;
export const MAX_SCORE = 16383;

export const WHITE_MATE_SCORE: i32 = -16000;
export const BLACK_MATE_SCORE: i32 = 16000;

const CANCEL_SEARCH = i32.MAX_VALUE - 1;

const ASPIRATION_WINDOW_SIZE = 4;

const CONTEMPT_FACTOR: i32 = 0;

export class Engine {

  private tablesInitialized: bool = false;
  private transpositionTable: TranspositionTable;
  private killerMoveTable: KillerMoveTable;
  private history: PositionHistory = new PositionHistory();
  private board: Board;
  private startTime: u64 = 0;
  private moveCount: i32 = 0;
  private qsMoveCount: i32 = 0;
  private cacheHits: i32 = 0;
  private timeLimitMillis: u64;
  private minimumDepth: i32;
  private moveHits: i32 = 0;
  private repeatedSearches: i32 = 0;
  private isEndGame: bool = false;
  private isCancelPossible: bool = false;

  constructor() {
    this.reset();
  }

  init(): void {
    if (!this.tablesInitialized) {
      this.tablesInitialized = true;
      this.transpositionTable = new TranspositionTable();
      this.killerMoveTable = new KillerMoveTable();
    }
  }

  reset(): void {
    this.history.clear();
    this.board = fromFEN(STARTPOS);
    this.board.setHistory(this.history);
    if (this.transpositionTable != null) {
      this.transpositionTable.clear();
    }
  }

  setBoard(board: Board): void {
    if (!this.tablesInitialized) {
      this.init();
    } else {
      this.killerMoveTable.clear();
      this.transpositionTable.increaseAge();
    }
    this.board = board;

    this.history.clear();

    this.board.setHistory(this.history);

    this.isEndGame = board.isEndGame();
  }

  refreshStateAfterMove(): void {
    this.transpositionTable.increaseAge();
    this.killerMoveTable.clear();
    if (this.board.getHalfMoveClock() == 0) {
      this.history.clear();
    }
    this.isEndGame = this.board.isEndGame();
  }

  // Find the best possible move in response to the current board position.
  findBestMove(alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, minimumDepth: i32, timeLimitMillis: u64, depth: i32): i32 {

    this.timeLimitMillis = timeLimitMillis;
    this.minimumDepth = minimumDepth;
    this.startTime = clock.currentMillis();
    this.moveCount = 0;
    this.qsMoveCount = 0;
    this.cacheHits = 0;
    this.moveHits = 0;

    const moves = this.sortMovesByScore(generateFilteredMoves(this.board, playerColor), playerColor, depth, 0, 0);

    if (moves.length == 1) {
      const score = decodeScore(unchecked(moves[0]));
      const move = decodeMove(unchecked(moves[0]));
      return encodeScoredMove(move, score * playerColor);
    }

    if (moves.length == 0) {
      // no more moves possible (i.e. check mate or stale mate)
      return encodeScoredMove(0, this.terminalScore(playerColor, depth) * playerColor);
    }


    let bestMove: i32 = 0;
    let bestScoredMove: i32 = 0;

    const initialAlpha = alpha;
    const initialBeta = beta;

    let repetitionCounter: i32 = 0;
    this.isCancelPossible = false;

    // Use iterative deepening, i.e. increase the search depth after each iteration
    do {
      let bestScore: i32 = MIN_SCORE;
      let scoredMoves = 0;

      let previousAlpha = alpha;
      let previousBeta = beta;

      let repeatSearch = false;

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
          depth + 1,
          false,
          true
        );
        if (result == CANCEL_SEARCH) {
          this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
          break;
        }

        const score = -result;

        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);

        // Use mini-max algorithm ...
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
          alpha = max(alpha, bestScore);

          if (bestScore <= previousAlpha || bestScore >= previousBeta) {
            repeatSearch = true;
            break;
          }
        }

        unchecked(moves[i] = encodeScoredMove(move, score));
        scoredMoves++;

        if (this.isCancelPossible && clock.currentMillis() - this.startTime >= timeLimitMillis) {
          break;
        }

        // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
      }

      if (this.isCancelPossible && (clock.currentMillis() - this.startTime >= timeLimitMillis || (remainingLevels + 1) > TRANSPOSITION_MAX_DEPTH)) {

        if (repeatSearch) {
          // Previous search is invalid => skip results
          return bestScoredMove;

        } else {
          const evaluatedMoveSubSet: Int32Array = moves.subarray(0, max(1, scoredMoves));
          this.sortByScoreDescending(evaluatedMoveSubSet);

          const selectedMove = evaluatedMoveSubSet[0];
          return selectedMove;

        }
      }

      if (repeatSearch) {
        this.repeatedSearches++;
        repetitionCounter++;

        if (repetitionCounter > 1) {
          alpha = initialAlpha;
          beta = initialBeta;
        } else {
          if (bestScore <= previousAlpha) {
            alpha = previousAlpha - (ASPIRATION_WINDOW_SIZE << repetitionCounter);
            beta = previousBeta;
          } else if (bestScore >= previousBeta) {
            alpha = previousAlpha;
            beta = previousBeta + (ASPIRATION_WINDOW_SIZE << repetitionCounter);
          }
        }
        continue;
      }

      bestScoredMove = encodeScoredMove(bestMove, bestScore);
      const depthInfo = "depth " + remainingLevels.toString();
      const scoreInfo = "score cp " + (bestScore * playerColor).toString();
      const pvInfo = "pv " + UCIMove.fromEncodedMove(this.board, bestMove).toUCINotation();
      stdio.writeLine("info " + depthInfo + " " + scoreInfo + " " + pvInfo);

      this.sortByScoreDescending(moves);

      remainingLevels += 1;

      repetitionCounter = 0;
      alpha = bestScore - ASPIRATION_WINDOW_SIZE;
      beta = bestScore + ASPIRATION_WINDOW_SIZE;
      this.isCancelPossible = remainingLevels > minimumDepth;

    } while (true);

    return 0;
  };

  // Recursively calls itself with alternating player colors to
  // find the best possible move in response to the current board position.
  private recFindBestMove(alpha: i32, beta: i32, playerColor: i32, remainingLevels: i32, depth: i32, nullMovePerformed: bool, nullMoveVerificationRequired: bool): i32 {

    if (this.board.isThreefoldRepetion()) {
      return CONTEMPT_FACTOR * playerColor;
    }

    // Quiescence search
    if (remainingLevels <= 0) {
      const score = this.quiescenceSearch(playerColor, alpha, beta, depth);
      if (score == BLACK_MATE_SCORE) {
        return (score - depth);
      } else if (score == WHITE_MATE_SCORE) {
        return (score + depth);
      }
      return score;
    }

    // Check transposition table
    const ttHash = this.board.getHash();
    let scoredMove = this.transpositionTable.getScoredMove(ttHash);

    let moves: Int32Array | null = null;

    let move: i32 = 0;
    let hashMove: i32 = 0;
    let moveIndex: i32 = 0;

    if (scoredMove != 0) {
      if (this.transpositionTable.getDepth(ttHash) >= remainingLevels) {
        const score = decodeScore(scoredMove);
        const type = this.transpositionTable.getScoreType(ttHash);
        if (type == ScoreType.EXACT) {
          this.cacheHits++;
          return score;
        } else if (type == ScoreType.ALPHA && score <= alpha) {
          this.cacheHits++;
          return alpha;
        } else if (type == ScoreType.BETA && score >= beta) {
          this.cacheHits++;
          return beta;
        }
      }

      move = decodeMove(scoredMove);
      hashMove = move;

      this.moveHits++;
    }

    let failHigh: bool = false;

    // Null move pruning
    if (!nullMovePerformed && remainingLevels > 2 && !this.board.isInCheck(playerColor)) {
      this.board.performNullMove();
      const result = this.recFindBestMove(
        -beta,
        -beta + 1,
        -playerColor,
        remainingLevels - 4,
        depth + 1,
        true,
        false
      );
      this.board.undoNullMove();
      if (result == CANCEL_SEARCH) {
        return CANCEL_SEARCH;
      }
      if (-result >= beta) {
        if (nullMoveVerificationRequired) {
          remainingLevels--;
          nullMoveVerificationRequired = false;
          failHigh = true;
        } else {
          return -result;
        }
      }
    }

    const primaryKillerMove = this.killerMoveTable.getPrimaryKiller(depth);
    const secondaryKillerMove = this.killerMoveTable.getSecondaryKiller(depth);

    if (scoredMove == 0) {
      // Generate moves, if no valid moves were found in the transposition or killer move tables
      moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor, depth, primaryKillerMove, secondaryKillerMove);
      if (moves.length == 0) {
        // no more moves possible (i.e. check mate or stale mate)
        return this.terminalScore(playerColor, depth) * playerColor;
      }
      scoredMove = moves[0];
      move = decodeMove(scoredMove);
      moveIndex++;
    }

    let bestMove: i32 = 0;
    let bestScore: i32 = MIN_SCORE;
    let scoreType: ScoreType = ScoreType.ALPHA;

    do {

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
          depth + 1,
          false,
          nullMoveVerificationRequired
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

          // ... with alpha-beta-pruning to eliminate unnecessary branches of the search tree:
          if (bestScore > alpha) {
            alpha = bestScore;
            scoreType = ScoreType.EXACT;
          }
          if (alpha >= beta) {
            this.transpositionTable.writeEntry(ttHash, remainingLevels, encodeScoredMove(bestMove, bestScore), ScoreType.BETA);

            if (bestMove != hashMove && removedPiece == EMPTY) {
              this.killerMoveTable.writeEntry(depth, moveStart, moveEnd, bestMove);
            }
            return alpha;
          }
        }

      }

      if (this.isCancelPossible && clock.currentMillis() - this.startTime >= this.timeLimitMillis) {
        // Cancel search
        return CANCEL_SEARCH;
      }

      if (moves == null) {
        moves = this.sortMovesByScore(generateMoves(this.board, playerColor), playerColor, depth, primaryKillerMove, secondaryKillerMove);

        if (moves.length == 0) {
          // no more moves possible (i.e. check mate or stale mate)
          break;
        }

      } else if (moveIndex == moves.length) {
        if (failHigh && bestScore < beta) {
          // research required, because a Zugzwang position was detected (fail-high report by null search, but no found cutoff)
          remainingLevels++;
          nullMoveVerificationRequired = true;
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

    if (bestMove == 0) { // no legal move found?
      if (this.board.isInCheck(playerColor)) {
        // Check mate
        return WHITE_MATE_SCORE + depth;
      }

      // Stalemate
      return CONTEMPT_FACTOR * playerColor;
    }

    this.transpositionTable.writeEntry(ttHash, remainingLevels, encodeScoredMove(bestMove, bestScore), scoreType);

    return bestScore;
  };


  quiescenceSearch(activePlayer: i32, alpha: i32, beta: i32, depth: i32): i32 {
    if (this.board.isThreefoldRepetion()) {
      return CONTEMPT_FACTOR * activePlayer;
    }

    const standPat = this.evaluatePosition(activePlayer, depth) * activePlayer;

    if (depth >= TRANSPOSITION_MAX_DEPTH) {
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

    const moves = this.board.isInCheck(activePlayer)
      ? this.sortMovesByScore(generateMoves(this.board, activePlayer), activePlayer, depth, 0, 0)
      : this.sortMovesByScore(generateCaptureMoves(this.board, activePlayer), activePlayer, depth, 0, 0);

    for (let i = 0; i < moves.length; i++) {
      const move = unchecked(moves[i]);
      const targetPieceId = decodePiece(move);
      const moveStart = decodeStartIndex(move);
      const moveEnd = decodeEndIndex(move);
      const previousPiece = this.board.getItem(moveStart);

      const removedPiece = this.board.performMove(targetPieceId, moveStart, moveEnd);
      this.qsMoveCount++;

      if (this.board.isInCheck(activePlayer)) {
        // Invalid move
        this.board.undoMove(previousPiece, moveStart, moveEnd, removedPiece);
        continue;
      }

      const score = -this.quiescenceSearch(-activePlayer, -beta, -alpha, depth++);
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
  sortMovesByScore(moves: Int32Array, playerColor: i32, depth: i32, primaryKillerMove: i32, secondaryKillerMove: i32): Int32Array {
    const killerScore = 64 * playerColor;

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

  @inline
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
   */
  @inline
  evaluatePosition(activePlayer: i32, depth: i32): i32 {
    // Check mate is the best possible score for the other player
    if (activePlayer == BLACK && isCheckMate(this.board, BLACK)) {
      return BLACK_MATE_SCORE - depth;
    } else if (activePlayer == WHITE && isCheckMate(this.board, WHITE)) {
      return WHITE_MATE_SCORE + depth;
    }

    return this.board.getScore();
  };

  // If a check mate position can be achieved, then earlier check mates should have a better score than later check mates
  // to prevent unnecessary delays.
  terminalScore(activePlayer: i32, depth: i32): i32 {
    if (activePlayer == WHITE && isCheckMate(this.board, WHITE)) {
      return WHITE_MATE_SCORE + depth;
    } else if (activePlayer == BLACK && isCheckMate(this.board, BLACK)) {
      return BLACK_MATE_SCORE - depth;
    } else {
      // Stalemate
      return CONTEMPT_FACTOR;
    }
  };
}


class EngineControl {
  private board: Board;
  private engine: Engine = new Engine();

  init(): void {
    this.engine.init();
  }

  setPosition(fen: string): void {
    this.setBoard(fromFEN(fen));
  }

  setBoard(board: Board): void {
    this.board = board;
    this.board.updateEndGameStatus();
    this.engine.setBoard(board);
  }

  performMove(move: i32): void {
    this.board.performEncodedMove(move);
    this.board.updateEndGameStatus();
    this.engine.refreshStateAfterMove();
  }

  perft(depth: i32): u64 {
    return perft(this.getBoard(), depth);
  }

  /** Finds the best move for the current player color.
   *
   * @param startingDepth Starting depth level for incremental search
   * @param minimumDepth Minimum depth level to achieve
   * @param timeLimitMillis Time limit for the search in milliseconds
   */
  findBestMove(startingDepth: i32, minimumDepth: i32, timeLimitMillis: u64): i32 {
    let alpha: i32 = MIN_SCORE;
    let beta: i32 = MAX_SCORE;

    const result = this.engine.findBestMove(alpha, beta, this.board.getActivePlayer(), startingDepth, minimumDepth, timeLimitMillis, 0);

    return decodeMove(result);
  }

  reset(): void {
    this.engine.reset();
  }

  generateAvailableMoves(): Int32Array {
    return generateFilteredMoves(this.board, this.board.getActivePlayer());
  }

  getBoard(): Board {
    return this.board;
  }
}

const CONTROL_INSTANCE = new EngineControl();

export default CONTROL_INSTANCE;
