/**
 * Rockfall - Main entry point
 */
import { createGameSetup, validateGameConfig } from './utils/gameConfig.js';
import { GameState } from './game/gameState.js';
import { DefensePlayer } from './player/defense.js';
import { OffensePlayer } from './player/offense.js';
import { BoardRenderer } from './ui/boardRenderer.js';
import { HUD } from './ui/hud.js';
import { Controls } from './ui/controls.js';

class RockfallGame {
  constructor() {
    this.config = null;
    this.gameState = null;
    this.defensePlayer = null;
    this.offensePlayer = null;
    this.renderer = null;
    this.hud = null;
    this.controls = null;
  }

  /**
   * Initialize the game
   * @param {Object} customConfig - Optional custom configuration
   */
  init(customConfig = {}) {
    console.log('Initializing Rockfall...');
    
    // Create game configuration
    const seed = Date.now();
    this.config = createGameSetup(customConfig, seed);
    
    // Validate configuration
    const validation = validateGameConfig(this.config);
    if (!validation.valid) {
      console.error('Invalid game configuration:', validation.errors);
      alert('Game configuration error: ' + validation.errors.join(', '));
      return;
    }
    
    console.log('Game configuration:', this.config);
    console.log('Tile bag seed:', seed);
    
    // Create game state
    this.gameState = new GameState(this.config);
    
    // Create players
    this.defensePlayer = new DefensePlayer(this.gameState);
    this.offensePlayer = new OffensePlayer(this.gameState);
    
    // Create UI components
    const canvas = document.getElementById('gameBoard');
    this.renderer = new BoardRenderer(canvas, this.gameState);
    this.hud = new HUD(this.gameState);
    
    // Create controls (handles all user input)
    this.controls = new Controls(
      this.gameState,
      this.defensePlayer,
      this.offensePlayer,
      this.renderer,
      this.hud
    );
    
    // Start the game
    this.start();
    
    console.log('Rockfall initialized successfully!');
  }

  /**
   * Start the game
   */
  start() {
    console.log('Starting game...');
    
    // Reset game state
    this.gameState.reset();
    
    // Start first defense turn
    const result = this.defensePlayer.startTurn();
    
    if (result.success) {
      // Update UI
      this.hud.updateAll();
      this.hud.updateCurrentDraw(result.tiles);
      this.renderer.render();
      
      console.log('Game started! Defense phase begins.');
      console.log('Tiles drawn:', result.tiles);
    } else {
      console.error('Failed to start game:', result.error);
      alert('Failed to start game: ' + result.error);
    }
  }

  /**
   * Restart the game with a specific seed
   * @param {number} seed 
   */
  restartWithSeed(seed) {
    this.config.tileBagSeed = seed;
    this.gameState.config.tileBagSeed = seed;
    this.start();
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, creating game...');
  
  const game = new RockfallGame();
  
  // You can customize the game config here
  const customConfig = {
    // totalPaths: 5,
    // startingGold: 10,
    // goldPerTurn: 4,
    // tileBag: {
    //   blank: 20,
    //   spikes: 15,
    //   boulder: 10
    // }
  };
  
  game.init(customConfig);
  
  // Expose game instance for debugging
  window.rockfallGame = game;
});
