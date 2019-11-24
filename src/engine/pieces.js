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

export const pieces = {
  PAWN: {
    id: 1,
    name: 'Pawn',
    value: 1
  },

  KNIGHT: {
    id: 2,
    name: 'Knight',
    value: 3
  },

  BISHOP: {
    id: 3,
    name: 'Bishop',
    value: 3
  },

  ROOK: {
    id: 4,
    name: 'Rook',
    value: 5
  },

  QUEEN: {
    id: 5,
    name: 'Queen',
    value: 9
  },

  KING: {
    id: 6,
    name: 'King',
    value: 10 // actual value is not relevant => game is lost anyway in case of check mate
  }
};

const piecesSortedById = Object.values(pieces)
  .sort((pieceA, pieceB) => pieceA.id - pieceB.id)
  .map(value => value);


export const getPieceById = (pieceId) => {
  return piecesSortedById[pieceId - 1];
}

export const P = pieces.PAWN.id;
export const N = pieces.KNIGHT.id;
export const B = pieces.BISHOP.id;
export const R = pieces.ROOK.id;
export const Q = pieces.QUEEN.id;
export const K = pieces.KING.id;
