## :sushi: Wasabi Chess Engine

![Release](https://img.shields.io/github/v/release/mhonert/chess)
![Test](https://img.shields.io/github/workflow/status/mhonert/chess/Test?label=Test&logo=github)
[![Website mhonert.github.io./chess](https://img.shields.io/website?url=https%3A%2F%2Fmhonert.github.io%2Fchess)](https://mhonert.github.io/chess)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

[<img src="screenshots/chess_mobile.png" align="right" alt="Screenshot" width="25%">](screenshots/chess_mobile.png?raw=true)

**Wasabi Chess** runs as a Web App in the browser and is also available as a standalone UCI chess engine.

> [**Play here!**](https://mhonert.github.io/chess)

The Web App embeds the engine using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
to compute the AI moves in the background without blocking the main thread for the UI.

### Features

- Chess engine implemented in [AssemblyScript](https://github.com/AssemblyScript/assemblyscript)
- Computer opponent with 6 difficulty levels
- Opening Database for varied gameplay
- Move history to undo player moves
- Drag'n'Drop support to move chess pieces
- Touch support for mobile devices

### Built With
* [AssemblyScript](https://github.com/AssemblyScript/assemblyscript) - for the chess engine
* [as-pect](https://github.com/jtenner/as-pect) - to test the engine
* [react](https://reactjs.org/) - for the user interface
* [react-dnd](https://github.com/react-dnd/react-dnd) - for Drag and Drop support
* [styled-components](https://www.styled-components.com/) - to style React components in JS
* [react-fontawesome](https://github.com/FortAwesome/react-fontawesome) - for some font icons
* [workerize-loader](https://github.com/developit/workerize-loader) - to load modules as Web Workers
* [as-wasi](https://github.com/jedisct1/as-wasi) - for WASI system calls (only for the standalone UCI engine)

### License
This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) for details.

### Attributions
* Images for the chess pieces come from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
* The opening book was generated from a selection of chess games from the [FICS Games Database](https://www.ficsgames.org)
* A set of 725000 [test positions](https://bitbucket.org/zurichess/tuner/downloads/) collected by the author of Zurichess was used to tune all evaluation parameters 
