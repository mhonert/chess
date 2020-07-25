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

import {
  BISHOP,
  BLACK_ENPASSANT_LINE_END,
  BLACK_ENPASSANT_LINE_START,
  BLACK_KING_SIDE_ROOK_START,
  BLACK_PAWNS_BASELINE_START,
  BLACK_QUEEN_SIDE_ROOK_START,
  EG_PIECE_VALUES,
  KING,
  KNIGHT,
  PAWN,
  PIECE_VALUES,
  QUEEN,
  ROOK,
  WHITE_ENPASSANT_LINE_END,
  WHITE_ENPASSANT_LINE_START,
  WHITE_KING_SIDE_ROOK_START,
  WHITE_PAWNS_BASELINE_START,
  WHITE_QUEEN_SIDE_ROOK_START
} from './pieces';
import { packScores, sign, unpackFirstScore, unpackSecondScore } from './util';
import { decodeEndIndex, decodePiece, decodeStartIndex } from './move-generation';
import { CASTLING_RNG_NUMBERS, EN_PASSANT_RNG_NUMBERS, PIECE_RNG_NUMBERS, PLAYER_RNG_NUMBER } from './zobrist';
import { PositionHistory } from './history';
import {
  antiDiagonalAttacks,
  BLACK_KING_SHIELD_PATTERNS,
  BLACK_PAWN_FREEPATH_PATTERNS,
  blackLeftPawnAttacks,
  blackRightPawnAttacks,
  DARK_COLORED_FIELD_PATTERN,
  diagonalAttacks,
  horizontalAttacks, KING_DANGER_ZONE_PATTERNS,
  KING_PATTERNS,
  KNIGHT_PATTERNS,
  LIGHT_COLORED_FIELD_PATTERN,
  verticalAttacks,
  WHITE_KING_SHIELD_PATTERNS,
  WHITE_PAWN_FREEPATH_PATTERNS,
  whiteLeftPawnAttacks,
  whiteRightPawnAttacks
} from './bitboard';

export const WHITE_KING_START = 60;
export const BLACK_KING_START = 4;

const HALFMOVE_CLOCK_INDEX = 64;
const HALFMOVE_COUNT_INDEX = 65;
const STATE_INDEX = 66;

export const MAX_FIELD_DISTANCE: i32 = 7; // maximum distance between two fields on the board

const MAX_GAME_HALFMOVES = 5898 * 2;

export const EN_PASSANT_BIT = 1 << 31;

// Evaluation constants
export const DOUBLED_PAWN_PENALTY: i32 = 17;

const PASSED_PAWN_BONUS: i32 = 22;

const KING_SHIELD_BONUS: i32 = 20;

const PAWNLESS_DRAW_SCORE_LOW_THRESHOLD = 100;
const PAWNLESS_DRAW_SCORE_HIGH_THRESHOLD = 400;
const PAWNLESS_DRAW_CLOCK_THRESHOLD = 64;

const CASTLING_BONUS: i32 = 28;
const LOST_QUEENSIDE_CASTLING_PENALTY: i32 = 24;
const LOST_KINGSIDE_CASTLING_PENALTY: i32 = 39;

export const KING_DANGER_PIECE_PENALTY: StaticArray<i32> = StaticArray.fromArray([ 0, -3, -3, 8, 25, 52, 95, 168, 258, 320, 1200, 1200, 1200, 1200, 1200, 1200 ]);

const PAWN_COVER_BONUS: i32 = 12;

export const KNIGHT_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -9, 3, 10, 11, 20, 22, 29, 29, 55 ]);
export const BISHOP_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -2, 6, 14, 19, 22, 24, 29, 30, 35, 32, 49, 105, 73, 56 ]);
export const ROOK_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -13, -10, -6, -1, 2, 9, 14, 23, 29, 36, 59, 64, 52, 62, 57 ]);
export const QUEEN_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -2, -6, 0, 3, 11, 13, 15, 17, 20, 28, 28, 35, 51, 42, 50, 62, 99, 105, 102, 159, 100, 122, 131, 131, 115, 64, 75, 61 ]);

export const EG_KNIGHT_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -65, -27, -2, 9, 13, 23, 20, 25, 4 ]);
export const EG_BISHOP_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -46, -16, 1, 9, 16, 24, 27, 25, 30, 29, 20, 11, 35, 22 ]);
export const EG_ROOK_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -72, -31, -8, 2, 15, 25, 28, 31, 35, 37, 36, 41, 50, 48, 45 ]);
export const EG_QUEEN_MOB_BONUS: StaticArray<i32> = StaticArray.fromArray([ -77, -7, -18, 11, 4, 35, 42, 61, 70, 66, 85, 87, 85, 100, 108, 109, 98, 86, 109, 95, 123, 121, 118, 129, 127, 128, 159, 123 ]);

const BASE_PIECE_PHASE_VALUE: i32 = 2;
const PAWN_PHASE_VALUE: i32 = -1; // relative to the base piece value
const QUEEN_PHASE_VALUE: i32 = 4; // relative to the base piece value

const MAX_PHASE: i32 = 16 * PAWN_PHASE_VALUE + 30 * BASE_PIECE_PHASE_VALUE + 2 * QUEEN_PHASE_VALUE;

export class Board {
  private items: StaticArray<i32>;
  private whiteKingIndex: i32;
  private blackKingIndex: i32;
  private score: i16 = 0; // mid game score
  private egScore: i16 = 0; // end game score
  private halfMoveCount: i16 = 0;
  private halfMoveClock: i16 = 0;
  private bitBoardPieces: StaticArray<u64> = new StaticArray<u64>(13);
  private bitBoardAllPieces: StaticArray<u64> = new StaticArray<u64>(3);
  private hashCode: u64 = 0; // Hash code for the current position

  private historyCounter: i32 = 0;
  private stateHistory: StaticArray<i32> = new StaticArray<i32>(MAX_GAME_HALFMOVES);
  private hashCodeHistory: StaticArray<u64> = new StaticArray<u64>(MAX_GAME_HALFMOVES);
  private scoreHistory: StaticArray<u32> = new StaticArray<u32>(MAX_GAME_HALFMOVES);
  private halfMoveClockHistory: StaticArray<i16> = new StaticArray<i16>(MAX_GAME_HALFMOVES);

  private positionHistory: PositionHistory = new PositionHistory();

  /* items Array:
     Index 0 - 63: Board representation (8 columns * 8 rows)
     Index 64: Half-move clock (number of halfmoves since last capture or pawn move)
     Index 65: Half-move count (total number of half moves since the beginning of the game)
     Index 66: Encoded board state (en passant option and castling availability)
   */
  constructor(items: Array<i32>) {
    if (items.length < (STATE_INDEX + 1)) {
      throw new Error("Invalid board item length: " + items.length.toString());
    }
    this.items = new StaticArray<i32>(items.length);
    this.whiteKingIndex = items.findIndex(isWhiteKing)
    this.blackKingIndex = items.findIndex(isBlackKing);

    if (this.whiteKingIndex == -1) {
      throw new Error("White king is missing on the board");
    }

    if (this.blackKingIndex == -1) {
      throw new Error("Black king is missing on the board!");
    }

    for (let i: i32 = 0; i < 64; i++) {
      const piece = unchecked(items[i]);
      if (piece != EMPTY) {
        this.addPiece(sign(piece), abs(piece), i);
      } else {
        unchecked(this.items[i] = items[i]);
      }
    }
    unchecked(this.items[STATE_INDEX] = items[STATE_INDEX]);
    this.halfMoveClock = i16(items[HALFMOVE_CLOCK_INDEX]);
    this.halfMoveCount = i16(items[HALFMOVE_COUNT_INDEX]);
  }

