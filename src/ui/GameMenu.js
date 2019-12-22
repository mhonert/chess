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

import React from 'react';
import styled from 'styled-components/macro';
import { WHITE } from '../engine/constants';
import AnimatedSpinner from './AnimatedSpinner';

const MenuBar = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 1.5rem;
  margin-left: 2rem;
  text-align: center;

  // center menubar below board, if window width is < window height
  @media (max-aspect-ratio: 100/99) {
    margin-left: auto;
    margin-right: auto;
  }
`;

const MenuItem = styled.div`
  position: relative;
  display: ${props => (props.hidden ? 'none' : 'flex')};
  align-self: center;
  padding-bottom: 0.5rem;
`;

const GameButton = styled.button`
  background: white;
  color: #073642;
  border: 1px solid #073642;
  border-radius: 0.3rem;
  font-size: 1rem;
  font-weight: bold;
  padding: 0.5rem;
  width: 11rem;
  box-shadow: 1px 1px 1px #073642;

  & :hover {
    background: #073642;
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
  color: #073642;
`;

const GameResult = styled(MenuItem)`
  padding-top: 2rem;
  font-weight: bold;
  font-size: 1.5rem;
  color: #dc322f;
;
`;

const colorName = color => (color === WHITE ? 'White' : 'Black');

const GameMenu = ({
  isAiThinking,
  gameEnded,
  winningPlayerColor,
  startNewGame,
  forceAiMove,
  difficultyLevel,
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
          min="1"
          max="5"
          title="Difficulty"
          value={difficultyLevel}
          onChange={e => setSearchDepth(e.target.value)}
        />
      </MenuItem>

      {isAiThinking && <AnimatedSpinner /> }

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
