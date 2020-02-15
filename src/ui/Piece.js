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
import { useDrag } from 'react-dnd';
import styled from 'styled-components/macro';

import whitePawn from './img/white_pawn.svg';
import blackPawn from './img/black_pawn.svg';
import whiteKnight from './img/white_knight.svg';
import blackKnight from './img/black_knight.svg';
import whiteBishop from './img/white_bishop.svg';
import blackBishop from './img/black_bishop.svg';
import whiteRook from './img/white_rook.svg';
import blackRook from './img/black_rook.svg';
import whiteQueen from './img/white_queen.svg';
import blackQueen from './img/black_queen.svg';
import whiteKing from './img/white_king.svg';
import blackKing from './img/black_king.svg';
import { BLACK } from '../engine/constants';

const whiteImages = [
  whitePawn,
  whiteKnight,
  whiteBishop,
  whiteRook,
  whiteQueen,
  whiteKing
];

const blackImages = [
  blackPawn,
  blackKnight,
  blackBishop,
  blackRook,
  blackQueen,
  blackKing
];

const pieceNames = [ 'Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King' ]

const Image = styled.img`
  display: block;
  margin: 13%;
  height: 74%;
  width: 74%;

  &.dragging {
    visibility: hidden;
  }
  
  // Workaround for wrong Drag'n'Drop preview image rendering in Chrome (see https://github.com/react-dnd/react-dnd/issues/832)
  -webkit-transform: rotateZ(0deg);
`;

const isFirefox = typeof InstallTrigger !== 'undefined';

export const PieceImage = ({color, pieceId, ...props}) => {
  const img = color === BLACK ? blackImages[pieceId - 1] : whiteImages[pieceId - 1];
  return <Image src={img} alt={pieceNames[pieceId - 1]} {...props} />;
}

const Piece = ({ boardIndex, color, piece, onPickup, onDrop }) => {
  const pieceId = Math.abs(piece);
  const img = color === BLACK ? blackImages[pieceId - 1] : whiteImages[pieceId - 1];

  const [{ isDragging }, drag] = useDrag({
    item: {
      type: 'PIECE',
      pieceId,
      boardIndex
    },
    begin: monitor => onPickup(boardIndex),
    end: dropResult => onDrop(boardIndex),
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    })
  });

  const pieceImage =
    <Image
      ref={drag}
      src={img}
      className={isDragging ? 'dragging' : ''}
    />;

  // Workaround for wrong Drag'n'Drop preview image rendering in Firefox
  return isFirefox
    ?  <div ref={drag}>{pieceImage}</div>
    : pieceImage;
};

export default Piece;