  @inline
  getBitBoard(piece: i32): u64 {
    return unchecked(this.bitBoardPieces[piece + 6]);
  }

  @inline
  getAllPieceBitBoard(color: i32): u64 {
    return unchecked(this.bitBoardAllPieces[color + 1]);
  }

  /** Stores some board state (e.g. hash-code, current score, etc.) in a history.
   *  However, the board representation itself is not stored.
   */
  @inline
  private storeState(): void {
    unchecked(this.stateHistory[this.historyCounter] = this.items[STATE_INDEX]);
    unchecked(this.halfMoveClockHistory[this.historyCounter] = this.halfMoveClock);
    unchecked(this.hashCodeHistory[this.historyCounter] = this.hashCode);
    unchecked(this.scoreHistory[this.historyCounter] = packScores(this.score, this.egScore));
    this.historyCounter++;
  }

  @inline
  private restoreState(): void {
    this.halfMoveCount--;
    this.historyCounter--;
    unchecked(this.items[STATE_INDEX] = unchecked(this.stateHistory[this.historyCounter]));
    this.halfMoveClock = unchecked(this.halfMoveClockHistory[this.historyCounter]);
    this.hashCode = unchecked(this.hashCodeHistory[this.historyCounter]);
    const packedScore = unchecked(this.scoreHistory[this.historyCounter]);
    this.score = unpackFirstScore(packedScore);
    this.egScore = unpackSecondScore(packedScore);
  }

  @inline
  getHash(): u64 {
    return this.hashCode;
  }

  recalculateHash(): void {
    this.hashCode = 0;

    for (let pos: i32 = 0; pos < 64; pos++) {
      const piece = this.items[pos];
      if (piece != EMPTY) {
        this.hashCode ^= unchecked(PIECE_RNG_NUMBERS[((piece + 6) * 64) + pos]);
      }
    }

    if (this.getActivePlayer() == BLACK) {
      this.hashCode ^= PLAYER_RNG_NUMBER;
    }

    this.updateHashForCastling(ALL_CASTLING_RIGHTS >> CASTLING_BITSTART);
    this.updateHashForEnPassent(0);
  }

  @inline
  getItem(pos: i32): i32 {
    return unchecked(this.items[pos]);
  }

  @inline
  getMaterialScore(): i32 {
    return this.score;
  }

