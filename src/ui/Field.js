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
import { useDrop } from 'react-dnd';
import styled from 'styled-components/macro';

const FieldDiv = styled.div`
  position: relative;
  background-color: #fdf6e3;
  
  &:nth-child(even) {
    background-color: #eee8d5;
  }

  &.move-mark:before {
    position: absolute;
    top: 4%;
    left: 4%;
    bottom: 4%;
    right: 4%;
    content: '';
    display: block;
    border: 0.5vh solid ${props => props.markColor};
    border-radius: 50%;
    //box-shadow: 0px 0px 1px ${props => props.markColor};
  }
`;

const Field = ({
  boardIndex,
  children,
  movePiece,
  isStart,
  isEnd,
  isPossibleTarget
}) => {
  const [, dropRef] = useDrop({
    accept: 'PIECE',
    drop: (item, monitor) => {
      movePiece(item.pieceId, item.boardIndex, boardIndex);
    }
  });

  const fieldMarkStyle =
    isStart || isEnd || isPossibleTarget ? 'move-mark' : '';

  // prettier-ignore
  const markColor = isPossibleTarget ? 'rgba(169,189,0,0.69)'
                  : isStart ? '#dc322f9f'
                  : isEnd ? '#dc322faf'
                  : 'white';

  return (
    <FieldDiv
      ref={dropRef}
      style={{ position: 'relative' }}
      isStart={isStart}
      markColor={markColor}
      className={fieldMarkStyle}
    >
      {children}
    </FieldDiv>
  );
};

export default Field;
