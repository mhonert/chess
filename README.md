# :sushi: Wasabi Chess Engine ([Play here!](https://mhonert.github.io/chess))

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Website mhonert.github.io./chess](https://img.shields.io/website?url=https%3A%2F%2Fmhonert.github.io%2Fchess)](https://mhonert.github.io/chess)

Wasabi - WebAssembly Chess Engine written in [AssemblyScript](https://github.com/AssemblyScript/assemblyscript).

It runs as a standalone UCI chess engine or as a [React](https://reactjs.org/) app in the browser.
The web app embeds the engine using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
to run all calculations in the background without blocking the main thread for the UI.

![Screenshot](chess_screenshot.png)


## Features
- Chess engine implemented in [AssemblyScript](https://github.com/AssemblyScript/assemblyscript)
- Basic UCI protocol support (standalone engine)
- Computer opponent with 6 difficulty levels
- Opening Database for varied gameplay
- Move history to undo player moves
- Drag'n'Drop support to move chess pieces
- Touch support for mobile devices
- Responsive design

## Planned features
- Export and import positions in [FEN](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)

## Planned engine improvements
- Improve position evaluation (pawn structure, king safety, etc.)

## Built With
* [AssemblyScript](https://github.com/AssemblyScript/assemblyscript) - for the engine
* [as-pect](https://github.com/jtenner/as-pect) - to test the engine
* [react](https://reactjs.org/) - for the user interface
* [react-dnd](https://github.com/react-dnd/react-dnd) - for Drag and Drop support
* [styled-components](https://www.styled-components.com/) - to style React components in JS
* [react-fontawesome](https://github.com/FortAwesome/react-fontawesome) - to add font icons
* [workerize-loader](https://github.com/developit/workerize-loader) - to load modules as Web Workers

## License
This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) for details.

## Attributions
* Images for the chess pieces come from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
* The opening book was generated from a selection of chess games from the [FICS Games Database](https://www.ficsgames.org)
