/**
 * UI Controls - Handle user input and interactions
 */
import { GamePhase } from '../utils/gameConfig.js';
import { getSettings } from '../utils/settings.js';

export class Controls {
  constructor(gameState, defensePlayer, offensePlayer, renderer, hud) {
    this.gameState = gameState;
    this.defensePlayer = defensePlayer;
    this.offensePlayer = offensePlayer;
    this.renderer = renderer;
    this.hud = hud;
    this.settings = getSettings();
    
    // State
    this.selectedRow = null; // For defense tile placement
    this.selectedTileType = null; // Currently selected tile to place
    this.scoutRevealMode = false; // Whether Scout is selecting tile to reveal
    this.scoutUnit = null; // Scout unit waiting to reveal
    
    this.setupEventListeners();
  }

  /**
   * Get the next available tile from current draw that hasn't been assigned
   * @returns {string|null} Next available tile type or null
   */
  getNextAvailableTile() {
    const currentDraw = this.gameState.currentDraw;
    const assignments = this.defensePlayer.getAssignments();
    
    if (!currentDraw || currentDraw.length === 0) {
      return null;
    }
    
    // Count how many of each tile type have been assigned
    const assignedCounts = {};
    Array.from(assignments.values()).forEach(tile => {
      assignedCounts[tile] = (assignedCounts[tile] || 0) + 1;
    });
    
    // Find first tile type that still has unassigned tiles
    for (const tileType of currentDraw) {
      const totalCount = currentDraw.filter(t => t === tileType).length;
      const assignedCount = assignedCounts[tileType] || 0;
      
      if (assignedCount < totalCount) {
        return tileType;
      }
    }
    
    return null;
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Canvas interactions
    this.renderer.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
    this.renderer.canvas.addEventListener('mouseleave', this.handleCanvasMouseLeave.bind(this));
    this.renderer.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    
    // Tile bag collapse
    const tileBagHeader = document.getElementById('tileBagHeader');
    const tileBagContent = document.getElementById('tileBagList');
    if (tileBagHeader) {
      // Load saved collapse state
      const isCollapsed = this.settings.get('ui.tileBag.isCollapsed');
      if (isCollapsed) {
        tileBagContent.classList.add('hidden');
        tileBagHeader.classList.add('collapsed');
      }
      
      tileBagHeader.addEventListener('click', () => {
        tileBagContent.classList.toggle('hidden');
        tileBagHeader.classList.toggle('collapsed');
        // Save the new state
        this.settings.set('ui.tileBag.isCollapsed', tileBagContent.classList.contains('hidden'));
      });
    }
    
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
    
    // Auto place button (defense)
    document.getElementById('autoPlaceBtn').addEventListener('click', 
      this.handleAutoPlace.bind(this));
    
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
    
    // Update cursor position for rendering held tile
    this.renderer.updateCursorPosition(event.clientX - rect.left, event.clientY - rect.top);
    
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
    // Don't allow interactions if game is over
    if (this.gameState.isGameOver()) {
      return;
    }
    
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
    // If we have a tile selected, place it on the clicked row
    if (this.selectedTileType) {
      const result = this.defensePlayer.assignTileToRow(tile.y, this.selectedTileType);
      
      if (result.success) {
        console.log(`Placed ${this.selectedTileType} at row ${tile.y}`);
        
        // If we replaced a tile, pick it up
        if (result.replacedTile) {
          this.selectedTileType = result.replacedTile;
          console.log(`Picked up ${result.replacedTile} from row ${tile.y}`);
        } else {
          // Auto-select next available tile for quick placement
          this.selectedTileType = this.getNextAvailableTile();
          if (this.selectedTileType) {
            console.log(`Auto-selected next tile: ${this.selectedTileType}`);
          }
        }
        
        this.updateDefenseUI();
      } else {
        console.log('Cannot place tile here');
      }
    } else {
      // No tile selected - check if clicking on a row with a tile to pick it up
      const assignments = this.defensePlayer.getAssignments();
      const existingTile = assignments.get(tile.y);
      
      if (existingTile) {
        // Pick up the tile from this row
        this.defensePlayer.clearAssignment(tile.y);
        this.selectedTileType = existingTile;
        console.log(`Picked up ${existingTile} from row ${tile.y}`);
        this.gameState.logEvent(`Removed ${existingTile} from row ${tile.y}`, 'defense');
        this.updateDefenseUI();
      } else {
        console.log('Please select a tile from your draw first');
      }
    }
  }

