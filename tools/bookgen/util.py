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

# Convert from python-chess board location to Wasabi chess engine location system
import numpy as np


# Convert from python-chess board position to Wasabi engine board position
def square_to_bb(sq):
    return (7 - int(sq / 8)) * 8 + (sq & 7)


# Encode piece ID, from and to board position of a move as a single 16 bit unsigned integer
def encode_move(piece_id, move_from, move_to):
    bb_from = square_to_bb(move_from)
    bb_to = square_to_bb(move_to)
    return piece_id | (bb_from << 3) | (bb_to << 10)


# Right-rotate the bits of a 32 Bit integer
def rotr32(n, rotations):
    return np.uint32(n >> rotations) | (n << (32 - rotations))


# Calculate pseudo-random numbers
class Random:

    state = np.uint64(0x4d595df4d0f33173)
    multiplier = np.uint64(6364136223846793005)
    increment = np.uint64(1442695040888963407)

    def rand32(self):
        x = self.state
        count = np.uint32(x >> np.uint64(59))
        self.state = x * self.multiplier + self.increment
        x ^= x >> np.uint64(18)

        return np.uint32(rotr32(np.uint32(x >> np.uint64(27)), count))

    def rand64(self):
        return (np.uint64(self.rand32()) << np.uint64(32)) | np.uint64(self.rand32())
