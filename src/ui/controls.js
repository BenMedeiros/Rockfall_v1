/**
 * UI Controls - Handle user input and interactions
 */
import { GamePhase } from '../utils/gameConfig.js';

export class Controls {
  constructor(gameState, defensePlayer, offensePlayer, renderer, hud) {
    this.gameState = gameState;
    this.defensePlayer = defensePlayer;
    this.offensePlayer = offensePlayer;
    this.renderer = renderer;
    this.hud = hud;
    
    // State
    this.selectedRow = null; // For defense tile placement
    
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Canvas interactions
    this.renderer.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
    this.renderer.canvas.addEventListener('mouseleave', this.handleCanvasMouseLeave.bind(this));
    this.renderer.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    
    // Defense turn button
    document.getElementById('endDefenseTurnBtn').addEventListener('click', 
      this.handleEndDefenseTurn.bind(this));
    
    // Offense turn button
    document.getElementById('endOffenseTurnBtn').addEventListener('click', 
      this.handleEndOffenseTurn.bind(this));
    
    // New game button
    document.getElementById('newGameBtn').addEventListener('click', 
      this.handleNewGame.bind(this));
    
    // Replay seed button
    document.getElementById('replaySeedBtn').addEventListener('click', 
      this.handleReplaySeed.bind(this));
    
    // Current draw tiles (defense)
    document.getElementById('currentDrawTiles').addEventListener('click', 
      this.handleDrawTileClick.bind(this));
    
    // Units roster (offense)
    document.getElementById('unitsRosterList').addEventListener('click', 
      this.handleUnitActionClick.bind(this));
  }

  /**
   * Handle canvas mouse move
   */
  handleCanvasMouseMove(event) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const tile = this.renderer.getTileFromPixel(x, y);
    
    if (tile) {
      this.renderer.setHoveredTile(tile.x, tile.y);
    } else {
      this.renderer.clearHoveredTile();
    }
    