  /**
   * Update defense UI elements
   */
  updateDefenseUI() {
    this.hud.updateCurrentDraw(
      this.gameState.currentDraw, 
      this.defensePlayer.getAssignments()
    );
    this.hud.updateActionLog();
    
    // Show preview tiles on the board
    this.renderer.setPreviewTiles(this.defensePlayer.getAssignments());
    
    // Update cursor tile
    if (this.selectedTileType) {
      this.renderer.setCursorTile(this.selectedTileType);
    } else {
      this.renderer.clearCursorTile();
    }
    
    this.renderer.render();
    
    // Update selected tile highlight in UI
    document.querySelectorAll('.draw-tile-item').forEach(el => {
      el.classList.remove('selected');
      if (this.selectedTileType && el.dataset.tile === this.selectedTileType) {
        el.classList.add('selected');
      }
    });
    
    // Don't auto-finalize, let user click End Turn
  }

  /**
   * Handle click during offense phase
   */
  handleOffenseClick(tile) {
    // Check if Scout is selecting tile to reveal
    if (this.scoutRevealMode) {
      this.handleScoutRevealClick(tile);
      return;
    }
    
    const selectedUnit = this.offensePlayer.getSelectedUnit();
    
    if (!selectedUnit) {
      // Check if clicking on a unit to select it
      const clickedUnit = this.gameState.getAliveUnits().find(u => 
        u.x === tile.x && u.y === tile.y
      );
      
      if (clickedUnit) {
        // Check if player has enough gold to move this unit
        const moveCost = clickedUnit.getMoveCost(this.gameState.config);
        if (this.gameState.gold < moveCost) {
          console.log(`Cannot select unit - need ${moveCost} gold but only have ${this.gameState.gold}`);
          this.gameState.logEvent(`Not enough gold to move ${clickedUnit.type} (need ${moveCost}, have ${this.gameState.gold})`, 'error');
          this.hud.updateActionLog();
          return;
        }
        
        this.offensePlayer.selectUnit(clickedUnit.type);
        const validMoves = this.offensePlayer.getValidMoves();
        this.renderer.setHighlightedTiles(validMoves);
        this.renderer.render();
        console.log(`Selected unit: ${clickedUnit.type}`);
      }
    } else {
      // Try to move selected unit to clicked tile
      const unit = this.offensePlayer.getSelectedUnit();
      
      if (!unit) {
        console.error('No unit selected');
        return;
      }
      
      const targetTile = this.gameState.board.getTile(tile.x, tile.y);
      
      // Check if tile is not yet revealed and should be revealed (not a Jump move)
      const dx = tile.x - unit.x;
      const dy = tile.y - unit.y;
      const shouldAnimateReveal = targetTile && !targetTile.revealed && !unit.isJumpMove(dx, dy);
      
      if (shouldAnimateReveal) {
        // Animate tile reveal first
        this.renderer.animateTileReveal(tile.x, tile.y, () => {
          // Add delay after flip before moving unit
          setTimeout(() => {
            // Capture position BEFORE the move updates it
            const fromX = unit.x;
            const fromY = unit.y;
            const toX = tile.x;
            const toY = tile.y;
            
            // Special handling for sprinter's Move 2 ability
            if (unit.type === 'sprinter') {
              this.handleSprinterMove(unit, fromX, fromY, toX, toY);
            } else {
              // Perform the move (this updates unit.x and unit.y)
              const result = this.offensePlayer.moveSelectedUnit(toX, toY);
              
              if (result.success) {
                // Animate unit movement from old position to new position
                this.renderer.animateUnitMove(unit, fromX, fromY, toX, toY, () => {
                  // After movement animation, handle bomb effects if any
                  this.handleMoveResult(result);
                });
              } else {
                this.handleMoveFailure(result);
              }
            }
          }, 300); // 300ms delay after flip
        });
      } else {
        // No reveal animation needed, but still animate unit movement
        const fromX = unit.x;
        const fromY = unit.y;
        const toX = tile.x;
        const toY = tile.y;
        
        // Special handling for sprinter's Move 2 ability
        if (unit.type === 'sprinter') {
          this.handleSprinterMove(unit, fromX, fromY, toX, toY);
        } else {
          const result = this.offensePlayer.moveSelectedUnit(toX, toY);
          
          if (result.success) {
            this.renderer.animateUnitMove(unit, fromX, fromY, toX, toY, () => {
              this.handleMoveResult(result);
            });
          } else {
            this.handleMoveFailure(result);
          }
        }
      }
    }
  }
  
