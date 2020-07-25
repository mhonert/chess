
This release focussed on tuning the evaluation function :balance_scale:
> The Web App version of **Wasabi Chess** can be played [**here**](https://mhonert.github.io/chess).

## Changes
- New tuning tool
- Tuned all evaluation parameters
- Replaced simple mobility score calculation with mobility score table
- Replaced simple king safety calculation with king threat score table
- Improved game phase calculation for tapered eval
- Added endgame piece square tables 

## Installation
- Download and unpack the archive for your platform (Linux or Windows 8/10)
- Configure your UCI client (e.g. PyChess, Arena, cutechess)
  - &hellip; on Windows &rArr; to run *wasabi.cmd*
  - &hellip; on Linux &rArr; to run *wasabi*
 
> :warning: the bundled **WAVM** runtime is not compatible with Windows 7 - a workaround is described in the [Wiki](https://github.com/mhonert/chess/wiki/Windows-7)