    this.renderer.render();
  }

  /**
   * Handle canvas mouse leave
   */
  handleCanvasMouseLeave() {
    this.renderer.clearHoveredTile();
    this.renderer.render();
  }

  /**
   * Handle canvas click
   */
  handleCanvasClick(event) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const tile = this.renderer.getTileFromPixel(x, y);
    
    if (!tile) return;
    
    if (this.gameState.phase === GamePhase.DEFENSE) {
      this.handleDefenseClick(tile);
    } else {
      this.handleOffenseClick(tile);
    }
  }

  /**
   * Handle click during defense phase
   */
  handleDefenseClick(tile) {
    // Select row for tile placement
    this.selectedRow = tile.y;
    console.log(`Selected row ${tile.y} for tile placement`);
  }

  /**
   * Handle click during offense phase
   */
  handleOffenseClick(tile) {
    const selectedUnit = this.offensePlayer.getSelectedUnit();
    
    if (!selectedUnit) {
      // Check if clicking on a unit to select it
      const clickedUnit = this.gameState.getAliveUnits().find(u => 
        u.x === tile.x && u.y === tile.y
      );
      
      if (clickedUnit) {
        this.offensePlayer.selectUnit(clickedUnit.type);
        const validMoves = this.offensePlayer.getValidMoves();
        this.renderer.setHighlightedTiles(validMoves);
        this.renderer.render();
        console.log(`Selected unit: ${clickedUnit.type}`);
      }
    } else {
      // Try to move selected unit to clicked tile
      const result = this.offensePlayer.moveSelectedUnit(tile.x, tile.y);
      
      if (result.success) {
        this.renderer.clearHighlightedTiles();
        this.renderer.render();
        this.hud.updateAll();
        
        if (result.effects && result.effects.win) {
          this.hud.showGameOver('offense');
        }
      } else {
        console.error('Move failed:', result.error);
      }
    }
  }

  /**
   * Handle draw tile click (defense phase)
   */
  handleDrawTileClick(event) {
    if (this.gameState.phase !== GamePhase.DEFENSE) return;
    
    const tileElement = event.target.closest('.draw-tile-item');
    if (!tileElement) return;
    
    const tileType = tileElement.dataset.tile;
    
    if (this.selectedRow === null) {
      console.log('Please click on a row in the board to place this tile');
      return;
    }
    
    // Assign tile to selected row
    const success = this.defensePlayer.assignTileToRow(this.selectedRow, tileType);
    
    if (success) {
      console.log(`Assigned ${tileType} to row ${this.selectedRow}`);
      this.hud.updateCurrentDraw(
        this.gameState.currentDraw, 
        this.defensePlayer.getAssignments()
      );
      this.selectedRow = null;
      
      // Check if placement is complete
      if (this.defensePlayer.isPlacementComplete()) {
        // Auto-place tiles
        const result = this.defensePlayer.placeTiles();
        if (result.success) {
          this.renderer.render();
          this.hud.updateAll();
        }
      }
    }
  }

  /**
   * Handle unit action click (offense phase)
   */
  handleUnitActionClick(event) {
    if (this.gameState.phase !== GamePhase.OFFENSE) return;
    
    const button = event.target;
    if (!button.classList.contains('btn-spawn') && !button.classList.contains('btn-move')) {
      return;
    }
    
    const unitType = button.dataset.unitType;
    
    if (button.classList.contains('btn-spawn')) {
      const result = this.offensePlayer.spawnUnit(unitType);
      if (result.success) {
        this.renderer.render();
        this.hud.updateAll();
      } else {
        console.error('Spawn failed:', result.error);
      }
    } else if (button.classList.contains('btn-move')) {
      // Select unit for movement
      this.offensePlayer.selectUnit(unitType);
      const validMoves = this.offensePlayer.getValidMoves();
      this.renderer.setHighlightedTiles(validMoves);
      this.renderer.render();
    }
  }

  /**
   * Handle end defense turn
   */
  handleEndDefenseTurn() {
    if (this.gameState.phase !== GamePhase.DEFENSE) return;
    
    // Check if tiles have been placed
    if (!this.defensePlayer.isPlacementComplete()) {
      // Auto-complete placement
      const result = this.defensePlayer.autoPlace();
      if (!result.success) {
        console.error('Auto-placement failed:', result.error);
        return;
      }
    }
    
    this.defensePlayer.endTurn();
    this.hud.updateAll();
    this.hud.clearCurrentDraw();
    this.renderer.render();
  }

  /**
   * Handle end offense turn
   */
  handleEndOffenseTurn() {
    if (this.gameState.phase !== GamePhase.OFFENSE) return;
    
    this.offensePlayer.endTurn();
    this.renderer.clearHighlightedTiles();
    
    // Start next defense turn
    const result = this.defensePlayer.startTurn();
    if (result.success) {
      this.hud.updateAll();
      this.hud.updateCurrentDraw(result.tiles);
      this.renderer.render();
    } else {
      // Defense ran out of tiles
      this.hud.showGameOver('defense');
    }
  }

  /**
   * Handle new game
   */
  handleNewGame() {
    if (confirm('Start a new game?')) {
      this.gameState.reset();
      
      // Start first turn
      const result = this.defensePlayer.startTurn();
      if (result.success) {
        this.hud.updateAll();
        this.hud.updateCurrentDraw(result.tiles);
        this.renderer.render();
      }
    }
  }

  /**
   * Handle replay with seed
   */
  handleReplaySeed() {
    const seedInput = document.getElementById('seedInput');
    seedInput.classList.toggle('hidden');
    
    if (!seedInput.classList.contains('hidden')) {
      seedInput.focus();
      seedInput.value = this.gameState.config.tileBagSeed;
      
      seedInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const seed = parseInt(seedInput.value);
          if (!isNaN(seed)) {
            // Restart game with this seed
            this.gameState.config.tileBagSeed = seed;
            this.gameState.reset();
            
            const result = this.defensePlayer.startTurn();
            if (result.success) {
              this.hud.updateAll();
              this.hud.updateCurrentDraw(result.tiles);
              this.renderer.render();
            }
            
            seedInput.classList.add('hidden');
          }
        }
      });
    }
  }
}
