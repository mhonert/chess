# Chess App ([Play it here!](https://mhonert.github.io/chess))

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Website mhonert.github.io./chess](https://img.shields.io/website-up-down-green-red/http/mhonert.github.io/chess)](https://mhonert.github.io/chess)


A Chess App written in React with an intuitive Drag'n'Drop user interface and mobile support.


![Screenshot](chess_screenshot.png)


## Features
- [X] Computer opponent with 3 difficulty levels
- [X] Drag'n'Drop support to move chess pieces
- [X] Touch support for mobile devices
- [X] Responsive design

## Planned features
- [ ] Save the game (e.g. in local storage)
- [ ] Check for threefold repetition rule
- [ ] Undoing moves

## Planned engine improvements
- [ ] More efficient board representation and move generation algorithms
- [ ] Implement chess engine in [AssemblyScript](https://docs.assemblyscript.org/)
- [ ] Improve position evaluation
- [ ] Use opening database and endgame tables
- [ ] Mitigate the horizon effect

## Built With
* [React](https://reactjs.org/) - for the user interface
* [React DnD](https://github.com/react-dnd/react-dnd) - for Drag and Drop support
* [styled-components](https://www.styled-components.com/) - to style React components in JS
* [workerize-loader](https://github.com/developit/workerize-loader) - to move a module into a Web Worker
* [Memoizee](https://github.com/medikoo/memoizee) - to cache intermediate results during move calculation

## License
This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) for details.

## Attributions
Images for the chess pieces come from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces).