  @inline
  getScore(): i32 {
    let score = i32(this.score);
    let egScore = i32(this.egScore);

    const whitePawns = this.getBitBoard(PAWN);
    const blackPawns = this.getBitBoard(-PAWN);

    // Add bonus for pawns which form a shield in front of the king
    const whiteFrontKingShield = i32(popcnt(whitePawns & unchecked(WHITE_KING_SHIELD_PATTERNS[this.whiteKingIndex])));
    const blackFrontKingShield = i32(popcnt(blackPawns & unchecked(BLACK_KING_SHIELD_PATTERNS[this.blackKingIndex])));

    score += whiteFrontKingShield * KING_SHIELD_BONUS;
    score -= blackFrontKingShield * KING_SHIELD_BONUS;

    // Castling
    if (this.hasWhiteCastled()) {
      score += CASTLING_BONUS;
    } else {
      if (!this.canWhiteCastleQueenSide()) {
        score -= LOST_QUEENSIDE_CASTLING_PENALTY;
      }

      if (!this.canWhiteCastleKingSide()) {
        score -= LOST_KINGSIDE_CASTLING_PENALTY;
      }
    }

    if (this.hasBlackCastled()) {
      score -= CASTLING_BONUS;
    } else {
      if (!this.canBlackCastleQueenSide()) {
        score += LOST_QUEENSIDE_CASTLING_PENALTY;
      }

      if (!this.canBlackCastleKingSide()) {
        score += LOST_KINGSIDE_CASTLING_PENALTY;
      }
    }

    const whitePieces = this.getAllPieceBitBoard(WHITE);
    const blackPieces = this.getAllPieceBitBoard(BLACK);

    // Mobility evaluation
    const emptyBoard = ~whitePieces & ~blackPieces;
    const emptyOrBlackPiece = emptyBoard | blackPieces;

    const blackPawnAttacks = blackLeftPawnAttacks(blackPawns) | blackRightPawnAttacks(blackPawns);
    let whiteSafeTargets = emptyOrBlackPiece & ~blackPawnAttacks;

    let whiteKingThreat: i32 = 0;
    let blackKingThreat: i32 = 0;

    const blackKingDangerZone = unchecked(KING_DANGER_ZONE_PATTERNS[this.blackKingIndex]);
    const whiteKingDangerZone = unchecked(KING_DANGER_ZONE_PATTERNS[this.whiteKingIndex]);

    // Knights
    let whiteKnightAttacks: u64 = 0;
    let whiteKnights = this.getBitBoard(KNIGHT);
    {
      let knights = whiteKnights;
      while (knights != 0) {
        const pos: i32 = i32(ctz(knights));
        knights ^= 1 << pos; // unset bit

        const possibleMoves = unchecked(KNIGHT_PATTERNS[pos]);
        whiteKnightAttacks |= possibleMoves;
        const moveCount = i32(popcnt(possibleMoves & whiteSafeTargets));
        score += unchecked(KNIGHT_MOB_BONUS[moveCount]);
        egScore += unchecked(EG_KNIGHT_MOB_BONUS[moveCount]);

        if (possibleMoves & blackKingDangerZone) {
          blackKingThreat++;
        }
      }
    }

    const emptyOrWhitePiece = emptyBoard | whitePieces;
    const whitePawnAttacks = whiteLeftPawnAttacks(whitePawns) | whiteRightPawnAttacks(whitePawns);
    let blackSafeTargets = emptyOrWhitePiece & ~whitePawnAttacks;

    let blackKnightAttacks: u64 = 0;
    let blackKnights = this.getBitBoard(-KNIGHT);
    {
      let knights = blackKnights;
      while (knights != 0) {
        const pos: i32 = i32(ctz(knights));
        knights ^= 1 << pos; // unset bit

        const possibleMoves = unchecked(KNIGHT_PATTERNS[pos]);
        blackKnightAttacks |= possibleMoves;
        const moveCount = i32(popcnt(possibleMoves & blackSafeTargets));
        score -= unchecked(KNIGHT_MOB_BONUS[moveCount]);
        egScore -= unchecked(EG_KNIGHT_MOB_BONUS[moveCount]);

        if (possibleMoves & whiteKingDangerZone) {
          whiteKingThreat++;
        }
      }
    }

    whiteSafeTargets &= ~blackKnightAttacks;
    blackSafeTargets &= ~whiteKnightAttacks;

    // Bishops
    const occupied = ~emptyBoard;

    let whiteBishops = this.getBitBoard(BISHOP);
    let whiteBishopAttacks: u64 = 0;
    while (whiteBishops != 0) {
      const pos: i32 = i32(ctz(whiteBishops));
      whiteBishops ^= 1 << pos; // unset bit
      const possibleMoves = diagonalAttacks(occupied, pos) | antiDiagonalAttacks(occupied, pos);
      whiteBishopAttacks |= possibleMoves;
      const moveCount = i32(popcnt(possibleMoves & whiteSafeTargets));
      score += unchecked(BISHOP_MOB_BONUS[moveCount]);
      egScore += unchecked(EG_BISHOP_MOB_BONUS[moveCount]);

      if (possibleMoves & blackKingDangerZone) {
        blackKingThreat++;
      }
    }

    let blackBishops = this.getBitBoard(-BISHOP);
    let blackBishopAttacks: u64 = 0;
    while (blackBishops != 0) {
      const pos: i32 = i32(ctz(blackBishops));
      blackBishops ^= 1 << pos; // unset bit
      const possibleMoves = diagonalAttacks(occupied, pos) | antiDiagonalAttacks(occupied, pos);
      blackBishopAttacks |= possibleMoves;
      const moveCount = i32(popcnt(possibleMoves & blackSafeTargets));
      score -= unchecked(BISHOP_MOB_BONUS[moveCount]);
      egScore -= unchecked(EG_BISHOP_MOB_BONUS[moveCount]);

      if (possibleMoves & whiteKingDangerZone) {
        whiteKingThreat++;
      }
    }

    whiteSafeTargets &= ~blackBishopAttacks;
    blackSafeTargets &= ~whiteBishopAttacks;

    // Rooks
    let whiteRooks = this.getBitBoard(ROOK);
    let whiteRookAttacks: u64 = 0;
    while (whiteRooks != 0) {
      const pos: i32 = i32(ctz(whiteRooks));
      whiteRooks ^= 1 << pos; // unset bit
      const possibleMoves = horizontalAttacks(occupied, pos) | verticalAttacks(occupied, pos);
      whiteRookAttacks |= possibleMoves;
      const moveCount = i32(popcnt(possibleMoves & whiteSafeTargets));
      score += unchecked(ROOK_MOB_BONUS[moveCount]);
      egScore += unchecked(EG_ROOK_MOB_BONUS[moveCount]);

      if (possibleMoves & blackKingDangerZone) {
        blackKingThreat++;
      }
    }

    let blackRooks = this.getBitBoard(-ROOK);
    let blackRookAttacks: u64 = 0;
    while (blackRooks != 0) {
      const pos: i32 = i32(ctz(blackRooks));
      blackRooks ^= 1 << pos; // unset bit
      const possibleMoves = horizontalAttacks(occupied, pos) | verticalAttacks(occupied, pos);
      blackRookAttacks |= possibleMoves;
      const moveCount = i32(popcnt(possibleMoves & blackSafeTargets));
      score -= unchecked(ROOK_MOB_BONUS[moveCount]);
      egScore -= unchecked(EG_ROOK_MOB_BONUS[moveCount]);

      if (possibleMoves & whiteKingDangerZone) {
        whiteKingThreat++;
      }
    }

    whiteSafeTargets &= ~blackRookAttacks;
    blackSafeTargets &= ~whiteRookAttacks;

    // Queens
    const whiteQueens = this.getBitBoard(QUEEN);
    {
      let queens = whiteQueens;
      while (queens != 0) {
        const pos: i32 = i32(ctz(queens));
        queens ^= 1 << pos; // unset bit
        const possibleMoves = horizontalAttacks(occupied, pos) | verticalAttacks(occupied, pos) | diagonalAttacks(occupied, pos) | antiDiagonalAttacks(occupied, pos);
        const moveCount = i32(popcnt(possibleMoves & whiteSafeTargets));
        score += unchecked(QUEEN_MOB_BONUS[moveCount]);
        egScore += unchecked(EG_QUEEN_MOB_BONUS[moveCount]);

        if (possibleMoves & blackKingDangerZone) {
          blackKingThreat++;
        }
      }
    }

    const blackQueens = this.getBitBoard(-QUEEN);
    {
      let queens = blackQueens;
      while (queens != 0) {
        const pos: i32 = i32(ctz(queens));
        queens ^= 1 << pos; // unset bit
        const possibleMoves = horizontalAttacks(occupied, pos) | verticalAttacks(occupied, pos) | diagonalAttacks(occupied, pos) | antiDiagonalAttacks(occupied, pos);
        const moveCount = i32(popcnt(possibleMoves & blackSafeTargets));
        score -= unchecked(QUEEN_MOB_BONUS[moveCount]);
        egScore -= unchecked(EG_QUEEN_MOB_BONUS[moveCount]);

        if (possibleMoves & whiteKingDangerZone) {
          whiteKingThreat++;
        }
      }
    }

    // Interpolate between opening/mid-game score and end game score for a smooth eval score transition
    const pawnCount: i32 = i32(popcnt(whitePawns | blackPawns));
    const piecesExceptKingCount: i32 = i32(popcnt((whitePieces | blackPieces))) - 2; // -2 for two kings

    const queenPhaseScore: i32 = (whiteQueens > 0 ? QUEEN_PHASE_VALUE : 0) + (blackQueens > 0 ? QUEEN_PHASE_VALUE : 0);

    const phase: i32 = pawnCount * PAWN_PHASE_VALUE + piecesExceptKingCount * BASE_PIECE_PHASE_VALUE + queenPhaseScore;
    const egPhase: i32 = MAX_PHASE - phase;

    let interpolatedScore = ((score * phase) + (egScore * egPhase)) / MAX_PHASE;

    // Perform evaluations which apply to all game phases

    // Pawn cover bonus
    const whitePawnsAndKnights = whitePawns | whiteKnights;
    interpolatedScore += i32(popcnt(whitePawnsAndKnights & whitePawnAttacks)) * PAWN_COVER_BONUS;

    const blackPawnsAndKnights = blackPawns | blackKnights;
    interpolatedScore -= i32(popcnt(blackPawnsAndKnights & blackPawnAttacks)) * PAWN_COVER_BONUS;

    blackKingThreat += i32(popcnt(whitePawnAttacks & blackKingDangerZone)) / 2;
    whiteKingThreat += i32(popcnt(blackPawnAttacks & whiteKingDangerZone)) / 2;

    // Doubled pawn penalty
    interpolatedScore -= this.calcDoubledPawnPenalty(whitePawns);
    interpolatedScore += this.calcDoubledPawnPenalty(blackPawns);

    // King threat (uses king threat values from mobility evaluation)
    if (whiteQueens & blackKingDangerZone) {
      blackKingThreat += 3;
    }
    interpolatedScore += unchecked(KING_DANGER_PIECE_PENALTY[blackKingThreat]);

    if (blackQueens & whiteKingDangerZone) {
      whiteKingThreat += 3;
    }
    interpolatedScore -= unchecked(KING_DANGER_PIECE_PENALTY[whiteKingThreat]);

    // Passed white pawns bonus
    let pawns = whitePawns;
    while (pawns != 0) {
      const pos: i32 = i32(ctz(pawns));
      pawns ^= 1 << pos; // unset bit
      const distanceToPromotion = pos / 8;
      if (distanceToPromotion <= 4 && (unchecked(WHITE_PAWN_FREEPATH_PATTERNS[pos]) & blackPieces) == 0) {
        const col = pos & 7;
        if (col == 0 || (unchecked(WHITE_PAWN_FREEPATH_PATTERNS[pos - 1]) & blackPawns) == 0) {
          const reversedDistance = 5 - distanceToPromotion;
          interpolatedScore += (PASSED_PAWN_BONUS * reversedDistance);

          if (col == 7 || (unchecked(WHITE_PAWN_FREEPATH_PATTERNS[pos + 1]) & blackPawns) == 0) {
            interpolatedScore += ((1 << reversedDistance) + reversedDistance);

          }
        } else if (col == 7 || (unchecked(WHITE_PAWN_FREEPATH_PATTERNS[pos + 1]) & blackPawns) == 0) {
          const reversedDistance = 5 - distanceToPromotion;
          interpolatedScore += (PASSED_PAWN_BONUS * reversedDistance);
        }
      }
    }

    // Passed black pawns bonus
    pawns = blackPawns;
    while (pawns != 0) {
      const pos: i32 = i32(ctz(pawns));
      pawns ^= 1 << pos; // unset bit
      const distanceToPromotion = 7 - pos / 8;
      if (distanceToPromotion <= 4 && (unchecked(BLACK_PAWN_FREEPATH_PATTERNS[pos]) & whitePieces) == 0) {
        const col = pos & 7;
        if (col == 0 || (unchecked(BLACK_PAWN_FREEPATH_PATTERNS[pos - 1]) & whitePawns) == 0) {
          const reversedDistance = 5 - distanceToPromotion;
          interpolatedScore -= (PASSED_PAWN_BONUS * reversedDistance);

          if (col == 7 || (unchecked(BLACK_PAWN_FREEPATH_PATTERNS[pos + 1]) & whitePawns) == 0) {
            interpolatedScore -= ((1 << reversedDistance) + reversedDistance);

          }
        } else if (col == 7 || (unchecked(BLACK_PAWN_FREEPATH_PATTERNS[pos + 1]) & whitePawns) == 0) {
          const reversedDistance = 5 - distanceToPromotion;
          interpolatedScore -= (PASSED_PAWN_BONUS * reversedDistance);
        }
      }
    }

    // Adjust score for positions, which are very likely to end in a draw
    if ((blackPawns == 0 && interpolatedScore < -PAWNLESS_DRAW_SCORE_LOW_THRESHOLD && interpolatedScore > -PAWNLESS_DRAW_SCORE_HIGH_THRESHOLD)
      || (whitePawns == 0 && interpolatedScore > PAWNLESS_DRAW_SCORE_LOW_THRESHOLD && interpolatedScore < PAWNLESS_DRAW_SCORE_HIGH_THRESHOLD)) {
      const divider = PAWNLESS_DRAW_CLOCK_THRESHOLD - this.getHalfMoveClock();
      if (divider > 0) {
        interpolatedScore = interpolatedScore * divider / PAWNLESS_DRAW_CLOCK_THRESHOLD;
      } else {
        interpolatedScore /= PAWNLESS_DRAW_CLOCK_THRESHOLD;
      }
    }

    return interpolatedScore;
  }

