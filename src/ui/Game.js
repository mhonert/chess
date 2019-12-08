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

import React, { useState } from 'react';
import styled from 'styled-components/macro';

import engineWorkerLoader from 'workerize-loader!../engine/engine.worker'; // eslint-disable-line import/no-webpack-loader-syntax
import { __, B, BLACK, K, N, P, Q, R, WHITE } from '../engine/constants';
import Board from './Board';
import GameMenu from './GameMenu';
import engine, { Move } from '../engine/engine-wasm-interop';

const engineWebWorker = engineWorkerLoader();

const initialState = 0;

const initialBoard = [
  __, __, __, __, __, __, __, __, __, __,
  __, __, __, __, __, __, __, __, __, __,
  __, -R, -N, -B, -Q, -K, -B, -N, -R, __,
  __, -P, -P, -P, -P, -P, -P, -P, -P, __,
  __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  __,  0,  0,  0,  0,  0,  0,  0,  0, __,
  __,  P,  P,  P,  P,  P,  P,  P,  P, __,
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
  const [availableMoves, setAvailableMoves] = useState(engine.generateMoves(board, activePlayer));
  const [currentPieceMoves, setCurrentPieceMoves] = useState(new Set());
  const [winningPlayer, setWinningPlayer] = useState();
  const [searchDepth, setSearchDepth] = useState(5);

  const clearAvailableMoves = () => setAvailableMoves([]);

  const nextPlayer = playerColor => -playerColor;

  const handleAIMove = (board, move, aiColor) => {
    setAiThinking(false);

    setLastMove(move);

    const newBoard = engine.performMove(board, move);
    setBoard(newBoard);

    if (engine.isCheckMate(newBoard, -aiColor)) {
      setGameEnded(true);
      setWinningPlayer(aiColor);

      return;
    }

    const availablePlayerMoves = engine.generateMoves(newBoard, -aiColor);
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
    engineWebWorker
      .calculateMove(board, activePlayer, searchDepth)
      .then(move => handleAIMove(board, move, activePlayer));
  };

  const startNewGame = () => {
    setBoard(initialBoard);
    setActivePlayer(WHITE);
    setGameEnded(false);
    setLastMove({ start: -1, end: -1 });
    setWinningPlayer(undefined);
    setAvailableMoves(engine.generateMoves(initialBoard, activePlayer));
    setCurrentPieceMoves(new Set());
  };

  const handlePlayerMove = (piece, start, end) => {
    let pieceId = Math.abs(piece);
    if (gameEnded || isAiThinking) {
      return;
    }

    if (!canMove(start, end)) {
      return;
    }

    setLastMove({ start, end });

    // TODO: Replace browser prompt dialog with own dialog
    if (pieceId === P && ((activePlayer === WHITE && end < 29) || (activePlayer === BLACK && end > 90))) {
      // Promotion
      const choice = prompt('Choose promotion (Q, R, B, K)', 'Q');
      switch (choice.toUpperCase()) {
        case 'R':
          pieceId = R;
          break;
        case 'B':
          pieceId = B;
          break;
        case 'K':
          pieceId = K;
          break;
        case 'Q':
        default:
          pieceId = Q;
          break;
      }
    }

    const newBoard = engine.performMove(board, new Move(pieceId, start, end));
    setBoard(newBoard);

    if (engine.isCheckMate(newBoard, -activePlayer)) {
      setGameEnded(true);
      setWinningPlayer(activePlayer);

      return;
    }

    const moves = engine.generateMoves(newBoard, -activePlayer);

    if (moves.length === 0) {
      setGameEnded(true);
      return;
    }

    setAiThinking(true);
    clearAvailableMoves();
    engineWebWorker
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
