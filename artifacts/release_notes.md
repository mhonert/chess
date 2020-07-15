
This release contains many small improvements, but the largest ELO gain came from the new mobility evaluation :cartwheeling:
> The Web App version of **Wasabi Chess** can be played [**here**](https://mhonert.github.io/chess).

## Changes
- Add mobility evaluation
- UCI: output mate distance as score when a mate was found
- Evaluation: provide bonus for pawns covering pawns and knights
- Adjust piece and move ordering values
- Slightly increase LMR threshold
- Simplify and tune futility margin calculation
- Directly jump to quiescence search for futile positions at depth 1

## Installation
- Download and unpack the archive for your platform (Linux or Windows 8/10)
- Configure your UCI client (e.g. PyChess, Arena, cutechess)
  - &hellip; on Windows &rArr; to run *wasabi.cmd*
  - &hellip; on Linux &rArr; to run *wasabi*
 
> :warning: the bundled **WAVM** runtime is not compatible with Windows 7 - a workaround is described in the [Wiki](https://github.com/mhonert/chess/wiki/Windows-7)