  /**
   * Handle sprinter's two-step movement with animation
   * @param {Unit} unit 
   * @param {number} fromX 
   * @param {number} fromY 
   * @param {number} toX 
   * @param {number} toY 
   */
  handleSprinterMove(unit, fromX, fromY, toX, toY) {
    // Calculate direction
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dirX = Math.sign(dx);
    const dirY = Math.sign(dy);
    
    // Calculate intermediate position (first move)
    const midX = fromX + dirX;
    const midY = fromY + dirY;
    
    // Perform the sprinter move (does both steps internally)
    const result = this.offensePlayer.moveSelectedUnit(toX, toY);
    
    if (result.success) {
      // Animate first step
      this.renderer.animateUnitMove(unit, fromX, fromY, midX, midY, () => {
        // Then animate second step
        this.renderer.animateUnitMove(unit, midX, midY, toX, toY, () => {
          this.handleMoveResult(result);
        });
      });
    } else {
      this.handleMoveFailure(result);
    }
  }

  /**
   * Handle successful move result
   * @param {Object} result 
   */
  handleMoveResult(result) {
    this.renderer.clearHighlightedTiles();
    
    // Check if Scout needs to reveal adjacent tile
    if (result.unitType) {
      const unit = this.gameState.units[result.unitType];
      if (unit && unit.hasRevealAbility() && unit.alive) {
        // Prompt player to select adjacent tile to reveal
        this.promptScoutReveal(unit);
        return;
      }
    }
    
    // Check if bomb animation is needed
    if (result.effects?.bombAnimData) {
      const { explosionCenter, affectedPositions, positionMap } = result.effects.bombAnimData;
      
      // Trigger explosion animation
      this.renderer.animateExplosion(explosionCenter.x, explosionCenter.y, affectedPositions, () => {
        // After explosion, trigger tile slide animation
        this.renderer.animateTileSlide(positionMap, () => {
          // After both animations, update UI
          this.renderer.render();
          this.hud.updateAll();
        });
      });
    } else {
      // No bomb, just render normally
      this.renderer.render();
      this.hud.updateAll();
    }
    
    if (result.effects && result.effects.win) {
      // Render again to show revealed tiles
      this.renderer.render();
      this.hud.showGameOver('offense');
    }
  }

  /**
   * Handle failed move
   * @param {Object} result 
   */
  handleMoveFailure(result) {
    console.error('Move failed:', result.error);
    
    // Update UI even on failure (gold may have been spent for wall)
    if (result.goldLost) {
      this.renderer.render();
      this.hud.updateAll();
    }
  }

  /**
   * Handle draw tile click (defense phase)
   */
  handleDrawTileClick(event) {
    if (this.gameState.isGameOver()) return;
    if (this.gameState.phase !== GamePhase.DEFENSE) return;
    
    const tileElement = event.target.closest('.draw-tile-item');
    if (!tileElement || tileElement.classList.contains('placed')) return;
    
    const tileType = tileElement.dataset.tile;
    
    // Select this tile
    this.selectedTileType = tileType;
    console.log(`Selected ${tileType} - now click a row on the board to place it`);
    
    // Update UI
    this.renderer.setCursorTile(tileType);
    document.querySelectorAll('.draw-tile-item').forEach(el => {
      el.classList.remove('selected');
    });
    tileElement.classList.add('selected');
    this.renderer.render();
  }

