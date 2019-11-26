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
import styled from 'styled-components/macro';
import { WHITE } from '../engine/board';
import { keyframes } from 'styled-components/macro';

const MenuBar = styled.div`
  display: flex;
  flex-direction: column;
  margin: 1rem;
  text-align: center;

  // center menubar below board, if window width is < window height
  @media (max-aspect-ratio: 100/99) {
    width: 100%;
  }
`;

const MenuItem = styled.div`
  position: relative;
  display: ${props => (props.hidden ? 'none' : 'flex')};
  align-self: center;
  padding-bottom: 0.5rem;
`;

const GameButton = styled.button`
  background: none;
  border: 1px solid salmon;
  border-radius: 0.5rem;
  color: salmon;
  font-size: 1rem;
  font-weight: bold;
  padding: 0.5rem;
  width: 11rem;

  & :hover {
    background: salmon;
    color: white;
    cursor: pointer;
  }
`;

const Label = styled.label`
  position: absolute;
  top: 1.3rem;
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  color: gray;
`;

const ThinkingIndicator = styled(MenuItem)`
  font-weight: bold;
  margin-left: 1rem;
  font-size: 1rem;
  text-align: center;
  color: salmon;
`;

const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const AnimatedDualRing = styled.div`
  /* Animated spinner from https://loading.io/css/ */
  display: inline-block;
  width: 128px;
  height: 128px;
  & :after {
    content: ' ';
    display: block;
    width: 80px;
    height: 80px;
    margin: 8px;
    border-radius: 50%;
    border: 6px solid salmon;
    border-color: salmon transparent salmon transparent;
    animation: ${rotate} 1.2s linear infinite;
  }
`;

const GameResult = styled(MenuItem)`
  padding-top: 2rem;
  font-weight: bold;
  font-size: 1.5rem;
  color: salmon;
`;

const colorName = color => (color === WHITE ? 'White' : 'Black');

const GameMenu = ({
  isAiThinking,
  gameEnded,
  winningPlayerColor,
  startNewGame,
  forceAiMove,
  searchDepth,
  setSearchDepth
}) => {
  return (
    <MenuBar>
      <MenuItem hidden={isAiThinking}>
        <GameButton disabled={isAiThinking} onClick={startNewGame}>
          New Game
        </GameButton>
      </MenuItem>
      <MenuItem hidden={isAiThinking || gameEnded}>
        <GameButton
          disabled={isAiThinking || gameEnded}
          onClick={forceAiMove}
          title="Let computer play the current color"
        >
          Computer Move
        </GameButton>
      </MenuItem>
      <MenuItem hidden={isAiThinking}>
        <Label htmlFor="game-menu_difficulty-slider">Difficulty</Label>
        <input
          id="game-menu_difficulty-slider"
          type="range"
          min="3"
          max="5"
          title="Difficulty"
          value={searchDepth}
          onChange={e => setSearchDepth(e.target.value)}
        />
      </MenuItem>

      {isAiThinking && (
        <ThinkingIndicator>
          <AnimatedDualRing>Thinking ...</AnimatedDualRing>
        </ThinkingIndicator>
      )}
      {gameEnded && (
        <GameResult>
          {winningPlayerColor
            ? colorName(winningPlayerColor) + ' wins!'
            : 'Stalemate!'}
        </GameResult>
      )}
    </MenuBar>
  );
};

export default GameMenu;
