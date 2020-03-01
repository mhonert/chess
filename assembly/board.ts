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
  BISHOP, BLACK_ENPASSANT_LINE_END, BLACK_ENPASSANT_LINE_START,
  BLACK_LEFT_ROOK_START, BLACK_PAWNS_BASELINE_START, BLACK_RIGHT_ROOK_START,
  KING,
  KNIGHT,
  PAWN, PIECE_VALUES,
  QUEEN,
  ROOK, WHITE_ENPASSANT_LINE_END, WHITE_ENPASSANT_LINE_START,
  WHITE_LEFT_ROOK_START, WHITE_PAWNS_BASELINE_START,
  WHITE_RIGHT_ROOK_START
} from './pieces';
import { sign, toBitBoardString, toInt32Array } from './util';
import { decodeEndIndex, decodePiece, decodeStartIndex } from './move-generation';
import { CASTLING_RNG_NUMBERS, EN_PASSANT_RNG_NUMBERS, PIECE_RNG_NUMBERS, PLAYER_RNG_NUMBER } from './zobrist';
import { PositionHistory } from './history';
import {
  antiDiagonalAttacks, blackPawnAttacks,
  diagonalAttacks,
  horizontalAttacks, KING_PATTERNS,
  KNIGHT_PATTERNS,
  verticalAttacks, whitePawnAttacks
} from './bitboard';

export const WHITE_KING_START = 60;
export const BLACK_KING_START = 4;


const HALFMOVE_CLOCK_INDEX = 64;
const HALFMOVE_COUNT_INDEX = 65;
const STATE_INDEX = 66;

export const MAX_FIELD_DISTANCE: i32 = 7; // maximum distance between two fields on the board

const MAX_GAME_HALFMOVES = 5898 * 2;

export const EN_PASSANT_BIT = 1 << 31;

export class Board {
  private items: Int32Array;
  private whiteKingIndex: i32;
  private blackKingIndex: i32;
  private score: i32 = 0;
  private bitBoardPieces: Uint64Array = new Uint64Array(13);
  private bitBoardAllPieces: Uint64Array = new Uint64Array(2);
  private hashCode: u64 = 0; // Hash code for the current position

  private historyCounter: i32 = 0;
  private stateHistory: Int32Array = new Int32Array(MAX_GAME_HALFMOVES);
  private hashCodeHistory: Uint64Array = new Uint64Array(MAX_GAME_HALFMOVES);
  private scoreHistory: Int32Array = new Int32Array(MAX_GAME_HALFMOVES);
  private halfMoveClockHistory: Int32Array = new Int32Array(MAX_GAME_HALFMOVES);

  private positionHistory: PositionHistory = new PositionHistory();

  private endgame: i32;

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
    this.items = new Int32Array(items.length);
    this.whiteKingIndex = items.findIndex(isWhiteKing)
    this.blackKingIndex = items.findIndex(isBlackKing);

    if (this.whiteKingIndex == -1) {
      throw new Error("White king is missing on the board");
    }

    if (this.blackKingIndex == -1) {
      throw new Error("Black king is missing on the board!");
    }

    for (let i: i32 = 0; i < 64; i++) {
      const piece = items[i];
      if (piece != EMPTY) {
        this.addPiece(sign(piece), abs(piece), i);
      } else {
        this.items[i] = items[i];
      }
    }
    this.items[STATE_INDEX] = items[STATE_INDEX];
    this.items[HALFMOVE_CLOCK_INDEX] = items[HALFMOVE_CLOCK_INDEX];
    this.items[HALFMOVE_COUNT_INDEX] = items[HALFMOVE_COUNT_INDEX];

