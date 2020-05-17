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

import chess.pgn
import zobrist
import numpy as np
import statistics

from util import encode_move
from pathlib import Path

# Generates an opening book from chess games stored in PGN format.
# Each game in the PGN files must contain the following header information
# - Result (e.g. "1-0" if the white player won)
# - WhiteElo
# - BlackElo
#
# The generator will only take games from players with at least 2000 ELO into account.
# The generation result is an AssemblyScript source file.

PLY_BOOK_LIMIT = 16
ply_moves = [{} for _ in range(PLY_BOOK_LIMIT + 1)]

move_occurences = [{} for _ in range(PLY_BOOK_LIMIT + 1)]

max_ply = 0

print("Parsing chess games from pgn file ...")
game_num = 0

books = [
    "pgn/fics2400.pgn",
    "pgn/fics2600.pgn",
    "pgn/fics2600ur.pgn",
    "pgn/fics2400ur.pgn"
]

move_thresholds = [2 for i in range(PLY_BOOK_LIMIT + 1)]
move_thresholds[0] = 10
move_thresholds[1] = 10

# First pass: count occurrences of moves to filter out unusual or rarely played openings
for book in books:
    pgn = open(book)
    print("Analyzing games from ", book)
    while True:
        game = chess.pgn.read_game(pgn)
        if not game:
            break

        result = game.headers['Result']
        whiteElo = int(game.headers['WhiteElo'])
        blackElo = int(game.headers['BlackElo'])
        skipWhite = result == '0-1'
        skipBlack = result == '1-0'

        if whiteElo < 2000 or blackElo < 2000 or abs(whiteElo - blackElo) > 50:
            continue

        game_num += 1
        print("- analyzing game #", game_num)
        board = game.board()
        ply = 0
        for move in game.mainline_moves():
            zobrist_hash = zobrist.calc_hash(board)
            moveFrom = move.from_square
            moveTo = move.to_square
            encoded_move = encode_move(board.piece_at(moveFrom).piece_type, moveFrom, moveTo)

            isWhiteTurn = board.turn == chess.WHITE
            isBlackTurn = not isWhiteTurn

            board.push(move)

            if (isWhiteTurn and not skipWhite) or (isBlackTurn and not skipBlack):
                # Only include moves that were played in multiple games
                if encoded_move in move_occurences[ply]:
                    move_occurences[ply][encoded_move] += 1

                    if move_occurences[ply][encoded_move] >= move_thresholds[ply]:
                        if ply > max_ply:
                            max_ply = ply

                else:
                    move_occurences[ply][encoded_move] = 1

            ply += 1

            if ply > PLY_BOOK_LIMIT:
                break
    pgn.close()

# Second pass: extract opening lines
for book in books:
    pgn = open(book)
    print("Reading games from ", book)
    while True:
        game = chess.pgn.read_game(pgn)
        if not game:
            break

        result = game.headers['Result']
        whiteElo = int(game.headers['WhiteElo'])
        blackElo = int(game.headers['BlackElo'])
        skipWhite = result == '0-1'
        skipBlack = result == '1-0'

        if whiteElo < 2000 or blackElo < 2000 or abs(whiteElo - blackElo) > 50:
            continue

        game_num += 1
        print("- extracting moves from game #", game_num)
        board = game.board()
        ply = 0
        for move in game.mainline_moves():
            zobrist_hash = zobrist.calc_hash(board)
            moveFrom = move.from_square
            moveTo = move.to_square
            encoded_move = encode_move(board.piece_at(moveFrom).piece_type, moveFrom, moveTo)

            isWhiteTurn = board.turn == chess.WHITE
            isBlackTurn = not isWhiteTurn

            board.push(move)

            if (isWhiteTurn and not skipWhite) or (isBlackTurn and not skipBlack):
                # Only include moves that were played in multiple games
                if encoded_move in move_occurences[ply] and move_occurences[ply][encoded_move] >= move_thresholds[ply]:
                    if ply > max_ply:
                        max_ply = ply

                    if zobrist_hash in ply_moves[ply]:
                        ply_moves[ply][zobrist_hash].add(encoded_move)
                    else:
                        ply_moves[ply][zobrist_hash] = {encoded_move}

                else:
                    break

            ply += 1

            if ply > PLY_BOOK_LIMIT:
                break
    pgn.close()