  @inline
  calcDoubledPawnPenalty(pawns: u64): i32 {
    const doubled = (pawns & rotr(pawns, 8))
      | pawns & rotr(pawns, 16)
      | pawns & rotr(pawns, 24)
      | pawns & rotr(pawns, 32);

    return i32(popcnt(doubled)) * DOUBLED_PAWN_PENALTY;
  }

  /* Perform a Static Exchange Evaluation (SEE) to check, whether the net gain of the capture is still positive,
     after applying all immediate and discovered re-capture attacks.

     Returns:
     - a positive integer for winning captures
     - a negative integer for losing captures
     - a 0 otherwise
   */
  @inline
  seeScore(opponentColor: i32, from: i32, target: i32, ownPieceId: i32, capturedPieceId: i32): i32 {
    let score = unchecked(PIECE_VALUES[capturedPieceId]);
    let occupied = this.getOccupancyBitboard() & ~(u64(1) << from);

    let trophyPieceScore = unchecked(PIECE_VALUES[ownPieceId]);

    do {
      // Opponent attack
      const attackerPos = this.findSmallestAttacker(occupied, opponentColor, target);
      if (attackerPos < 0) {
        return score;
      }
      score -= trophyPieceScore;
      trophyPieceScore = unchecked(PIECE_VALUES[abs(this.getItem(attackerPos))]);
      if (score + trophyPieceScore < 0) {
        return score;
      }

      occupied &= ~(u64(1) << attackerPos);

      // Own attack
      const ownAttackerPos = this.findSmallestAttacker(occupied, -opponentColor, target);
      if (ownAttackerPos < 0) {
        return score;
      }

      score += trophyPieceScore;
      trophyPieceScore = unchecked(PIECE_VALUES[abs(this.getItem(ownAttackerPos))]);
      if (score - trophyPieceScore > 0) {
        return score;
      }

      occupied &= ~(u64(1) << ownAttackerPos);
    } while (true);
  }

  @inline
  addPiece(pieceColor: i32, pieceId: i32, pos: i32): void {
    const piece = pieceId * pieceColor;
    unchecked(this.items[pos] = piece);

    this.addPieceScore(pos, piece);
    this.hashCode ^= unchecked(PIECE_RNG_NUMBERS[((piece + 6) * 64) + pos]);

    unchecked(this.bitBoardPieces[piece + 6] |= (1 << pos));
    unchecked(this.bitBoardAllPieces[pieceColor + 1] |= (1 << pos));
  }

  @inline
  private addPieceScore(pos: i32, piece: i32): void {
    const packedScores = piece > 0
      ? unchecked(WHITE_POSITION_SCORES[(piece * 64) + pos])
      : unchecked(BLACK_POSITION_SCORES[(-piece * 64) + pos]);

    this.score += unpackFirstScore(packedScores);
    this.egScore += unpackSecondScore(packedScores);
  }

  @inline
  private addPieceWithoutIncrementalUpdate(pieceColor: i32, piece: i32, pos: i32): void {
    unchecked(this.items[pos] = piece);
    unchecked(this.bitBoardPieces[piece + 6] |= (1 << pos));
    unchecked(this.bitBoardAllPieces[pieceColor + 1] |= (1 << pos));
  }

  @inline
  removePiece(pos: i32): i32 {
    const piece = unchecked(this.items[pos]);

    this.subtractPieceScore(pos, piece);
    this.hashCode ^= unchecked(PIECE_RNG_NUMBERS[((piece + 6) * 64) + pos]);

    const color = sign(piece);
    return this.remove(piece, color, pos);
  }

  @inline
  private subtractPieceScore(pos: i32, piece: i32): void {
    const packedScores = piece > 0
      ? unchecked(WHITE_POSITION_SCORES[(piece * 64) + pos])
      : unchecked(BLACK_POSITION_SCORES[(-piece * 64) + pos]);

    this.score -= unpackFirstScore(packedScores);
    this.egScore -= unpackSecondScore(packedScores);
  }

  // Version of removePiece for optimization purposes without incremental update
  @inline
  private removePieceWithoutIncrementalUpdate(pos: i32): i32 {
    const piece = unchecked(this.items[pos]);
    return this.remove(piece, sign(piece), pos);
  }

  @inline
  private remove(piece: i32, pieceColor: i32, pos: i32): i32 {
    unchecked(this.bitBoardPieces[piece + 6] &= ~(1 << pos));
    unchecked(this.bitBoardAllPieces[pieceColor + 1] &= ~(1 << pos));
    unchecked(this.items[pos] = EMPTY);

    if (piece == ROOK) {
      if (pos == WHITE_QUEEN_SIDE_ROOK_START) {
        this.setWhiteQueenSideRookMoved();
      } else if (pos == WHITE_KING_SIDE_ROOK_START) {
        this.setWhiteKingSideRookMoved();
      }
    } else if (piece == -ROOK) {
      if (pos == BLACK_QUEEN_SIDE_ROOK_START) {
        this.setBlackQueenSideRookMoved();
      } else if (pos == BLACK_KING_SIDE_ROOK_START) {
        this.setBlackKingSideRookMoved();
      }
    }

    return piece;
  }

  @inline
  performEncodedMove(encodedMove: i32): i32 {
    return this.performMove(decodePiece(encodedMove), decodeStartIndex(encodedMove), decodeEndIndex(encodedMove));
  }

