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

import styled from 'styled-components/macro';
import { B, BLACK, N, Q, R, WHITE } from '../engine/constants';
import { PieceImage } from './Piece';
import React from 'react';

const Overlay = styled.div`
  outline: 1px solid #586e75;
  box-shadow: 3px 3px 3px #586e75;
  margin: 0;
  padding: 0;
  position: absolute;
  z-index: 1;
  
  @media (min-aspect-ratio: 99/100) {
    top: ${props => props.row * 12.5}vh;
    left: ${props => props.column * 12.5}vh;
    width: 12.5vh;
    height: 50vh;
  }
  @media (max-aspect-ratio: 100/99) {
    top: ${props => props.row * 12.5}vw;
    left: ${props => props.column * 12.5}vw;
    width: 12.5vw;
    height: 50vw;
  }
`;

const FieldDiv = styled.div`
  position: absolute;
  background-color: ${props => props.isEven ? '#fdf6e3' : '#eee8d5'};
  
  @media (min-aspect-ratio: 99/100) {
    top: ${props => props.row * 12.5}vh;
    width: 12.5vh;
    height: 12.5vh;
  }
  @media (max-aspect-ratio: 100/99) {
    top: ${props => props.row * 12.5}vw;
    width: 12.5vw;
    height: 12.5vw;
  }
`;

const PromotionPieceSelection = ({ column, playerColor, onSelection, isRotated }) => {
  const rotatedColumn = isRotated ? 7 - column : column;

  const top = playerColor === WHITE
    ? isRotated ? 4 : 0
    : isRotated ? 0 : 4;

  let pieces = (isRotated && playerColor !== BLACK) || (!isRotated && playerColor === BLACK) ? [N, B, R, Q] : [Q, R, B, N];

  return (
    <Overlay row={top} column={rotatedColumn}>
      {
        pieces.map((piece, index) => (
          <FieldDiv key={index} row={index} isEven={(rotatedColumn + index) & 1} onClick={() => onSelection(piece)}>
            <PieceImage color={playerColor} pieceId={piece}/>
          </FieldDiv>
        ))
      }
    </Overlay>
  );

};

export default PromotionPieceSelection;
