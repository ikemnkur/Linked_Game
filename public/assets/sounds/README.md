# Sound Assets for Linked Game

Place the following sound files in the `public/assets/sounds/` directory:

## Required Sound Files:

1. **GameStart.mp3** - Plays when all players join and game starts (after 3-second countdown)
2. **PieceMove.wav** - Plays when a piece makes a normal orthogonal move
3. **capture.wav** - Plays when a piece attacks/pushes opponent or makes a hop
4. **select.wav** - Plays when selecting your own piece
5. **hurryup.wav** - Plays when your timer goes below 20 seconds
6. **WinGame.wav** - Plays when you win the game
7. **LoseGame.wav** - Plays when you lose the game

## Sound Volume

Default volume is set to 50% (0.5). The sound system stores the enabled/disabled state in localStorage, so players can toggle sounds on/off and it persists across sessions.

## How Sounds Are Triggered:

- **Game Start**: When game status changes from "waiting" to "playing" (3-second delay)
- **Select**: When clicking your own piece to select it
- **Move**: When any player makes a normal move (orthogonal walk)
- **Capture**: When any player makes an attack (diagonal push) or hop
- **Hurry Up**: When your remaining time drops below 20 seconds (plays once per turn)
- **Win**: When the game ends and you are the winner
- **Lose**: When the game ends and you are not the winner (excludes draws)

All sounds are preloaded when the page loads for smooth playback.
