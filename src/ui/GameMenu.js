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

import React from 'react';
import styled from 'styled-components/macro';
import { WHITE } from '../engine/constants';
import AnimatedSpinner from './AnimatedSpinner';
import {
  faBalanceScale,
  faDiceFive,
  faDiceFour,
  faDiceOne,
  faDiceSix,
  faDiceThree,
  faDiceTwo,
  faExchangeAlt,
  faMedal,
  faPlus,
  faRetweet,
  faRobot,
  faUndo
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const MenuBar = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 0.7rem;
  margin-left: 1rem;
  text-align: center;
  align-items: center;

  // center menubar below board, if window width is < window height
  @media (max-aspect-ratio: 100/99) {
    margin-left: auto;
    margin-right: auto;
    flex-flow: column-reverse;
  }
`;

const MenuItem = styled.div`
  position: relative;
  display: ${props => (props.hidden ? 'none' : 'flex')};
  padding-bottom: 0.2rem;
  flex-direction: column;
  
  @media (max-aspect-ratio: 100/99) {
    flex-direction: row;
    align-self: center;
  }
`;

const GameButton = styled.button`
  background: white;
  color: #073642;
  border: 1px solid #073642;
  border-radius: 0.3rem;
  font-size: 1rem;
  font-weight: bold;
  padding: 0.5rem 0.3rem;
  width: 2.5rem;
  margin: 0.2rem;
  box-shadow: 1px 1px 1px #073642;
  
  &[disabled] {
    display: none;
  }

  & :hover {
    background: #073642;
    color: white;
    cursor: pointer;
  }
`;

const GameResult = styled(MenuItem)`
  margin-top: 0.3rem;
  font-weight: bold;
  font-size: 1.5rem;
  color: #073642;
  width: 100%;
  align-items: center;
  
  svg {
    margin-left: 1rem;
    margin-right: 1rem;
  }
`;

const IconRadioInput = styled.input`
  display: none;
  
  &:checked + label {
    opacity: 1;
  }
`;

const IconRadioLabel = styled.label`
  color: #073642;
  margin: 0.06rem 0.2rem;
  opacity: 0.2;
  
  & :hover {
    opacity: 0.5;
    cursor: pointer;
  }
`

const colorName = color => (color === WHITE ? 'White' : 'Black');

const getGameResultIcon = (winningPlayerColor, humanPlayerColor) => {
  if (!winningPlayerColor) {
    return faBalanceScale;
  }

  return winningPlayerColor === humanPlayerColor
    ? faMedal
    : faRobot;
}

const GameMenu = ({
  isAiThinking,
  firstMovePlayed,
  humanPlayerColor,
  gameEnded,
  winningPlayerColor,
  startNewGame,
  switchSides,
  rotateBoard,
  difficultyLevel,
  setDifficultyLevel,
  canUndoMove,
  undoMove,
}) => (
  <MenuBar>
    {gameEnded &&
    <GameResult>
      <FontAwesomeIcon icon={getGameResultIcon(winningPlayerColor, humanPlayerColor)} size="2x" />
      {winningPlayerColor ? colorName(winningPlayerColor) + ' wins!' : 'Draw!'}
    </GameResult>
    }

    <MenuItem hidden={isAiThinking}>

      <GameButton disabled={!firstMovePlayed} onClick={startNewGame}>
        <FontAwesomeIcon icon={faPlus} title="Start new game" />
      </GameButton>

      <GameButton disabled={gameEnded || firstMovePlayed} onClick={switchSides}>
        <FontAwesomeIcon icon={faExchangeAlt} title="Switch sides" />
      </GameButton>

      <GameButton disabled={!canUndoMove || gameEnded} onClick={undoMove}>
        <FontAwesomeIcon icon={faUndo} title="Undo move" />
      </GameButton>

      <GameButton disabled={gameEnded || !firstMovePlayed} onClick={rotateBoard}>
        <FontAwesomeIcon icon={faRetweet} title="Rotate board" />
      </GameButton>

    </MenuItem>

    <MenuItem hidden={isAiThinking || gameEnded}>
      <IconRadioButtons currentValue={difficultyLevel} name="difficulty-level" onChange={setDifficultyLevel}
                        options={[
                          {value: 1, description: "Difficulty level 1 (easy)", icon: faDiceOne},
                          {value: 2, description: "Difficulty level 2", icon: faDiceTwo},
                          {value: 3, description: "Difficulty level 3", icon: faDiceThree},
                          {value: 4, description: "Difficulty level 4", icon: faDiceFour},
                          {value: 5, description: "Difficulty level 5", icon: faDiceFive},
                          {value: 6, description: "Difficulty level 6 (hard)", icon: faDiceSix},
                        ]} />
    </MenuItem>

    {isAiThinking && <AnimatedSpinner /> }

  </MenuBar>
);

const IconRadioButtons = ({currentValue, name, options, onChange}) => (
  <>
    {options.map(({value, description, icon}) => (
      <React.Fragment key={`${name}-${value}`}>
        <IconRadioInput type="radio" id={`${name}-${value}`} name={name} value={value} defaultChecked={currentValue === value} onChange={(e) => onChange(e.target.value)} />
        <IconRadioLabel htmlFor={`${name}-${value}`}>
          <FontAwesomeIcon icon={icon} title={description} size="2x" />
        </IconRadioLabel>
      </React.Fragment>
      ))}
  </>
);

export default GameMenu;