print("Preparing opening book list...")

book = [0 for _ in range(max_ply + 1)]
book[0] = max_ply

for idx in range(max_ply):
    if len(ply_moves[idx]) == 0:
        break
    book[idx + 1] = len(book)         # Start index for the move list of the current ply
    book.append(len(ply_moves[idx]))  # Number of entries (positions)
    for zobrist_hash, moves in ply_moves[idx].items():
        # Split 64 bit hash into 2 32-bit entries
        for i in range(2):
            book.append(zobrist_hash & np.uint64(0xFFFFFFFF))
            zobrist_hash = np.uint64(zobrist_hash >> np.uint64(32))

        book.append(len(moves))
        book.extend(moves)

print("Writing opening book list...")

out = open("../../assembly/opening-book-data.ts", "w")
out.write("/*\n")
out.write(" * A free and open source chess game using AssemblyScript and React\n")
out.write(" * Copyright (C) 2020 mhonert (https://github.com/mhonert)\n")
out.write(" *\n")
out.write(" * This program is free software: you can redistribute it and/or modify\n")
out.write(" * it under the terms of the GNU General Public License as published by\n")
out.write(" * the Free Software Foundation, either version 3 of the License, or\n")
out.write(" * (at your option) any later version.\n")
out.write(" *\n")
out.write(" * This program is distributed in the hope that it will be useful,\n")
out.write(" * but WITHOUT ANY WARRANTY; without even the implied warranty of\n")
out.write(" * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n")
out.write(" * GNU General Public License for more details.\n")
out.write(" *\n")
out.write(" * You should have received a copy of the GNU General Public License\n")
out.write(" * along with this program.  If not, see <https://www.gnu.org/licenses/>.\n*/\n\n")

out.write("/* _________________________________________________________________________\n\n")
out.write(" * Auto-generated opening book data file\n")
out.write(" *  Format:\n")
out.write(" *  Index\n")
out.write(" *  0: Number of plies in this book (BOOK_PLIES)\n")
out.write(" *  1 - BOOK_PLIES: Start index for the moves for this ply\n\n")
out.write(" *  For each ply:\n")
out.write(" *   - Number of entries for this ply\n")
out.write(" *     For each entry:\n")
out.write(" *      - Zobrist hash\n")
out.write(" *      - Number of moves for this position\n")
out.write(" *        For each move:\n")
out.write(" *         - Encoded move\n*/\n\n")


out.write("@inline\n")
out.write("export function getOpeningBookU32(index: u32): u32 {\n")
out.write("  return load<u32>(openingBookData + index * 4);\n")
out.write("}\n\n")

out.write("@inline\n")
out.write("export function getOpeningBookI32(index: u32): i32 {\n")
out.write("  return load<i32>(openingBookData + index * 4);\n")
out.write("}\n\n")

out.write("const openingBookData = memory.data<u32>([ ")

charsWritten = 0
for idx, entry in enumerate(book):
    if idx > 0:
        charsWritten += 2
        out.write(", ")

    if idx == 1:
        out.write("\n  ")

    if idx > max_ply and (charsWritten >= 100 or entry > 65535 and charsWritten >= 88):
        charsWritten = 0
        out.write("\n  ")

    text_entry = hex(entry) if entry > 65535 else str(entry)

    out.write(text_entry)
    charsWritten += len(text_entry)

out.write("\n]);\n")
out.close()
print("Success!")

for ply in range(max_ply):
    occurences = move_occurences[ply]
    if len(occurences) > 0:
        values = move_occurences[ply].values()
        print(ply,  max(values), int(statistics.median(values)), int(statistics.mean(values)))

print(move_thresholds)

print("Memory usage for book data: ", (len(book) * 4) / 1024, "KB")
