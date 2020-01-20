# Web Chess ([Play it here!](https://mhonert.github.io/chess))

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Website mhonert.github.io./chess](https://img.shields.io/website-up-down-green-red/http/mhonert.github.io/chess)](https://mhonert.github.io/chess)


A free and open source chess game using [AssemblyScript](https://github.com/AssemblyScript/assemblyscript) 
and [React](https://reactjs.org/).

The chess engine runs completely standalone in the browser and does not require any backend.
All computer moves are calculated in the background using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
and do not block the main thread for the UI.


![Screenshot](chess_screenshot.png)


## Features
- Chess engine implemented in [AssemblyScript](https://github.com/AssemblyScript/assemblyscript)
- Computer opponent with 5 difficulty levels
- Drag'n'Drop support to move chess pieces
- Touch support for mobile devices
- Responsive design
- Undo player move

## Planned features
- Save game in local storage
- Check for threefold repetition rule
- Display move history in algebraic chess notation
- Export and import positions in [FEN](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)

## Planned engine improvements
- Optimize move generation
- Improve position evaluation
- Use opening database and endgame tables

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
Images for the chess pieces come from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces).
