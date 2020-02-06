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

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components/macro';

import engineWorkerLoader from 'workerize-loader!../engine/engine.worker'; // eslint-disable-line import/no-webpack-loader-syntax
import { B, BLACK, N, P, Q, R, WHITE } from '../engine/constants';
import AnimatedSpinner from './AnimatedSpinner';
import { Move } from '../engine/move';
import Board from './Board';
import GameMenu from './GameMenu';

const engine = engineWorkerLoader();

const GameArea = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const nextPlayer = playerColor => -playerColor;

const Game = () => {
  const [rotateBoard, setRotateBoard] = useState(false);
  const [activePlayer, setActivePlayer] = useState(WHITE);
  const [humanPlayerColor, setHumanPlayerColor] = useState(WHITE);
  const [isAiThinking, setAiThinking] = useState(false);
  const [board, setBoard] = useState();
  const [gameEnded, setGameEnded] = useState(false);
  const [availableMoves, setAvailableMoves] = useState([]);
  const [currentPieceMoves, setCurrentPieceMoves] = useState(new Set());
  const [winningPlayer, setWinningPlayer] = useState();
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [moveHistory, setMoveHistory] = useState([]);

  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : { start: -1, end: -1 };

  const clearAvailableMoves = () => setAvailableMoves([]);
  const addMove = useCallback(move => setMoveHistory([...moveHistory, move]), [setMoveHistory, moveHistory]);

  const updateGame = useCallback(async state => {
    console.log("State", state);
    setBoard(state.board);
    setAvailableMoves(state.moves);
    setActivePlayer(state.activePlayer);

    if (state.gameEnded) {
      setGameEnded(true);

      if (state.checkMate) {
        setWinningPlayer(nextPlayer(state.activePlayer));
      }
    }
  }, []);

  const handleAIMove = useCallback(async move => {
    const gameState = await engine.performMove(move);
    setAiThinking(false);
    await updateGame(gameState);
    addMove(move);
  }, [updateGame, addMove]);

  useEffect(() => {
    (async () => {
      await engine.init();
      await engine.newGame();
      const gameState = await engine.setPosition(startPosition, []);
      await updateGame(gameState);
    })();
  }, [updateGame]);

  const canMove = (start, end) => {
    return availableMoves.some(
      move => move.start === start && move.end === end
    );
  };

  const calculateAIMove = useCallback(async () => {
    clearAvailableMoves();
    setAiThinking(true);

    const aiMove = await engine.calculateMove(difficultyLevel);
    await handleAIMove(aiMove);
  }, [difficultyLevel, handleAIMove]);

  useEffect(() => {
    if (humanPlayerColor !== activePlayer) {
      calculateAIMove();
    }
  }, [humanPlayerColor, activePlayer, calculateAIMove]);

  const switchSides = () => {
    setRotateBoard(true);
    setHumanPlayerColor(-humanPlayerColor);
  }

  const startNewGame = async () => {
    setActivePlayer(WHITE);
    setHumanPlayerColor(WHITE);

    await engine.newGame();
    const gameState = await engine.setPosition(startPosition, []);

    setRotateBoard(false);
    setGameEnded(false);
    setMoveHistory([]);
    setWinningPlayer(undefined);
    setCurrentPieceMoves(new Set());

    await updateGame(gameState);
  };

  const undoMove = useCallback(async () => {
    const previousMoveHistory = moveHistory.slice(0, moveHistory.length - 2);
    const gameState = await engine.setPosition(startPosition, previousMoveHistory);
    setMoveHistory(previousMoveHistory);
    await updateGame(gameState);
  }, [moveHistory, setMoveHistory, updateGame]);

  const handlePlayerMove = async (piece, start, end) => {
    let pieceId = Math.abs(piece);
    if (gameEnded || isAiThinking) {
      return;
    }

    if (!canMove(start, end)) {
      return;
    }

    setCurrentPieceMoves(new Set());

    // TODO: Replace browser prompt dialog with own dialog
    if (pieceId === P && ((activePlayer === WHITE && end < 8) || (activePlayer === BLACK && end >= 56))) {
      // Promotion
      const choice = prompt('Choose promotion (Q, R, B, N)', 'Q');
      switch (choice.toUpperCase()) {
        case 'R':
          pieceId = R;
          break;
        case 'B':
          pieceId = B;
          break;
        case 'N':
          pieceId = N;
          break;
        case 'Q':
        default:
          pieceId = Q;
          break;
      }
    }

    const interimBoard = board.slice();
    interimBoard[start] = 0;
    setBoard(interimBoard);

    const gameState = await engine.performMove(new Move(pieceId, start, end));
    addMove(new Move(piece, start, end));
    await updateGame(gameState);
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
    board
      ? (
        <GameArea>
          <Board
            board={board}
            isRotated={rotateBoard}
            lastMove={lastMove}
            currentPieceMoves={currentPieceMoves}
            handlePlayerMove={handlePlayerMove}
            updatePossibleMoves={updatePossibleMoves}
            clearPossibleMoves={clearPossibleMoves}
          />
          <GameMenu
            isAiThinking={isAiThinking}
            firstMovePlayed={lastMove.start !== -1}
            humanPlayerColor={humanPlayerColor}
            gameEnded={gameEnded}
            winningPlayerColor={winningPlayer}
            startNewGame={startNewGame}
            switchSides={switchSides}
            rotateBoard={() => setRotateBoard(!rotateBoard)}
            difficultyLevel={difficultyLevel}
            setDifficultyLevel={setDifficultyLevel}
            canUndoMove={!gameEnded && moveHistory.length > 1}
            undoMove={undoMove}
          />
        </GameArea>
      )
      : (
        <Centered><AnimatedSpinner/></Centered>
      )
  );
};

const Centered = styled.div`
  position: absolute;
  left: calc(50% - 60px);
  top: calc(50% - 60px);
`;

export default Game;
