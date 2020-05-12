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
import { BLACK, P, WHITE } from '../engine/constants';
import AnimatedSpinner from './AnimatedSpinner';
import { Move } from '../engine/move';
import Board from './Board';
import GameMenu from './GameMenu';
import PromotionPieceSelection from './PromotionPieceSelection';

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
  const [isAiTurn, setAiTurn] = useState(false);
  const [board, setBoard] = useState();
  const [gameEnded, setGameEnded] = useState(false);
  const [availableMoves, setAvailableMoves] = useState([]);
  const [currentPieceMoves, setCurrentPieceMoves] = useState(new Set());
  const [winningPlayer, setWinningPlayer] = useState();
  const [difficultyLevel, setDifficultyLevel] = useState(6);
  const [moveHistory, setMoveHistory] = useState([]);
  const [promotion, setPromotion] = useState(undefined);
  const [inCheck, setInCheck] = useState(0);

  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : { start: -1, end: -1 };

  const clearAvailableMoves = () => setAvailableMoves([]);

  const addMove = useCallback(move => {
    setMoveHistory([...moveHistory, move])
  }, [setMoveHistory, moveHistory]);

  const updateGame = useCallback(async state => {
    setBoard(state.board);
    setAvailableMoves(state.moves);

    if (state.whiteInCheck) {
      setInCheck(WHITE);
    } else if (state.blackInCheck) {
      setInCheck(BLACK);
    } else {
      setInCheck(0);
    }

    if (state.gameEnded) {
      setGameEnded(true);

      if (state.checkMate) {
        setWinningPlayer(nextPlayer(state.activePlayer));
      }
    } else {
      setActivePlayer(state.activePlayer);
    }

  }, []);

  // Initialize chess engine and game state
  useEffect(() => {
    (async () => {
      await engine.init();
      await engine.newGame();
      const gameState = await engine.setPosition(startPosition, []);
      await updateGame(gameState);
    })();
  }, [updateGame]);

  const canMove = useCallback((start, end) => {
    return availableMoves.some(
      move => move.start === start && move.end === end
    );
  }, [availableMoves]);

  const asyncDelay = (millis) => new Promise(resolve => setTimeout(resolve, millis));

  const calculateAIMove = useCallback(async () => {
    clearAvailableMoves();
    setAiTurn(true);

    const [move] = await Promise.all([engine.calculateMove(difficultyLevel), asyncDelay(150)]);

    const gameState = await engine.performMove(move);
    setAiTurn(false);
    await updateGame(gameState);
    addMove(move);
  }, [difficultyLevel, addMove, updateGame]);

  const switchSides = async () => {
    setRotateBoard(true);
    setHumanPlayerColor(-humanPlayerColor);
    setAiTurn(true);
  };

  // Calculate next AI move whenever isAiTurn is set to true
  useEffect( () => {
    if (isAiTurn) {
      (async () => {
        await calculateAIMove();
      })();
    }
  }, [isAiTurn, calculateAIMove]);

  const startNewGame = async () => {
    setGameEnded(false);
    setWinningPlayer(undefined);
    setActivePlayer(WHITE);
    setHumanPlayerColor(WHITE);
    setMoveHistory([]);
    setCurrentPieceMoves(new Set());

    await engine.newGame();
    const gameState = await engine.setPosition(startPosition, []);
    await updateGame(gameState);

    setRotateBoard(false);
  };

  const undoMove = useCallback(async () => {
    const previousMoveHistory = moveHistory.slice(0, moveHistory.length - 2);
    const gameState = await engine.setPosition(startPosition, previousMoveHistory);
    setMoveHistory(previousMoveHistory);
    await updateGame(gameState);
  }, [moveHistory, setMoveHistory, updateGame]);

  const handlePlayerMove = useCallback(async (piece, start, end) => {
    let pieceId = Math.abs(piece);
    if (gameEnded || isAiTurn) {
      return;
    }

    if (!canMove(start, end)) {
      return;
    }

    setCurrentPieceMoves(new Set());

    if (pieceId === P && ((activePlayer === WHITE && end < 8) || (activePlayer === BLACK && end >= 56))) {
      // Promotion

      clearAvailableMoves();
      setPromotion({
        start: start,
        end: end,
        column: end & 7,
        color: activePlayer
      });
    } else {

      // Standard move
      const interimBoard = board.slice();
      interimBoard[start] = 0;
      setBoard(interimBoard);

      const move = new Move(pieceId, start, end);
      const gameState = await engine.performMove(move);
      await updateGame(gameState);
      addMove(move);

      if (!gameState.gameEnded) {
        setAiTurn(true);
      }
    }

  }, [activePlayer, addMove, board, canMove, gameEnded, isAiTurn, updateGame]);

  const handlePromotion = useCallback(async (pieceId) => {
    const { start, end } = promotion;
    setPromotion(undefined);
    const interimBoard = board.slice();
    interimBoard[start] = 0;
    setBoard(interimBoard);

    const move = new Move(pieceId, start, end);
    const gameState = await engine.performMove(move);
    await updateGame(gameState);
    addMove(move);

    if (!gameState.gameEnded) {
      setAiTurn(true);
    }
  }, [addMove, board, promotion, setPromotion, updateGame]);

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
          {promotion &&
          <PromotionPieceSelection column={promotion.column} playerColor={promotion.color} isRotated={rotateBoard}
                                   onSelection={handlePromotion}/>}
          <Board
            board={board}
            isRotated={rotateBoard}
            lastMove={lastMove}
            currentPieceMoves={currentPieceMoves}
            handlePlayerMove={handlePlayerMove}
            updatePossibleMoves={updatePossibleMoves}
            clearPossibleMoves={clearPossibleMoves}
            inCheck={inCheck}
          />
          <GameMenu
            isAiThinking={isAiTurn}
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