  /** Applies the given move to the board.
   *
   * @returns The removed piece ID or the highest bit set to 1, if it was an en passant move.
   *
   */
  performMove(pieceId: i32, start: i32, end: i32): i32 {
    this.storeState();
    this.increaseHalfMoveCount();
    const ownPiece = this.removePiece(start);
    const pieceColor = sign(ownPiece);
    this.clearEnPassentPossible();

    if (this.getItem(end) != EMPTY) {
      // Capture move (except en passant)
      const removedPiece = this.removePiece(end);
      this.addPiece(pieceColor, pieceId, end);

      this.resetHalfMoveClock();

      if (pieceId == KING) {
        this.updateKingPosition(pieceColor, end);
      }

      this.positionHistory.push(this.getHash());
      return abs(removedPiece);
    }

    this.addPiece(pieceColor, pieceId, end);
    if (ownPiece == PAWN) {
      this.resetHalfMoveClock();

      // Special en passant handling
      if (start - end == 16) {
        this.setEnPassantPossible(start);

      } else if (start - end == 7) {
        this.removePiece(start + WHITE);
        this.positionHistory.push(this.getHash());
        return EN_PASSANT_BIT;

      } else if (start - end == 9) {
        this.removePiece(start - WHITE);
        this.positionHistory.push(this.getHash());
        return EN_PASSANT_BIT;

      }
    } else if (ownPiece == -PAWN) {
      this.resetHalfMoveClock();

      // Special en passant handling
      if (start - end == -16) {
        this.setEnPassantPossible(start);

      } else if (start - end == -7) {
        this.removePiece(start + BLACK);
        this.positionHistory.push(this.getHash());
        return EN_PASSANT_BIT;

      } else if (start - end == -9) {
        this.removePiece(start - BLACK);
        this.positionHistory.push(this.getHash());
        return EN_PASSANT_BIT;

      }
    } else if (ownPiece == KING) {
      this.updateWhiteKingPosition(end);

      // Special castling handling
      if (start - end == -2) {
        this.removePiece(WHITE_KING_SIDE_ROOK_START);
        this.addPiece(pieceColor, ROOK, WHITE_KING_START + 1);
        this.setStateBit(WHITE_HAS_CASTLED);

      } else if (start - end == 2) {
        this.removePiece(WHITE_QUEEN_SIDE_ROOK_START);
        this.addPiece(pieceColor, ROOK, WHITE_KING_START - 1);
        this.setStateBit(WHITE_HAS_CASTLED);

      }

    } else if (ownPiece == -KING) {
      this.updateBlackKingPosition(end);

      // Special castling handling
      if (start - end == -2) {
        this.removePiece(BLACK_KING_SIDE_ROOK_START);
        this.addPiece(pieceColor, ROOK, BLACK_KING_START + 1);
        this.setStateBit(BLACK_HAS_CASTLED);

      } else if (start - end == 2) {
        this.removePiece(BLACK_QUEEN_SIDE_ROOK_START);
        this.addPiece(pieceColor, ROOK, BLACK_KING_START - 1);
        this.setStateBit(BLACK_HAS_CASTLED);
      }
    }

    this.positionHistory.push(this.getHash());
    return EMPTY;
  };

  @inline
  performNullMove(): void {
    this.storeState();
    this.increaseHalfMoveCount();
    this.clearEnPassentPossible();
  }

  undoMove(piece: i32, start: i32, end: i32, removedPieceId: i32): void {
    this.positionHistory.pop();

    const pieceColor = sign(piece);
    this.removePieceWithoutIncrementalUpdate(end);
    this.addPieceWithoutIncrementalUpdate(pieceColor, piece, start);

    if (removedPieceId == EN_PASSANT_BIT) {

      if (abs(start - end) == 7) {
        this.addPieceWithoutIncrementalUpdate(-pieceColor, PAWN * -pieceColor, start + pieceColor);
      } else if (abs(start - end) == 9) {
        this.addPieceWithoutIncrementalUpdate(-pieceColor, PAWN * -pieceColor, start - pieceColor);
      }

    } else if (removedPieceId != EMPTY) {
      this.addPieceWithoutIncrementalUpdate(-pieceColor, removedPieceId * -pieceColor, end);

    }

    if (piece == KING) {
      this.updateWhiteKingPosition(start);

      // Undo Castle
      if (start - end == -2) {
        this.removePieceWithoutIncrementalUpdate(WHITE_KING_START + 1);
        this.addPieceWithoutIncrementalUpdate(WHITE, ROOK, WHITE_KING_SIDE_ROOK_START);

      } else if (start - end == 2) {
        this.removePieceWithoutIncrementalUpdate(WHITE_KING_START - 1);
        this.addPieceWithoutIncrementalUpdate(WHITE, ROOK, WHITE_QUEEN_SIDE_ROOK_START);

      }

    } else if (piece == -KING) {
      this.updateBlackKingPosition(start);

      // Undo Castle
      if (start - end == -2) {
        this.removePieceWithoutIncrementalUpdate(BLACK_KING_START + 1);
        this.addPieceWithoutIncrementalUpdate(BLACK, -ROOK, BLACK_KING_SIDE_ROOK_START);

      } else if (start - end == 2) {
        this.removePieceWithoutIncrementalUpdate(BLACK_KING_START - 1);
        this.addPieceWithoutIncrementalUpdate(BLACK, -ROOK, BLACK_QUEEN_SIDE_ROOK_START);

      }
    }

    this.restoreState();
  };

  @inline
  undoNullMove(): void {
    this.restoreState();
  }

  @inline
  isKnightAttacked(opponentColor: i32, pos: i32): bool {
    return (unchecked(this.bitBoardPieces[KNIGHT * opponentColor + 6]) & unchecked(KNIGHT_PATTERNS[pos])) != 0;
  }

  @inline
  isEnPassentPossible(pieceColor: i32, boardIndex: i32): bool {
    const state = this.getState();

    if (pieceColor == WHITE && boardIndex >= WHITE_ENPASSANT_LINE_START && boardIndex <= WHITE_ENPASSANT_LINE_END) {
      return (state & unchecked(EN_PASSANT_BITMASKS[boardIndex - WHITE_ENPASSANT_LINE_START])) != 0;

    } else if (pieceColor == BLACK && boardIndex >= BLACK_ENPASSANT_LINE_START && boardIndex <= BLACK_ENPASSANT_LINE_END) {
      return (state & unchecked(EN_PASSANT_BITMASKS[boardIndex - BLACK_ENPASSANT_LINE_START + 8])) != 0;

    }

    return false;
  };

  @inline
  setEnPassantPossible(boardIndex: i32): void {
    const previousEnPassantState = this.getEnPassantStateBits();

    const enPassentBitIndex = (boardIndex >= WHITE_PAWNS_BASELINE_START)
      ? boardIndex - WHITE_PAWNS_BASELINE_START + 8
      : boardIndex - BLACK_PAWNS_BASELINE_START;

    this.setStateBit(unchecked(EN_PASSANT_BITMASKS[enPassentBitIndex]));
    this.updateHashForEnPassent(previousEnPassantState);
  }

  @inline
  clearEnPassentPossible(): void {
    const previousEnPassantState = this.getEnPassantStateBits();

    if (previousEnPassantState != 0) {
      unchecked(this.items[this.items.length - 1] &= (EN_PASSANT_BITMASKS[0] - 1));
      this.updateHashForEnPassent(previousEnPassantState);
    }
  };

  @inline
  updateHashForEnPassent(previousEnPassantState: i32): void {
    const newEnPassantState = this.getEnPassantStateBits();

    if (previousEnPassantState != newEnPassantState) {
      if (previousEnPassantState != 0) {
        unchecked(this.hashCode ^= EN_PASSANT_RNG_NUMBERS[ctz(previousEnPassantState)]);
      }
      if (newEnPassantState != 0) {
        unchecked(this.hashCode ^= EN_PASSANT_RNG_NUMBERS[ctz(newEnPassantState)]);
      }
    }
  }

  @inline
  getEnPassantStateBits(): i32 {
    return (this.getState() >> EN_PASSANT_BITSTART) & 0xFFFF; // en passant bits occupy 16 bits of the state
  }

  @inline
  increaseHalfMoveCount(): void {
    this.halfMoveClock++;
    this.halfMoveCount++;

    this.hashCode ^= PLAYER_RNG_NUMBER;
  }

