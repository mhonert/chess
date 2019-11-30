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

import React from 'react';
import { useState } from 'react';
import styled from 'styled-components/macro';

import engineWorker from 'workerize-loader!../engine/web.worker'; // eslint-disable-line import/no-webpack-loader-syntax

import {
  generateMoves,
  isCheckMate,
  performMove
} from '../engine/move-generation';
import { __, WHITE } from '../engine/board';
import { B, K, N, P, Q, R } from '../engine/pieces';
import Board from './Board';
import GameMenu from './GameMenu';

const engine = engineWorker();

const initialState = 0;

// prettier-ignore
const initialBoard = [
    __, __, __, __, __, __, __, __, __, __,
    __, __, __, __, __, __, __, __, __, __,
    __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
    __, -P, -P, -P, -P, -P, -P, -P, -P, __,
    __,  0,  0,  0,  0,  0,  0,  0,  0, __,
    __,  0,  0,  0,  0,  0,  0,  0,  0, __,
    __,  0,  0,  0,  0,  0,  0,  0,  0, __,
    __,  0,  0,  0,  0,  0,  0,  0,  0, __,
    __,  P, -P, -P, -P, -P, -P, -P, -P, __,
    __,  R,  N,  B,  Q,  K,  B,  N,  R, __,
    __, __, __, __, __, __, __, __, __, __,
    __, __, __, __, __, __, __, __, __, __, initialState
];

const GameArea = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const Game = () => {
  const [activePlayer, setActivePlayer] = useState(WHITE);
  const [isAiThinking, setAiThinking] = useState(false);
  const [board, setBoard] = useState(initialBoard);
  const [gameEnded, setGameEnded] = useState(false);
  const [lastMove, setLastMove] = useState({ start: -1, end: -1 });
  const [availableMoves, setAvailableMoves] = useState(
    generateMoves(board, activePlayer)
  );
  const [currentPieceMoves, setCurrentPieceMoves] = useState(new Set());
  const [winningPlayer, setWinningPlayer] = useState();
  const [searchDepth, setSearchDepth] = useState(5);

  const clearAvailableMoves = () => setAvailableMoves([]);

  const nextPlayer = playerColor => -playerColor;

  const handleAIMove = (board, move, aiColor) => {
    setAiThinking(false);

    setLastMove(move);

    const newBoard = board.slice(0);
    performMove(newBoard, move);
    setBoard(newBoard);

    if (isCheckMate(newBoard, -aiColor)) {
      setGameEnded(true);
      setWinningPlayer(aiColor);

      return;
    }

    const availablePlayerMoves = generateMoves(newBoard, -aiColor);
    setAvailableMoves(availablePlayerMoves);

    if (availablePlayerMoves.length === 0) {
      setGameEnded(true);

      return;
    }

    setActivePlayer(nextPlayer(aiColor));
  };

  const canMove = (start, end) => {
    return availableMoves.some(
      move => move.start === start && move.end === end
    );
  };

  const forceAiMove = () => {
    setAiThinking(true);
    engine.calculateMove(board, activePlayer, searchDepth).then(move => {
      handleAIMove(board, move, activePlayer);
    });
  };

  const startNewGame = () => {
    setBoard(initialBoard);
    setActivePlayer(WHITE);
    setGameEnded(false);
    setLastMove({ start: -1, end: -1 });
    setWinningPlayer(undefined);
    setAvailableMoves(generateMoves(initialBoard, activePlayer));
    setCurrentPieceMoves(new Set());
  };

  const handlePlayerMove = (piece, start, end) => {
    const pieceId = Math.abs(piece);
    if (gameEnded || isAiThinking) {
      return;
    }

    if (!canMove(start, end)) {
      return;
    }

    setLastMove({ start, end });

    if (pieceId === 1 && activePlayer === WHITE && end < 29) {
      // Promotion
      const choice = prompt('Choose promotion (Q, R, B, K)', 'Q');
      switch (choice.toUpperCase()) {
        case 'R':
          piece = 4;
          break;
        case 'B':
          piece = 3;
          break;
        case 'K':
          piece = 2;
          break;
        case 'Q':
        default:
          piece = 5;
          break;
      }
    }

    const newBoard = board.slice(0);
    performMove(newBoard, { piece, start, end });
    setBoard(newBoard);

    if (isCheckMate(newBoard, -activePlayer)) {
      setGameEnded(true);
      setWinningPlayer(activePlayer);

      return;
    }

    const moves = generateMoves(newBoard, -activePlayer);

    if (moves.length === 0) {
      setGameEnded(true);
      return;
    }

    setAiThinking(true);
    clearAvailableMoves();
    engine
      .calculateMove(newBoard, -activePlayer, searchDepth)
      .then(move => handleAIMove(newBoard, move, -activePlayer));

    setActivePlayer(-activePlayer);
  };

  const updatePossibleMoves = start => {
    const possibleMoves = availableMoves
      .filter(move => move.start === start)
      .map(move => move.end);
    setCurrentPieceMoves(new Set(possibleMoves));
  };

  const clearPossibleMoves = () => {
    setCurrentPieceMoves(new Set());
  };

  return (
    <GameArea>
      <Board
        board={board}
        lastMove={lastMove}
        currentPieceMoves={currentPieceMoves}
        handlePlayerMove={handlePlayerMove}
        updatePossibleMoves={updatePossibleMoves}
        clearPossibleMoves={clearPossibleMoves}
      />
      <GameMenu
        isAiThinking={isAiThinking}
        gameEnded={gameEnded}
        winningPlayerColor={winningPlayer}
        startNewGame={startNewGame}
        forceAiMove={forceAiMove}
        searchDepth={searchDepth}
        setSearchDepth={setSearchDepth}
      />
    </GameArea>
  );
};

export default Game;
