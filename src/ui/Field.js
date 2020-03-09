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
import { useDrop } from 'react-dnd';
import styled from 'styled-components/macro';

export const FieldDiv = styled.div`
  position: relative;
  background-color: ${props => props.isEven ? "#fdf6e3" : "#eee8d5"};
  
  &.mark:before {
    position: absolute;
    content: '';
    display: block;
    border-radius: 50%;
  }
  
  // always keep board size rectangular and maximized to the smaller axis
  @media (min-aspect-ratio: 99/100) {
    width: 12.5vh;
    height: 12.5vh;
    
    &.mark:before {
      top: 0.7vh;
      left: 0.7vh;
      bottom: 0.7vh;
      right: 0.7vh;
    }
    
    &.move:before {
      border: 0.6vh solid ${props => props.markColor};
      box-shadow: 0 0 0.2vh ${props => props.markColor};
    }
    
    &.check:before {
      top: 6vh;
      left: 6vh;
      bottom: 6vh;
      right: 6vh;
      background-color: ${props => props.markColor};
      box-shadow: 0 0 2.8vh 4vh ${props => props.markColor};
    }
  }
  
  @media (max-aspect-ratio: 100/99) {
    width: 12.5vw;
    height: 12.5vw;
    
    &.mark:before {
      top: 0.7vw;
      left: 0.7vw;
      bottom: 0.7vw;
      right: 0.7vw;
    }
    
    &.move:before {
      border: 0.6vw solid ${props => props.markColor};
      box-shadow: 0 0 0.2vw ${props => props.markColor};
    }
    
    &.check:before {
      top: 6vw;
      left: 6vw;
      bottom: 6vw;
      right: 6vw;
      background-color: ${props => props.markColor};
      box-shadow: 0 0 2.8vw 4vw ${props => props.markColor};
    }
  }
  
`;

const Field = ({
  boardIndex,
  children,
  movePiece,
  isEven,
  isStart,
  isEnd,
  isPossibleTarget,
  isInCheck
}) => {
  const [, dropRef] = useDrop({
    accept: 'PIECE',
    drop: (item, monitor) => {
      movePiece(item.pieceId, item.boardIndex, boardIndex);
    }
  });

  const fieldMarkStyle = isStart || isEnd || isPossibleTarget ? ' mark move'
                       : isInCheck ? 'mark check'
                       : '';

  const markColor = isPossibleTarget ? 'rgba(169, 189, 0, 0.69)'
                  : isStart ? '#dc322f9f'
                  : isEnd ? '#dc322faf'
                  : isInCheck ? '#ff322f'
                  : 'white';

  return (
    <FieldDiv
      ref={dropRef}
      isEven={isEven}
      markColor={markColor}
      className={fieldMarkStyle}
    >
      {children}
    </FieldDiv>
  );
};

export default Field;