  @inline
  initializeHalfMoveCount(value: i16): void {
    this.halfMoveCount = value;
  }

  @inline
  setHalfMoveClock(value: i16): void {
    this.halfMoveClock = value;
  }

  @inline
  resetHalfMoveClock(): void {
    this.halfMoveClock = 0;
  }

  @inline
  getHalfMoveClock(): i32 {
    return this.halfMoveClock;
  }

  @inline
  getHalfMoveCount(): i32 {
    return this.halfMoveCount;
  }

  @inline
  getFullMoveCount(): i32 {
    return this.halfMoveCount / 2 + 1;
  }

  @inline
  getActivePlayer(): i32 {
    return (this.halfMoveCount & 1) === 0 ? WHITE : BLACK;
  }

  @inline
  getState(): i32 {
    return unchecked(this.items[this.items.length - 1]);
  }

  @inline
  hasWhiteCastled(): bool {
    return (this.getState() & WHITE_HAS_CASTLED) != 0;
  }

  @inline
  canWhiteCastleKingSide(): bool {
    return (this.getState() & WHITE_KING_SIDE_CASTLING) != 0;
  }

  @inline
  canBlackCastleKingSide(): bool {
    return (this.getState() & BLACK_KING_SIDE_CASTLING) != 0;
  }

  @inline
  canWhiteCastleQueenSide(): bool {
    return (this.getState() & WHITE_QUEEN_SIDE_CASTLING) != 0;
  }

  @inline
  hasBlackCastled(): bool {
    return (this.getState() & BLACK_HAS_CASTLED) != 0;
  }

  @inline
  canBlackCastleQueenSide(): bool {
    return (this.getState() & BLACK_QUEEN_SIDE_CASTLING) != 0;
  }

