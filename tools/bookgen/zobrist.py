# A free and open source chess game using AssemblyScript and React
# Copyright (C) 2020 mhonert (https://github.com/mhonert)
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import chess
import numpy as np

from util import square_to_bb, Random

WHITE_KING_SIDE_CASTLING = 1 << 0
BLACK_KING_SIDE_CASTLING = 1 << 1
WHITE_QUEEN_SIDE_CASTLING = 1 << 2
BLACK_QUEEN_SIDE_CASTLING = 1 << 3

BIT_POS = [square_to_bb(sq) for sq in range(64)]


# Calculates the zobrist hash for the current board position
def calc_hash(board):
    hash = np.uint64(0)
    for idx, bitPos in enumerate(BIT_POS):
        piece = board.piece_at(bitPos)
        if piece:
            if piece.color:
                hash ^= (PIECE_RNG_NUMBERS[(piece.piece_type + 6) * 64 + idx])

            else:
                hash ^= (PIECE_RNG_NUMBERS[(-piece.piece_type + 6) * 64 + idx])

    if not board.turn:
        hash ^= PLAYER_RNG_NUMBER

    castling_bits = 0
    if board.castling_rights & chess.BB_A8:
        castling_bits |= BLACK_QUEEN_SIDE_CASTLING

    if board.castling_rights & chess.BB_H8:
        castling_bits |= BLACK_KING_SIDE_CASTLING

    if board.castling_rights & chess.BB_H1:
        castling_bits |= WHITE_KING_SIDE_CASTLING

    if board.castling_rights & chess.BB_A1:
        castling_bits |= WHITE_QUEEN_SIDE_CASTLING

    hash ^= CASTLING_RNG_NUMBERS[castling_bits]

    if board.ep_square is not None:
        ep_bit = 0
        if chess.A3 <= board.ep_square <= chess.H3:
            ep_bit |= ((board.ep_square - 16) + 8)

        if chess.A6 <= board.ep_square <= chess.H6:
            ep_bit |= (board.ep_square - 40)

        hash ^= EN_PASSANT_RNG_NUMBERS[ep_bit]

    return hash


rnd = Random()


def rand_array(count):
    numbers = []
    for i in range(count):
        numbers.append(rnd.rand64())
    return numbers


def last_element_zero(elements):
    elements[len(elements) - 1] = np.uint64(0)
    return elements


PIECE_RNG_NUMBERS = rand_array(13 * 64)
PLAYER_RNG_NUMBER = rnd.rand64()
EN_PASSANT_RNG_NUMBERS = rand_array(16)

CASTLING_RNG_NUMBERS = last_element_zero(rand_array(16))
