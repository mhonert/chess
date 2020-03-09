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
import Field from './Field';
import Piece from './Piece';
import styled from 'styled-components/macro';
import { BLACK, K, WHITE } from '../engine/constants';

const BoardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);

    @media (min-aspect-ratio: 99/100) {
      width: 100vh;
      height: 100vh;
    }
    @media (max-aspect-ratio: 100/99) {
      width: 100vw;
      height: 100vw;
    }
    
    box-shadow: 3px 3px 3px #586e75;
`;

const Board = ({board, isRotated, inCheck, lastMove, currentPieceMoves, handlePlayerMove, updatePossibleMoves, clearPossibleMoves}) => {
  return (
    <BoardGrid isRotated={isRotated}>
      {board.slice(0, 64).map((_, idx) => {
        const rotatedIndex = isRotated ? 63 - idx : idx;
        const item = board[rotatedIndex];

        return (
          <Field
            key={rotatedIndex}
            boardIndex={rotatedIndex}
            movePiece={handlePlayerMove}
            isEven={(rotatedIndex + (rotatedIndex >> 3)) % 2 === 0}
            isStart={rotatedIndex === lastMove.start}
            isEnd={rotatedIndex === lastMove.end}
            isPossibleTarget={currentPieceMoves.has(rotatedIndex)}
            isInCheck={Math.abs(item) === K && Math.sign(item) === inCheck}
          >
            {item !== 0 && (
              <Piece
                boardIndex={rotatedIndex}
                color={item < 0 ? BLACK : WHITE}
                piece={item}
                onPickup={updatePossibleMoves}
                onDrop={clearPossibleMoves}
              />
            )}
          </Field>
        );
      })}
    </BoardGrid>
  );
};

export default Board;