  @inline
  setWhiteKingMoved(): void {
    if (this.canWhiteCastleKingSide() || this.canWhiteCastleQueenSide()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.clearStateBit(WHITE_KING_SIDE_CASTLING);
      this.clearStateBit(WHITE_QUEEN_SIDE_CASTLING);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setBlackKingMoved(): void {
    if (this.canBlackCastleKingSide() || this.canBlackCastleQueenSide()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.clearStateBit(BLACK_KING_SIDE_CASTLING);
      this.clearStateBit(BLACK_QUEEN_SIDE_CASTLING);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setWhiteQueenSideRookMoved(): void {
    if (this.canWhiteCastleQueenSide()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.clearStateBit(WHITE_QUEEN_SIDE_CASTLING);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setWhiteKingSideRookMoved(): void {
    if (this.canWhiteCastleKingSide()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.clearStateBit(WHITE_KING_SIDE_CASTLING);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setBlackQueenSideRookMoved(): void {
    if (this.canBlackCastleQueenSide()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.clearStateBit(BLACK_QUEEN_SIDE_CASTLING);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setBlackKingSideRookMoved(): void {
    if (this.canBlackCastleKingSide()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.clearStateBit(BLACK_KING_SIDE_CASTLING);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  updateHashForCastling(previousCastlingState: i32): void {
    unchecked(this.hashCode ^= CASTLING_RNG_NUMBERS[previousCastlingState]);
    unchecked(this.hashCode ^= CASTLING_RNG_NUMBERS[this.getCastlingStateBits()]);
  }

  @inline
  getCastlingStateBits(): i32 {
    return (this.getState() >> CASTLING_BITSTART) & 0xf; // extract 4-bits from state which describe the castling state
  }

  @inline
  setStateBit(bitMask: i32): void {
    unchecked(this.items[this.items.length - 1] |= bitMask);
  }

  @inline
  clearStateBit(bitMask: i32): void {
    unchecked(this.items[this.items.length - 1] &= ~bitMask);
  }

  @inline
  findKingPosition(playerColor: i32): i32 {
    if (playerColor == WHITE) {
      return this.whiteKingIndex;
    } else {
      return this.blackKingIndex;
    }
  }

  @inline
  setState(state: i32): void {
    unchecked(this.items[this.items.length - 1] = state);
  }

  @inline
  updateKingPosition(playerColor: i32, boardIndex: i32): void {
    if (playerColor == WHITE) {
      this.updateWhiteKingPosition(boardIndex);
    } else {
      this.updateBlackKingPosition(boardIndex);
    }
  }

  @inline
  updateWhiteKingPosition(boardIndex: i32): void {
    this.whiteKingIndex = boardIndex;
    this.setWhiteKingMoved();
  }

  @inline
  updateBlackKingPosition(boardIndex: i32): void {
    this.blackKingIndex = boardIndex;
    this.setBlackKingMoved();
  }

  @inline
  isInCheck(activeColor: i32): bool {
    return this.isAttacked(-activeColor, this.findKingPosition(activeColor));
  };

  // Returns the position of the smallest attacker or -1 if there is no attacker
  @inline
  findSmallestAttacker(occupiedBB: u64, opponentColor: i32, pos: i32): i32 {
    const targetBB: u64 = u64(1) << pos;
    if (opponentColor == WHITE) {

      // Check pawns
      const whitePawns = this.getBitBoard(PAWN) & occupiedBB;
      if (whiteLeftPawnAttacks(whitePawns) & targetBB) {
        return pos + 9;
      } else if (whiteRightPawnAttacks(whitePawns) & targetBB) {
        return pos + 7;
      }

      // Check knights
      const knights = this.getBitBoard(KNIGHT) & occupiedBB;
      const attackingKnights = knights & unchecked(KNIGHT_PATTERNS[pos]);
      if (attackingKnights != 0) {
        return i32(ctz(attackingKnights));
      }

      // Check bishops
      const allDiagonalAttacks = diagonalAttacks(occupiedBB, pos) | antiDiagonalAttacks(occupiedBB, pos);
      const bishops = this.getBitBoard(BISHOP) & occupiedBB;
      const attackingBishops = bishops & allDiagonalAttacks;
      if (attackingBishops != 0) {
        return i32(ctz(attackingBishops));
      }

      // Check rooks
      const orthogonalAttacks = horizontalAttacks(occupiedBB, pos) | verticalAttacks(occupiedBB, pos);
      const rooks = this.getBitBoard(ROOK) & occupiedBB;
      const attackingRooks = rooks & orthogonalAttacks;
      if (attackingRooks != 0) {
        return i32(ctz(attackingRooks));
      }

      // Check queens
      const queens = this.getBitBoard(QUEEN) & occupiedBB;
      const attackingQueens = queens & (orthogonalAttacks | allDiagonalAttacks);
      if (attackingQueens != 0) {
        return i32(ctz(attackingQueens));
      }

      // Check king
      const kingPos = this.whiteKingIndex;
      const attackingKing: u64 = unchecked(KING_PATTERNS[kingPos]) & targetBB;
      if (attackingKing != 0) {
        const kingBB: u64 = u64(1) << kingPos
        if ((kingBB & occupiedBB) != 0) {
          return kingPos;
        }
      }

    } else {
      // Check pawns
      const blackPawns = this.getBitBoard(-PAWN) & occupiedBB;
      if (blackLeftPawnAttacks(blackPawns) & targetBB) {
        return pos - 7;
      } else if (blackRightPawnAttacks(blackPawns) & targetBB) {
        return pos - 9;
      }

      // Check knights
      const knights = this.getBitBoard(-KNIGHT) & occupiedBB;
      const attackingKnights = knights & unchecked(KNIGHT_PATTERNS[pos]);
      if (attackingKnights != 0) {
        return i32(ctz(attackingKnights));
      }

      // Check bishops
      const allDiagonalAttacks = diagonalAttacks(occupiedBB, pos) | antiDiagonalAttacks(occupiedBB, pos);
      const bishops = this.getBitBoard(-BISHOP) & occupiedBB;
      const attackingBishops = bishops & allDiagonalAttacks;
      if (attackingBishops != 0) {
        return i32(ctz(attackingBishops));
      }

      // Check rooks
      const orthogonalAttacks = horizontalAttacks(occupiedBB, pos) | verticalAttacks(occupiedBB, pos);
      const rooks = this.getBitBoard(-ROOK) & occupiedBB;
      const attackingRooks = rooks & orthogonalAttacks;
      if (attackingRooks != 0) {
        return i32(ctz(attackingRooks));
      }

      // Check queens
      const queens = this.getBitBoard(-QUEEN) & occupiedBB;
      const attackingQueens = queens & (orthogonalAttacks | allDiagonalAttacks);
      if (attackingQueens != 0) {
        return i32(ctz(attackingQueens));
      }

      // Check king
      const kingPos = this.blackKingIndex;
      const attackingKing: u64 = unchecked(KING_PATTERNS[kingPos]) & targetBB;
      if (attackingKing != 0) {
        const kingBB: u64 = u64(1) << kingPos
        if ((kingBB & occupiedBB) != 0) {
          return kingPos;
        }
      }

    }
    return -1;
  }

  @inline
  getOccupancyBitboard(): u64 {
    return this.getAllPieceBitBoard(WHITE) | this.getAllPieceBitBoard(BLACK);
  }

  @inline
  isAttacked(opponentColor: i32, pos: i32): bool {
    return this.findSmallestAttacker(this.getOccupancyBitboard(), opponentColor, pos) >= 0;
  }

  setHistory(history: PositionHistory): void {
    this.positionHistory = history;
  }

  @inline
  isThreefoldRepetion(): bool {
    return this.positionHistory.isThreefoldRepetion();
  }

  @inline
  isFiftyMoveDraw(): bool {
    return this.getHalfMoveClock() >= 100;
  }

  // Return true, if the engine considers the current position as a draw.
  // Note: it already considers the first repetition of a position as a draw to stop searching a branch that leads to a draw earlier.
  @inline
  isEngineDraw(): bool {
    return this.positionHistory.isSingleRepetition() || this.isFiftyMoveDraw() || this.isInsufficientMaterialDraw();
  }

  @inline
  isInsufficientMaterialDraw(): bool {
    switch (u32(popcnt(this.getAllPieceBitBoard(WHITE) | this.getAllPieceBitBoard(BLACK)))) {
      case 2:
        // K vs K
        return true;

      case 3:
        // K vs K+N or K vs K+B
        const knightsOrBishops = this.getBitBoard(KNIGHT) | this.getBitBoard(-KNIGHT) | this.getBitBoard(BISHOP) | this.getBitBoard(-BISHOP);
        return knightsOrBishops != 0;

      case 4:
        // Check for K+B vs K+B where bishops are on fields with the same color
        const whiteBishops = this.getBitBoard(BISHOP);
        const blackBishops = this.getBitBoard(-BISHOP);

        return ((whiteBishops & LIGHT_COLORED_FIELD_PATTERN) != 0 && (blackBishops & LIGHT_COLORED_FIELD_PATTERN) != 0) ||
          ((whiteBishops & DARK_COLORED_FIELD_PATTERN) != 0 && (blackBishops & DARK_COLORED_FIELD_PATTERN) != 0);

      default:
        return false;
    }
  }

  @inline
  isPawnMoveCloseToPromotion(piece: i32, moveEnd: i32, movesLeft: i32): bool {
    if (piece == PAWN) {
      const distanceToPromotion = moveEnd / 8;
      if (distanceToPromotion <= movesLeft && (unchecked(WHITE_PAWN_FREEPATH_PATTERNS[moveEnd]) & this.getAllPieceBitBoard(BLACK)) == 0) {
        return true;
      }

    } else if (piece == -PAWN) {
      const distanceToPromotion = 7 - moveEnd / 8;
      if (distanceToPromotion <= movesLeft && (unchecked(BLACK_PAWN_FREEPATH_PATTERNS[moveEnd]) & this.getAllPieceBitBoard(WHITE)) == 0) {
        return true;
      }
    }

    return false;
  }
}

// Return index 0 for BLACK (-1) and 1 for WHITE (+1)
@inline
export function indexFromColor(color: i32): i32 {
  return (color + 1) >> 1;
}

function isWhiteKing(piece: i32, index: i32, board: Array<i32>): bool {
  return piece == KING;
}

function isBlackKing(piece: i32, index: i32, board: Array<i32>): bool {
  return piece == -KING;
}

export const BLACK: i32 = -1;
export const WHITE: i32 = 1;

export const EMPTY: i32 = 0;

// Bit-Patterns for Board state
export const WHITE_KING_SIDE_CASTLING: i32 = 1 << 7;
export const BLACK_KING_SIDE_CASTLING: i32 = 1 << 8;
export const WHITE_QUEEN_SIDE_CASTLING: i32 = 1 << 9;
export const BLACK_QUEEN_SIDE_CASTLING: i32 = 1 << 10;
export const WHITE_HAS_CASTLED: i32 = 1 << 11;
export const BLACK_HAS_CASTLED: i32 = 1 << 12;

const CASTLING_BITSTART = 7;

export const ALL_CASTLING_RIGHTS = WHITE_KING_SIDE_CASTLING | WHITE_QUEEN_SIDE_CASTLING | BLACK_KING_SIDE_CASTLING | BLACK_QUEEN_SIDE_CASTLING;
export const NO_CASTLING_RIGHTS = 0;

// Encode 'en passant' move possibilities for
// white pawns in bits 13 to 20 and for
// black pawns in bits 21 to 28

const BITS: Array<i32> = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
const EN_PASSANT_BITSTART = 13;
const EN_PASSANT_BITMASKS: StaticArray<i32> = StaticArray.fromArray(BITS.map<i32>(calculateEnPassantBitMask));

function calculateEnPassantBitMask(bit: i32, index: i32, array: Array<i32>): i32 {
  return 1 << bit;
}

export const PAWN_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  0, 0, 0, 0, 0, 0, 0, 0, 
  98, 94, 33, 98, 70, 123,
  50, 2, -6, -13, 23, 22, 69,
  87, 33, -9, -19, 13, 3, 29,
  31, 23, 17, -17, -22, -9, -3,
  18, 24, 10, 9, -28, -25, -10,
  -12, -22, -10, -17, 24, -24, -24,
  0, -12, -19, -15, 18, 34, -18,
  0, 0, 0, 0, 0, 0, 0, 0
]);

export const EG_PAWN_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  0, 0, 0, 0, 0, 0, 0, 0,
  134, 127, 110, 68, 92, 66, 120, 145,
  81, 92, 56, 28, 6, 15, 60, 64,
  26, 7, -6, -30, -30, -15, 3, 7,
  5, 3, -16, -35, -32, -23, -8, -9,
  -1, 3, -9, 0, -1, 0, -14, -13,
  14, 11, 10, 12, 24, 3, 2, -12,
  0, 0, 0, 0, 0, 0, 0, 0
]);

export const KNIGHT_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  -178, -109, -69, -41, 99, -101, -14, -118,
  -116, -57, 89, 31, -4, 60, 9, -40,
  -67, 31, 10, 31, 101, 121, 46, 42,
  -21, 7, 1, 48, 22, 65, 14, 31,
  -5, 7, 7, 12, 24, 17, 24, -2,
  -28, -9, 8, 11, 27, 12, 24, -23,
  -10, -38, 4, 22, 18, 33, 3, 8,
  -98, -4, -41, -24, 12, -3, -7, 5
]);

export const EG_KNIGHT_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  17, 14, 35, 2, -27, 8, -42, -44,
  38, 32, -27, 16, 15, -10, 1, -10,
  18, 0, 29, 28, -9, -6, -1, -16,
  30, 29, 42, 36, 47, 27, 34, 2,
  8, 11, 38, 35, 33, 34, 26, 16,
  16, 15, 10, 32, 21, 15, -3, 26,
  -20, 16, 8, 2, 26, -6, 3, -17,
  28, -9, 22, 38, 14, 15, 9, -35
]);

export const BISHOP_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  -54, -14, -99, -66, -13, -24, -34, -13,
  -58, 1, -26, -30, 44, 78, 27, -68,
  -33, 13, 46, 28, 37, 57, 28, -2,
  -23, 17, 26, 63, 39, 40, 19, 1,
  4, 28, 17, 40, 61, 15, 19, 18,
  7, 38, 29, 27, 23, 53, 29, 10,
  35, 31, 39, 21, 33, 44, 51, 16,
  -13, 20, 13, -3, 18, 11, -10, -12
]);

export const EG_BISHOP_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  -12, -46, -17, -25, -29, -36, -32, -33,
  -12, -30, -21, -38, -46, -57, -40, -18,
  -10, -33, -44, -38, -41, -34, -31, -18,
  -13, -29, -26, -35, -28, -25, -34, -23,
  -39, -36, -16, -22, -45, -26, -42, -34,
  -35, -39, -28, -27, -16, -43, -36, -30,
  -57, -43, -47, -35, -30, -48, -39, -55,
  -44, -36, -29, -19, -33, -31, -36, -36
]);

