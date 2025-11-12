# Rockfall

A turn-based asymmetric strategy board game where two players compete as Defense and Offense.

## Game Overview

**Rockfall** is a memory-based strategy game where:
- **Defense** places tiles to create challenging paths
- **Offense** navigates units through the paths to reach the defense endzone
- Tiles flip face-down after each turn, creating a memory challenge
- Gold economy determines how many actions offense can take

## Game Mechanics

### Objective
- **Offense wins**: Any unit reaches the defense endzone
- **Defense wins**: Runs out of tiles while trying to place a new column

### Turn Structure
1. **Defense Phase**: Draw tiles and place them as a new column
2. **Offense Phase**: Spawn units and move them through the paths
3. Repeat until win condition is met

### Tile Types
- **Blank**: Safe space, no effect
- **Spikes**: Kills unit when stepped on
- **Boulder**: Blocks movement

### Units
- **Basic** (Cost: 2 gold spawn, 1 gold move)
  - Moves to adjacent tile (not diagonal)
  
- **Sprinter** (Cost: 3 gold spawn, 1 gold move)
  - Moves 2 tiles in sequence
  - First tile must resolve before second move

### Gold Economy
- Starting gold: 10
- Income per turn: +4 gold
- Use gold to spawn and move units

### Memory Mechanic
- Tiles start face-down
- Revealed when stepped on
- Flip back face-down at end of turn
- Tiles with units stay revealed

## How to Play

### Defense Turn
1. Tiles are automatically drawn
2. Click a row on the board
3. Click a tile from your draw to assign it to that row
4. Repeat until all rows have tiles
5. Tiles are placed automatically when complete
6. Click "End Turn"

### Offense Turn
1. Gain +4 gold
2. Click "Spawn" buttons to summon units (if spawn area is clear)
3. Click "Move" or click a unit on the board to select it
4. Click a highlighted tile to move there
5. Click "End Turn" when done

## Game Configuration

Edit `src/main.js` to customize:
```javascript
const customConfig = {
  totalPaths: 5,        // Number of rows
  startingGold: 10,     // Initial gold
  goldPerTurn: 4,       // Gold income per turn
  tileBag: {
    blank: 20,          // Number of blank tiles
    spikes: 15,         // Number of spike tiles
    boulder: 10         // Number of boulder tiles
  }
};
```

## Replay System

The game uses seeded random number generation for tile draws. This means:
- Every game has a unique seed (displayed in console)
- Use "Replay with Seed" button to replay exact same tile sequence
- Perfect for analyzing strategies or sharing interesting games

## Development

Built with vanilla JavaScript and HTML5 Canvas.

### Project Structure
```
Rockfall_v1/
├── index.html              # Main HTML file
├── src/
│   ├── main.js            # Game initialization
│   ├── game/              # Core game logic
│   │   ├── board.js       # Board management
│   │   ├── gameState.js   # Game state and flow
│   │   ├── tileBag.js     # Seeded tile drawing
│   │   ├── tiles.js       # Tile definitions
│   │   └── units.js       # Unit definitions
│   ├── player/            # Player actions
│   │   ├── defense.js     # Defense logic
│   │   └── offense.js     # Offense logic
│   ├── ui/                # User interface
│   │   ├── boardRenderer.js  # Canvas rendering
│   │   ├── controls.js       # Input handling
│   │   └── hud.js            # UI updates
│   └── utils/             # Utilities
│       ├── gameConfig.js  # Configuration
│       └── seededRandom.js # RNG
├── styles/
│   └── main.css           # Styles
└── README.md
```

### Running the Game

Simply open `index.html` in a modern web browser. No build step required!

For development with live reload, use a local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server
```

Then open `http://localhost:8000`

## Future Enhancements

Potential additions:
- More tile types (traps, teleporters, one-way paths)
- More unit types with unique abilities
- AI opponent
- Save/load game state
- Multiplayer over network
- Animation improvements
- Sound effects and music
- Tournament mode with multiple rounds

## Credits

Created as a strategic board game experiment combining memory, resource management, and asymmetric gameplay.