    this.updateEndGameStatus();
  }

  @inline
  length(): i32 {
    return this.items.length;
  }

  @inline
  getBitBoard(index: i32): u64 {
    return unchecked(this.bitBoardPieces[index]);
  }

  @inline
  getAllPieceBitBoard(color: i32): u64 {
    return unchecked(this.bitBoardAllPieces[indexFromColor(color)]);
  }

  /** Stores some board state (e.g. hash-code, current score, etc.) in a history.
   *  However, the board representation itself is not stored.
   */
  @inline
  storeState(): void {
    unchecked(this.stateHistory[this.historyCounter] = this.items[STATE_INDEX]);
    unchecked(this.halfMoveClockHistory[this.historyCounter] = this.items[HALFMOVE_CLOCK_INDEX]);
    unchecked(this.hashCodeHistory[this.historyCounter] = this.hashCode);
    unchecked(this.scoreHistory[this.historyCounter] = this.score);
    this.historyCounter++;
  }

  @inline
  restoreState(): void {
    this.historyCounter--;
    unchecked(this.items[STATE_INDEX] = unchecked(this.stateHistory[this.historyCounter]));
    unchecked(this.items[HALFMOVE_CLOCK_INDEX] = this.halfMoveClockHistory[this.historyCounter]);
    this.hashCode = unchecked(this.hashCodeHistory[this.historyCounter]);
    this.score = unchecked(this.scoreHistory[this.historyCounter]);
    this.items[HALFMOVE_COUNT_INDEX]--;
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
        this.hashCode ^= unchecked(PIECE_RNG_NUMBERS[(piece + 6) * 64 + pos]);
      }
    }

    if (this.getActivePlayer() == BLACK) {
      this.hashCode ^= PLAYER_RNG_NUMBER;
    }

    this.updateHashForCastling(0);
    this.updateHashForEnPassent(0);
  }

  @inline
  getItem(pos: i32): i32 {
    return unchecked(this.items[pos]);
  }

  @inline
  getScore(): i32 {
    return this.score;
  }

  @inline
  addPiece(pieceColor: i32, pieceId: i32, pos: i32): void {
    const piece = pieceId * pieceColor;
    unchecked(this.items[pos] = piece);

    this.score += this.calculateScore(pos, pieceColor, pieceId);
    this.hashCode ^= unchecked(PIECE_RNG_NUMBERS[(piece + 6) * 64 + pos]);

    unchecked(this.bitBoardPieces[piece + 6] |= (1 << pos));
    unchecked(this.bitBoardAllPieces[indexFromColor(pieceColor)] |= (1 << pos));
  }

  @inline
  addPieceWithoutIncrementalUpdate(pieceColor: i32, piece: i32, pos: i32): void {
    unchecked(this.items[pos] = piece);
    unchecked(this.bitBoardPieces[piece + 6] |= (1 << pos));
    unchecked(this.bitBoardAllPieces[indexFromColor(pieceColor)] |= (1 << pos));
  }

  @inline
  removePiece(pos: i32): i32 {
    const piece = unchecked(this.items[pos]);

    const color = sign(piece);
    this.score -= this.calculateScore(pos, color, abs(piece));
    this.hashCode ^= unchecked(PIECE_RNG_NUMBERS[(piece + 6) * 64 + pos]);

    return this.remove(piece, color, pos);
  }

  // Version of removePiece for optimization purposes without incremental update
  @inline
  removePieceWithoutIncrementalUpdate(pos: i32): i32 {
    const piece = unchecked(this.items[pos]);
    return this.remove(piece, sign(piece), pos);
  }

  @inline
  private remove(piece: i32, pieceColor: i32, pos: i32): i32 {
    unchecked(this.bitBoardPieces[piece + 6] &= ~(1 << pos));
    unchecked(this.bitBoardAllPieces[indexFromColor(pieceColor)] &= ~(1 << pos));
    unchecked(this.items[pos] = EMPTY);

    if (piece == ROOK) {
      if (pos == WHITE_LEFT_ROOK_START) {
        this.setWhiteLeftRookMoved();
      } else if (pos == WHITE_RIGHT_ROOK_START) {
        this.setWhiteRightRookMoved();
      }
    } else if (piece == -ROOK) {
      if (pos == BLACK_LEFT_ROOK_START) {
        this.setBlackLeftRookMoved();
      } else if (pos == BLACK_RIGHT_ROOK_START) {
        this.setBlackRightRookMoved();
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
        this.removePiece(WHITE_RIGHT_ROOK_START);
        this.addPiece(pieceColor, ROOK, WHITE_KING_START + 1);

      } else if (start - end == 2) {
        this.removePiece(WHITE_LEFT_ROOK_START);
        this.addPiece(pieceColor, ROOK, WHITE_KING_START - 1);

      }

    } else if (ownPiece == -KING) {
      this.updateBlackKingPosition(end);

      // Special castling handling
      if (start - end == -2) {
        this.removePiece(BLACK_RIGHT_ROOK_START);
        this.addPiece(pieceColor, ROOK, BLACK_KING_START + 1);

      } else if (start - end == 2) {
        this.removePiece(BLACK_LEFT_ROOK_START);
        this.addPiece(pieceColor, ROOK, BLACK_KING_START - 1);
      }
    }

    this.positionHistory.push(this.getHash());
    return EMPTY;
  };

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
        this.addPieceWithoutIncrementalUpdate(WHITE, ROOK, WHITE_RIGHT_ROOK_START);

      } else if (start - end == 2) {
        this.removePieceWithoutIncrementalUpdate(WHITE_KING_START - 1);
        this.addPieceWithoutIncrementalUpdate(WHITE, ROOK, WHITE_LEFT_ROOK_START);

      }

    } else if (piece == -KING) {
      this.updateBlackKingPosition(start);

      // Undo Castle
      if (start - end == -2) {
        this.removePieceWithoutIncrementalUpdate(BLACK_KING_START + 1);
        this.addPieceWithoutIncrementalUpdate(BLACK, -ROOK, BLACK_RIGHT_ROOK_START);

      } else if (start - end == 2) {
        this.removePieceWithoutIncrementalUpdate(BLACK_KING_START - 1);
        this.addPieceWithoutIncrementalUpdate(BLACK, -ROOK, BLACK_LEFT_ROOK_START);

      }
    }

    this.restoreState();
  };

  undoNullMove(): void {
    this.restoreState();
  }

  hasOrthogonalSlidingFigure(color: i32, pos: i32): bool {
    const pieces = unchecked(this.bitBoardPieces[color * ROOK + 6]) | unchecked(this.bitBoardPieces[color * QUEEN + 6]);
    return (pieces & (1 << pos)) != 0;
  }

  hasDiagonalSlidingFigure(color: i32, pos: i32): bool {
    const pieces = unchecked(this.bitBoardPieces[color * BISHOP + 6]) | unchecked(this.bitBoardPieces[color * QUEEN + 6]);
    return (pieces & (1 << pos)) != 0;
  }

  hasKnight(color: i32, pos: i32): bool {
    return (unchecked(this.bitBoardPieces[KNIGHT * color + 6]) & (1 << pos)) != 0;
  }

  @inline
  isKnightAttacked(opponentColor: i32, pos: i32): bool {
    return (unchecked(this.bitBoardPieces[KNIGHT * opponentColor + 6]) & unchecked(KNIGHT_PATTERNS[pos])) != 0;
  }

  @inline
  calculateScore(pos: i32, color: i32, pieceId: i32): i32 {
    if (color == WHITE) {
      return unchecked(WHITE_POSITION_SCORES[(this.endgame << 9) + (pieceId - 1) * 64 + pos])

    } else {
      return unchecked(BLACK_POSITION_SCORES[(this.endgame << 9) + (pieceId - 1) * 64 + pos])
    }
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
    unchecked(this.items[HALFMOVE_COUNT_INDEX]++);
    unchecked(this.items[HALFMOVE_CLOCK_INDEX]++);

    this.hashCode ^= PLAYER_RNG_NUMBER;
  }

  @inline
  initializeHalfMoveCount(value: i32): void {
    this.items[HALFMOVE_COUNT_INDEX] = value;
  }

  @inline
  setHalfMoveClock(value: i32): void {
    this.items[HALFMOVE_CLOCK_INDEX] = value;
  }

  @inline
  resetHalfMoveClock(): void {
    unchecked(this.items[HALFMOVE_CLOCK_INDEX] = 0);
  }

  @inline
  getHalfMoveClock(): i32 {
    return this.items[HALFMOVE_CLOCK_INDEX];
  }

  @inline
  getHalfMoveCount(): i32 {
    return this.items[HALFMOVE_COUNT_INDEX];
  }

  @inline
  getFullMoveCount(): i32 {
    return this.items[HALFMOVE_COUNT_INDEX] / 2 + 1;
  }

  @inline
  getActivePlayer(): i32 {
    return (unchecked(this.items[HALFMOVE_COUNT_INDEX]) & 1) === 0 ? WHITE : BLACK;
  }

  @inline
  getState(): i32 {
    return unchecked(this.items[this.items.length - 1]);
  }

  @inline
  whiteKingMoved(): bool {
    return (this.getState() & WHITE_KING_MOVED) != 0;
  }

  @inline
  blackKingMoved(): bool {
    return (this.getState() & BLACK_KING_MOVED) != 0;
  }

  @inline
  whiteLeftRookMoved(): bool {
    return (this.getState() & WHITE_LEFT_ROOK_MOVED) != 0;
  }

  @inline
  whiteRightRookMoved(): bool {
    return (this.getState() & WHITE_RIGHT_ROOK_MOVED) != 0;
  }

  @inline
  blackLeftRookMoved(): bool {
    return (this.getState() & BLACK_LEFT_ROOK_MOVED) != 0;
  }

  @inline
  blackRightRookMoved(): bool {
    return (this.getState() & BLACK_RIGHT_ROOK_MOVED) != 0;
  }

  @inline
  setWhiteKingMoved(): void {
    if (!this.whiteKingMoved()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.setStateBit(WHITE_KING_MOVED);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setBlackKingMoved(): void {
    if (!this.blackKingMoved()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.setStateBit(BLACK_KING_MOVED);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setWhiteLeftRookMoved(): void {
    if (!this.whiteLeftRookMoved()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.setStateBit(WHITE_LEFT_ROOK_MOVED);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setWhiteRightRookMoved(): void {
    if (!this.whiteRightRookMoved()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.setStateBit(WHITE_RIGHT_ROOK_MOVED);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setBlackLeftRookMoved(): void {
    if (!this.blackLeftRookMoved()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.setStateBit(BLACK_LEFT_ROOK_MOVED);
      this.updateHashForCastling(previousCastlingState);
    }
  };

  @inline
  setBlackRightRookMoved(): void {
    if (!this.blackRightRookMoved()) {
      const previousCastlingState = this.getCastlingStateBits();
      this.setStateBit(BLACK_RIGHT_ROOK_MOVED);
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
    return (this.getState() >> CASTLING_BITSTART) & 0x3f; // extract 6-bits from state which describe the castling state
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

  isAttacked(opponentColor: i32, pos: i32): bool {

    const occupied = this.getAllPieceBitBoard(WHITE) | this.getAllPieceBitBoard(BLACK);

    const diaAttacks = diagonalAttacks(occupied, pos);
    const antiDiaAttacks = antiDiagonalAttacks(occupied, pos);
    const bishops = this.getBitBoard(BISHOP * opponentColor + 6);
    const queens = this.getBitBoard(QUEEN * opponentColor + 6);
    if ((diaAttacks & bishops) != 0 || (diaAttacks & queens) != 0 || (antiDiaAttacks & bishops) != 0 || ((antiDiaAttacks & queens) != 0)) {
      return true;
    }

    const hAttacks = horizontalAttacks(occupied, pos);
    const vAttacks = verticalAttacks(occupied, pos);
    const rooks = this.getBitBoard(ROOK * opponentColor + 6);
    if ((hAttacks & rooks) != 0 || (hAttacks & queens) != 0 || (vAttacks & rooks) != 0 || ((vAttacks & queens) != 0)) {
      return true;
    }

    return this.isKnightAttacked(opponentColor, pos) ||
      this.isAttackedByPawns(opponentColor, pos) ||
      this.isAttackedByKing(opponentColor, pos);
  }

  @inline
  isAttackedByKing(opponentColor: i32, pos: i32): bool {
    const opponentKingAttacks: u64 = unchecked(KING_PATTERNS[this.findKingPosition(opponentColor)]);
    return ((opponentKingAttacks & (1 << u64(pos))) != 0);
  }


  @inline
  isAttackedByPawns(opponentColor: i32, pos: i32): bool {
    const opponentPawns = this.getBitBoard(PAWN * opponentColor + 6);
    if (opponentColor == WHITE) {
      return (whitePawnAttacks(opponentPawns) & (1 << u64(pos))) != 0;
    } else {
      return (blackPawnAttacks(opponentPawns) & (1 << u64(pos))) != 0;
    }
  }

  @inline
  isAttackedDiagonally(opponentColor: i32, pos: i32, bitPos: i32, occupied: u64): bool {
    const diaAttacks = diagonalAttacks(occupied, bitPos);
    const queens = this.getBitBoard(QUEEN * opponentColor + 6);
    const bishops = this.getBitBoard(BISHOP * opponentColor + 6);
    const antiDiaAttacks = antiDiagonalAttacks(occupied, bitPos);

    return (diaAttacks & bishops) != 0 || (diaAttacks & queens) != 0 || (antiDiaAttacks & bishops) != 0 || ((antiDiaAttacks & queens) != 0);
  }


  @inline
  isAttackedOrthogonally(opponentColor: i32, pos: i32, bitPos: i32, occupied: u64): bool {
    const hAttacks = horizontalAttacks(occupied, bitPos);
    const queens = this.getBitBoard(QUEEN * opponentColor + 6);
    const rooks = this.getBitBoard(ROOK * opponentColor + 6);
    const vAttacks = verticalAttacks(occupied, bitPos);

    return (hAttacks & rooks) != 0 || (hAttacks & queens) != 0 || (vAttacks & rooks) != 0 || ((vAttacks & queens) != 0);
  }

  logBitBoards(color: i32): void {
    for (let i = 0; i < this.bitBoardPieces.length; i++) {
      trace("Piece " + (i - 6).toString() + ": " + toBitBoardString(this.bitBoardPieces[i]));
    }
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
    return this.positionHistory.isSingleRepetition() || this.isFiftyMoveDraw();
  }

  @inline
  isEndGame(): bool {
    return this.endgame != 0;
  }

  updateEndGameStatus(): void {
    const pawnCount = popcnt(this.getBitBoard(PAWN * WHITE + 6)) + popcnt(this.getBitBoard(PAWN * BLACK + 6));
    if (pawnCount <= 3) {
      this.endgame = 1;
      return;
    }
    const otherPieceCount = popcnt(this.getBitBoard(KNIGHT * WHITE + 6)) + popcnt(this.getBitBoard(KNIGHT * BLACK + 6)) +
      popcnt(this.getBitBoard(BISHOP * WHITE + 6)) + popcnt(this.getBitBoard(BISHOP * BLACK + 6)) +
      popcnt(this.getBitBoard(ROOK * WHITE + 6)) + popcnt(this.getBitBoard(ROOK * BLACK + 6)) +
      popcnt(this.getBitBoard(QUEEN * WHITE + 6)) + popcnt(this.getBitBoard(QUEEN * BLACK + 6));

    this.endgame = otherPieceCount <= 3 ? 1 : 0;
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
export const WHITE_KING_MOVED: i32 = 1 << 7;
export const BLACK_KING_MOVED: i32 = 1 << 8;
export const WHITE_LEFT_ROOK_MOVED: i32 = 1 << 9;
export const WHITE_RIGHT_ROOK_MOVED: i32 = 1 << 10;
export const BLACK_LEFT_ROOK_MOVED: i32 = 1 << 11;
export const BLACK_RIGHT_ROOK_MOVED: i32 = 1 << 12;

const CASTLING_BITSTART = 7;


// Encode 'en passant' move possibilities for
// white pawns in bits 13 to 20 and for
// black pawns in bits 21 to 28

const BITS: Array<i32> = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
const EN_PASSANT_BITSTART = 13;
const EN_PASSANT_BITMASKS: Int32Array = toInt32Array(BITS.map<i32>(calculateEnPassantBitMask));

function calculateEnPassantBitMask(bit: i32, index: i32, array: Array<i32>): i32 {
  return 1 << bit;
}

export const PAWN_POSITION_SCORES: Int32Array = toInt32Array([
  0,  0,  0,  0,  0,  0,  0,  0,
  10, 10, 10, 10, 10, 10, 10, 10,
  6,  6,  7,  8,  8,  7,  6,  6,
  2,  2,  3,  5,  5,  3,  2,  2,
  0,  0,  0,  4,  4,  0,  0,  0,
  1, -1, -2,  0,  0, -2, -1,  1,
  1,  2,  2, -4, -4,  2,  2,  1,
  0,  0,  0,  0,  0,  0,  0,  0,
]);

const KNIGHT_POSITION_SCORES: Int32Array = toInt32Array([
  -10, -8, -6, -6, -6, -6, -8,-10,
  -8, -4,  0,  0,  0,  0, -4, -8,
  -6,  0,  2,  3,  3,  2,  0, -6,
  -6,  1,  3,  4,  4,  3,  1, -6,
  -6,  0,  3,  4,  4,  3,  0, -6,
  -6,  1,  2,  3,  3,  2,  1, -6,
  -8, -4,  0,  1,  1,  0, -4, -8,
  -10, -8, -6, -6, -6, -6, -8,-10,
]);

const BISHOP_POSITION_SCORES: Int32Array = toInt32Array([
  -4, -2, -2, -2, -2, -2, -2, -4,
  -2,  0,  0,  0,  0,  0,  0, -2,
  -2,  0,  1,  2,  2,  1,  0, -2,
  -2,  1,  1,  2,  2,  1,  1, -2,
  -2,  0,  2,  2,  2,  2,  0, -2,
  -2,  2,  2,  2,  2,  2,  2, -2,
  -2,  1,  0,  0,  0,  0,  1, -2,
  -4, -2, -2, -2, -2, -2, -2, -4
]);

const ROOK_POSITION_SCORES: Int32Array = toInt32Array([
   0,  0,  0,  0,  0,  0,  0,  0,
   1,  2,  2,  2,  2,  2,  2,  1,
  -1,  0,  0,  0,  0,  0,  0, -1,
  -1,  0,  0,  0,  0,  0,  0, -1,
  -1,  0,  0,  0,  0,  0,  0, -1,
  -1,  0,  0,  0,  0,  0,  0, -1,
  -1,  0,  0,  0,  0,  0,  0, -1,
   0,  0,  0,  1,  1,  0,  0,  0
]);

const QUEEN_POSITION_SCORES: Int32Array = toInt32Array([
  -4, -2, -2, -1, -1, -2, -2, -4,
  -2,  0,  0,  0,  0,  0,  0, -2,
  -2,  0,  1,  1,  1,  1,  0, -2,
  -1,  0,  1,  1,  1,  1,  0, -1,
   0,  0,  1,  1,  1,  1,  0, -1,
  -2,  1,  1,  1,  1,  1,  0, -2,
  -2,  0,  1,  0,  0,  0,  0, -2,
  -4, -2, -2, -1, -1, -2, -2, -4
]);

const KING_POSITION_SCORES: Int32Array = toInt32Array([
  -6, -8, -8, -10, -10, -8, -8, -6,
  -6, -8, -8, -10, -10, -8, -8, -6,
  -6, -8, -8, -10, -10, -8, -8, -6,
  -6, -8, -8, -10, -10, -8, -8, -6,
  -4, -6, -6,  -8,  -8, -6, -6, -4,
  -2, -4, -4,  -4,  -4, -4, -4, -2,
   4,  4,  0,   0,   0,  0,  4,  4,
   4,  6,  2,   0,   0,  2,  6,  4
]);

const KING_ENDGAME_POSITION_SCORES: Int32Array = toInt32Array([
  -10, -8, -6, -4, -4, -6, -8, -10,
  -6, -4, -2,  0,  0, -2, -4, -6,
  -6, -2,  4,  6,  6,  4, -2, -6,
  -6, -2,  6,  8,  8,  6, -2, -6,
  -6, -2,  6,  8,  8,  6, -2, -6,
  -6, -2,  4,  6,  6,  4, -2, -6,
  -6, -6,  0,  0,  0,  0, -6, -6,
  -10, -6, -6, -6, -6, -6, -6, -10
]);

function combineScores(color: i32, arrays: Int32Array[]): Int32Array {
  let size = 0;
  for (let i = 0; i < arrays.length; i++) {
    size += arrays[i].length;
  }

  const result = new Int32Array(64 * 14);
  let index = 0;
  for (let i = 0; i < arrays.length; i++) {
    if (i == 6) {
      // fill 2x 64 elements to align with 512
      for (let j = 0; j < 128; j++) {
        result[index++] = 0;
      }
    }
    const pieceValue = PIECE_VALUES[i % 6] * color;
    for (let j = 0; j < arrays[i].length; j++) {
      result[index++] = arrays[i][j] * 5 * color + pieceValue;
    }
  }
  return result;
}

const WHITE_POSITION_SCORES: Int32Array = combineScores(WHITE, [
  PAWN_POSITION_SCORES, KNIGHT_POSITION_SCORES, BISHOP_POSITION_SCORES, ROOK_POSITION_SCORES, QUEEN_POSITION_SCORES, KING_POSITION_SCORES,
  PAWN_POSITION_SCORES, KNIGHT_POSITION_SCORES, BISHOP_POSITION_SCORES, ROOK_POSITION_SCORES, QUEEN_POSITION_SCORES, KING_ENDGAME_POSITION_SCORES
]);

const BLACK_POSITION_SCORES: Int32Array = combineScores(BLACK, [
  mirrored(PAWN_POSITION_SCORES), mirrored(KNIGHT_POSITION_SCORES), mirrored(BISHOP_POSITION_SCORES), mirrored(ROOK_POSITION_SCORES), mirrored(QUEEN_POSITION_SCORES), mirrored(KING_POSITION_SCORES),
  mirrored(PAWN_POSITION_SCORES), mirrored(KNIGHT_POSITION_SCORES), mirrored(BISHOP_POSITION_SCORES), mirrored(ROOK_POSITION_SCORES), mirrored(QUEEN_POSITION_SCORES), mirrored(KING_ENDGAME_POSITION_SCORES)]);

export function mirrored(input: Int32Array): Int32Array {
  let output = input.slice(0);
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