export const ROOK_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  23, 20, 31, 72, 69, 8, 5, 5,
  18, 40, 86, 92, 82, 97, 53, 47,
  -15, 39, 42, 43, 23, 73, 85, 22,
  -13, -7, 21, 30, 16, 34, 14, 1,
  -33, -15, 6, 15, 18, 1, 46, -5,
  -43, -11, -4, -11, 1, 2, 17, -11,
  -39, -9, -7, 7, 7, 10, 13, -46,
  -21, -1, 18, 18, 18, 3, -1, -8
]);

export const EG_ROOK_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  18, 18, 14, 3, 9, 17, 18, 15,
  18, 13, 1, -2, -6, -2, 8, 8,
  21, 11, 7, 11, 9, 0, 0, 5,
  16, 16, 20, 14, 15, 19, 8, 12,
  21, 17, 17, 8, 6, 6, -9, 2,
  13, 11, 4, 8, 6, 3, -2, -8,
  8, 4, 8, 6, 2, 1, -5, 8,
  5, 5, 2, 5, 4, 15, 1, -26
]);

export const QUEEN_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  -25, 3, 47, 48, 62, 44, 40, 38,
  -31, -49, -3, 20, -23, 53, 7, 19,
  8, -2, 16, -3, 12, 40, 1, 23,
  -39, -33, -33, -27, -21, 7, -24, -9,
  0, -32, -10, -16, -3, 3, -5, 4,
  -11, 10, -10, 0, -5, 2, 16, 16,
  -25, -9, 22, 13, 25, 34, 14, 32,
  4, 2, 11, 28, 2, -18, -23, -52
]);

export const EG_QUEEN_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  44, 77, 50, 44, 56, 51, 58, 88,
  45, 75, 60, 73, 73, 36, 81, 81,
  21, 52, 35, 98, 86, 64, 89, 83,
  84, 89, 80, 96, 124, 91, 147, 132,
  32, 89, 68, 101, 78, 84, 123, 104,
  58, 26, 67, 53, 65, 78, 86, 85,
  40, 37, 18, 24, 25, 14, 10, 11,
  29, 18, 20, 7, 51, 38, 58, 34
]);

export const KING_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  -6, 293, 247, 145, 35, -28, 41, 55,
  159, 114, 203, 245, 153, 108, -49, 16,
  69, 223, 180, 232, 238, 227, 225, 16,
  46, 120, 136, 155, 180, 102, 54, -47,
  -119, 75, 66, 56, 78, 38, 5, -83,
  -19, -3, 11, -21, -19, 8, -10, -52,
  -2, 9, -31, -97, -76, -40, 2, 12,
  -27, 20, 8, -69, -54, -55, 36, 30
  ]
);

export const EG_KING_POSITION_SCORES: StaticArray<i32> = StaticArray.fromArray([
  -87, -79, -54, -42, -11, 33, 14, -13,
  -28, 6, -9, -17, 4, 33, 43, 13,
  10, -4, 8, -11, -9, 30, 30, 16,
  -10, 11, 18, 17, 11, 35, 36, 25,
  11, -7, 28, 33, 33, 38, 24, 14,
  -12, 9, 23, 42, 47, 33, 23, 9,
  -31, -10, 24, 47, 48, 26, 3, -23,
  -66, -47, -23, 3, -7, 5, -47, -77
]);

const WHITE_POSITION_SCORES: StaticArray<u32> = new StaticArray<u32>(64 * 7);
const BLACK_POSITION_SCORES: StaticArray<u32> = new StaticArray<u32>(64 * 7);

export function calculatePieceSquareTables(): void {
  combineScores(WHITE_POSITION_SCORES, WHITE,
    [PAWN_POSITION_SCORES, KNIGHT_POSITION_SCORES, BISHOP_POSITION_SCORES, ROOK_POSITION_SCORES, QUEEN_POSITION_SCORES, KING_POSITION_SCORES],
    [EG_PAWN_POSITION_SCORES, EG_KNIGHT_POSITION_SCORES, EG_BISHOP_POSITION_SCORES, EG_ROOK_POSITION_SCORES, EG_QUEEN_POSITION_SCORES, EG_KING_POSITION_SCORES]);

  combineScores(BLACK_POSITION_SCORES, BLACK,
    [mirrored(PAWN_POSITION_SCORES), mirrored(KNIGHT_POSITION_SCORES), mirrored(BISHOP_POSITION_SCORES), mirrored(ROOK_POSITION_SCORES), mirrored(QUEEN_POSITION_SCORES), mirrored(KING_POSITION_SCORES)],
    [mirrored(EG_PAWN_POSITION_SCORES), mirrored(EG_KNIGHT_POSITION_SCORES), mirrored(EG_BISHOP_POSITION_SCORES), mirrored(EG_ROOK_POSITION_SCORES), mirrored(EG_QUEEN_POSITION_SCORES), mirrored(EG_KING_POSITION_SCORES)]);
}

function combineScores(result: StaticArray<u32>, color: i32, midgameScores: StaticArray<i32>[], endgameScores: StaticArray<i32>[]): StaticArray<u32> {
  let index = 64;
  for (let pieceId = PAWN; pieceId <= KING; pieceId++) {
    const pieceValue = i16(unchecked(PIECE_VALUES[pieceId]) * color);
    const egPieceValue = i16(unchecked(EG_PIECE_VALUES[pieceId]) * color);

    for (let pos = 0; pos < 64; pos++) {
      const posScore = pieceValue + i16(unchecked(midgameScores[pieceId - 1][pos]) * color);
      const egPosScore = egPieceValue + i16(unchecked(endgameScores[pieceId - 1][pos]) * color);
      unchecked(result[index++] = packScores(posScore, egPosScore));
    }
  }
  return result;
}

export function mirrored(input: StaticArray<i32>): StaticArray<i32> {
  let output = StaticArray.slice(input);
  for (let column: i32 = 0; column < 8; column++) {
    for (let row: i32 = 0; row < 4; row++) {
      const oppositeRow = 7 - row;
      const pos = column + row * 8;
      const oppositePos = column + oppositeRow * 8;
      const value = output[pos];
      output[pos] = output[oppositePos];
      output[oppositePos] = value;
    }
  }

  return output;
}