  /**
   * Handle unit action click (offense phase)
   */
  handleUnitActionClick(event) {
    if (this.gameState.isGameOver()) return;
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
    if (this.gameState.isGameOver()) return;
    if (this.gameState.phase !== GamePhase.DEFENSE) return;
    
    // Check if tiles have been placed
    if (!this.defensePlayer.isPlacementComplete()) {
      alert('Please place all tiles before ending your turn!');
      return;
    }
    
    // Finalize the placement
    const result = this.defensePlayer.placeTiles();
    if (!result.success) {
      alert('Failed to place tiles: ' + result.error);
      return;
    }
    
    this.selectedTileType = null;
    this.defensePlayer.endTurn();
    this.renderer.clearPreviewTiles();
    this.renderer.clearCursorTile();
    this.hud.clearCurrentDraw();
    
    // Check if still in defense phase (second turn) or moved to offense
    if (this.gameState.phase === GamePhase.DEFENSE) {
      // Start second defense turn
      const drawResult = this.defensePlayer.startTurn();
      if (drawResult.success) {
        this.hud.updateAll();
        this.hud.updateCurrentDraw(drawResult.tiles, this.defensePlayer.getAssignments());
        this.renderer.render();
      }
    } else {
      // Moved to offense phase
      this.hud.updateAll();
      this.renderer.render();
    }
  }

  /**
   * Handle end offense turn
   */
  handleEndOffenseTurn() {
    if (this.gameState.isGameOver()) return;
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
      // Defense ran out of tiles - game over
      this.hud.updateAll();
      this.renderer.render();
      this.hud.showGameOver('defense');
    }
  }

  /**
   * Handle auto place button
   */
  handleAutoPlace() {
    if (this.gameState.isGameOver()) return;
    if (this.gameState.phase !== GamePhase.DEFENSE) return;
    
    const result = this.defensePlayer.autoPlace();
    if (result.success) {
      this.selectedTileType = null;
      this.updateDefenseUI();
      console.log('Tiles placed randomly - click End Turn to finalize');
    } else {
      console.error('Auto-placement failed:', result.error);
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

  /**
   * Prompt Scout to select adjacent tile to reveal
   * @param {Unit} unit - Scout unit
   */
  promptScoutReveal(unit) {
    this.scoutRevealMode = true;
    this.scoutUnit = unit;
    
    // Get adjacent tiles
    const adjacentTiles = [
      { x: unit.x + 1, y: unit.y },
      { x: unit.x - 1, y: unit.y },
      { x: unit.x, y: unit.y + 1 },
      { x: unit.x, y: unit.y - 1 }
    ].filter(pos => this.gameState.board.isValidPosition(pos.x, pos.y));
    
    // Highlight adjacent tiles
    this.renderer.setHighlightedTiles(adjacentTiles);
    this.renderer.render();
    
    // Show message
    this.gameState.logEvent('Scout: Select an adjacent tile to reveal (Reveal 1)', 'event');
    this.hud.updateActionLog();
  }

  /**
   * Handle Scout reveal tile selection
   * @param {Object} tile - Selected tile coordinates
   */
  handleScoutRevealClick(tile) {
    // Check if tile is adjacent to Scout
    const dx = Math.abs(tile.x - this.scoutUnit.x);
    const dy = Math.abs(tile.y - this.scoutUnit.y);
    const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    
    if (!isAdjacent) {
      this.gameState.logEvent('Please select an adjacent tile', 'error');
      this.hud.updateActionLog();
      return;
    }
    
    // Reveal the tile
    const result = this.gameState.revealAdjacentTile(this.scoutUnit.type, tile.x, tile.y);
    
    if (result.success) {
      this.gameState.logEvent(`Scout revealed tile at (${tile.x}, ${tile.y})`, 'event');
      this.hud.updateActionLog();
      
      // Animate the reveal
      this.renderer.animateTileReveal(tile.x, tile.y, () => {
        // Clear Scout reveal mode
        this.scoutRevealMode = false;
        this.scoutUnit = null;
        this.renderer.clearHighlightedTiles();
        this.renderer.render();
        this.hud.updateAll();
      });
    } else {
      this.gameState.logEvent(result.error || 'Cannot reveal this tile', 'error');
      this.hud.updateActionLog();
    }
  }
}

