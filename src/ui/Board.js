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
import { __ } from '../engine/constants';
import Field from './Field';
import Piece from './Piece';
import styled from 'styled-components/macro';

const BoardGrid = styled.div`
    display: grid;
    grid-template-columns: 0 repeat(8, 1fr);
    grid-template-rows: 0 repeat(8, 1fr);

    border-right: 1px solid salmon;
    
    // always keep board size rectangular and maximized to the smaller axis
    @media (min-aspect-ratio: 99/100) {
          width: 100vh;
          height: 100vh;
    }
    @media (max-aspect-ratio: 100/99) {
          width: 100vw;
          height: 100vw;
    }
`;

const Board = ({board, lastMove, currentPieceMoves, handlePlayerMove, updatePossibleMoves, clearPossibleMoves}) => {
  return (
    <BoardGrid>
      {board.map((item, idx) => {
        if (idx % 10 === 9 || idx >= 100 || idx < 10) {
          return null; // skip
        }

        if (item === __) {
          return <div key={idx} className="board_frame" />;
        }

        return (
          <Field
            key={idx}
            boardIndex={idx}
            movePiece={handlePlayerMove}
            isStart={idx === lastMove.start}
            isEnd={idx === lastMove.end}
            isPossibleTarget={currentPieceMoves.has(idx)}
          >
            {item !== 0 && (
              <Piece
                boardIndex={idx}
                color={item < 0 ? 'black' : 'white'}
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