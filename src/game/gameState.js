/**
 * Core game state management
 */
import { Board } from './board.js';
import { TileBag } from './tileBag.js';
import { createAllUnits } from './units.js';
import { GamePhase } from '../utils/gameConfig.js';

export class GameState {
  constructor(config) {
    this.config = config;
    this.board = new Board(config.totalPaths);
    this.tileBag = new TileBag(config.tileBag, config.tileBagSeed);
    this.units = createAllUnits();
    
    // Game state
    this.turn = 1;
    this.phase = GamePhase.DEFENSE;
    this.defenseTurnCount = 0; // Track consecutive defense turns (0 or 1, resets after 2)
    this.firstCycle = true; // Defense gets 2 turns only on first cycle
    this.gold = config.startingGold;
    this.currentDraw = []; // Tiles drawn by defense this turn
    this.gameOver = false;
    this.winner = null; // 'offense' or 'defense'
    
    // Event log
    this.events = [];
  }

  /**
   * Start defense phase - draw tiles
   * @returns {Object} { success: boolean, tiles: Array, error: string }
   */
  startDefensePhase() {
    if (this.phase !== GamePhase.DEFENSE) {
      return { success: false, error: 'Not in defense phase' };
    }

    // Check if defense can draw tiles
    if (!this.tileBag.canDraw(this.config.totalPaths)) {
      // Defense wins - ran out of tiles
      this.gameOver = true;
      this.winner = 'defense';
      this.revealAllTiles();
      this.logEvent('Defense wins! No more tiles to draw.', 'defense');
      return { success: false, error: 'No more tiles available - Defense wins!' };
    }

    // Draw tiles
    this.currentDraw = this.tileBag.drawTiles(this.config.totalPaths);
    this.logEvent(`Defense drew ${this.currentDraw.length} tiles`, 'defense');
    
    return { 
      success: true, 
      tiles: [...this.currentDraw]
    };
  }

  /**
   * Place defense tiles on the board
   * @param {Array} tiles - Ordered array of tile types (one per row)
   * @returns {Object} { success: boolean, error: string }
   */
  placeDefenseTiles(tiles) {
    if (this.phase !== GamePhase.DEFENSE) {
      return { success: false, error: 'Not in defense phase' };
    }

    if (tiles.length !== this.config.totalPaths) {
      return { success: false, error: 'Incorrect number of tiles' };
    }

    // Add column to board
    const success = this.board.addColumn(tiles);
    if (!success) {
      return { success: false, error: 'Failed to place tiles' };
    }

    this.logEvent(`Defense placed column ${this.board.maxColumn}`, 'defense');
    return { success: true };
  }

  /**
   * End defense phase, start offense phase OR next defense turn
   */
  endDefensePhase() {
    this.defenseTurnCount++;
    
    // Defense takes 2 turns ONLY at the start of the game
    if (this.firstCycle && this.defenseTurnCount < 2) {
      // Stay in defense phase for second turn
      this.currentDraw = [];
      this.logEvent(`Defense turn ${this.defenseTurnCount} complete - taking second turn`, 'defense');
      return;
    }
    
    // After 2 defense turns (or on subsequent cycles), switch to offense
    this.phase = GamePhase.OFFENSE;
    this.defenseTurnCount = 0; // Reset counter
    this.firstCycle = false; // First cycle complete
    this.currentDraw = [];
    
    // Count units on board (not at spawn, not trapped) for bonus gold
    const unitsOnBoard = Object.values(this.units).filter(u => 
      u.alive && u.x > -1 && !u.trapped
    ).length;
    
    // Grant gold to offense (base + per-unit bonus)
    const baseGold = this.config.goldPerTurn;
    const bonusGold = unitsOnBoard;
    const totalGold = baseGold + bonusGold;
    
    this.gold += totalGold;
    
    if (bonusGold > 0) {
      this.logEvent(`Offense gained ${baseGold} base + ${bonusGold} unit bonus = ${totalGold} gold (Total: ${this.gold})`, 'offense');
    } else {
      this.logEvent(`Offense gained ${baseGold} gold (Total: ${this.gold})`, 'offense');
    }
    
    // Enable respawn for dead units
    for (const unit of Object.values(this.units)) {
      unit.enableRespawn();
    }
  }

  /**
   * Spawn a unit
   * @param {string} unitType 
   * @returns {Object} { success: boolean, error: string }
   */
  spawnUnit(unitType) {
    const unit = this.units[unitType];
    if (!unit) {
      return { success: false, error: 'Invalid unit type' };
    }

    if (unit.alive) {
      return { success: false, error: 'Unit already alive' };
    }

    if (!unit.canRespawn) {
      return { success: false, error: 'Unit cannot respawn this turn' };
    }

    const cost = unit.getSpawnCost(this.config);
    if (this.gold < cost) {
      return { success: false, error: 'Not enough gold' };
    }

    // Check if spawn area is occupied
    const spawnOccupied = Object.values(this.units).some(u => 
      u.alive && u.x === -1 && u.spawned
    );
    if (spawnOccupied) {
      return { success: false, error: 'Spawn area occupied' };
    }

    // Spawn unit
    this.gold -= cost;
    unit.spawn(0); // Spawn at y=0 in offense endzone (x=-1)
    this.logEvent(`Spawned ${unitType} (-${cost} gold)`, 'offense');
    
    return { success: true };
  }

  /**
   * Move a unit
   * @param {string} unitType 
   * @param {number} targetX 
   * @param {number} targetY 
   * @returns {Object} { success: boolean, error: string, effects: Object }
   */
  moveUnit(unitType, targetX, targetY) {
    const unit = this.units[unitType];
    if (!unit) {
      return { success: false, error: 'Invalid unit type' };
    }

    if (!unit.alive) {
      return { success: false, error: 'Unit is not alive' };
    }

    if (unit.trapped) {
      return { success: false, error: 'Unit is trapped' };
    }

    const cost = unit.getMoveCost(this.config);
    if (this.gold < cost) {
      return { success: false, error: 'Not enough gold' };
    }

    // Validate movement
    const dx = targetX - unit.x;
    const dy = targetY - unit.y;
    const validMoves = unit.getMovementOptions(this.config.totalPaths);
    const isValidMove = validMoves.some(move => move.dx === dx && move.dy === dy);
    
    if (!isValidMove) {
      return { success: false, error: 'Invalid move' };
    }

    // Check if target is valid position
    if (!this.board.isValidPosition(targetX, targetY) && !this.board.isDefenseEndzone(targetX)) {
      return { success: false, error: 'Invalid target position' };
    }
    
    // Check if target position is occupied by another unit
    const targetOccupied = Object.values(this.units).some(u => 
      u.alive && u !== unit && u.x === targetX && u.y === targetY
    );
    if (targetOccupied) {
      return { success: false, error: 'Target position occupied by another unit' };
    }

    // Check if reached defense endzone (win condition)
    if (this.board.isDefenseEndzone(targetX)) {
      this.gold -= cost;
      this.gameOver = true;
      this.winner = 'offense';
      this.revealAllTiles();
      this.logEvent(`${unitType} reached the defense endzone! Offense wins!`, 'offense');
      return { success: true, effects: { win: true } };
    }

    // Save old position for revert if needed
    const oldX = unit.x;
    const oldY = unit.y;

    // Clear old position
    if (this.board.isValidPosition(oldX, oldY)) {
      this.board.setTileHasUnit(oldX, oldY, false);
    }

    // Pay gold and move unit
    this.gold -= cost;
    unit.moveTo(targetX, targetY);
    
    // Get tile and reveal it
    const tile = this.board.getTile(targetX, targetY);
    const wasRevealed = tile.revealed;
    tile.reveal();
    
    // Check if it's a boulder AFTER paying and revealing
    if (tile.type === 'boulder') {
      // Revert the move
      unit.moveTo(oldX, oldY);
      if (this.board.isValidPosition(oldX, oldY)) {
        this.board.setTileHasUnit(oldX, oldY, true);
      }
      this.logEvent(`${unitType} discovered a boulder at (${targetX}, ${targetY})! Movement blocked (lost ${cost} gold)`, 'event');
      return { success: false, error: 'Movement blocked by boulder', goldLost: true };
    }
    
    // Movement successful, mark tile as occupied
    this.board.setTileHasUnit(targetX, targetY, true);
    
    // Check if tile was already revealed

    const effects = wasRevealed ? { killed: false, trapped: false, blocked: false } : tile.applyEffect(unit);
    this.logEvent(`${unitType} moved to (${targetX}, ${targetY})`, 'offense');
    
    // Boulder already checked before moving, so blocked should never happen here
    
    if (effects.killed) {
      this.logEvent(`${unitType} was killed by spikes!`, 'danger');
      unit.kill();
      this.board.setTileHasUnit(targetX, targetY, false);
    }

    if (effects.trapped) {
      unit.setTrapped(true);
      this.logEvent(`${unitType} is trapped!`, 'event');
    }

    return { success: true, effects };
  }

  /**
   * End offense phase, start next turn
   */
  endOffensePhase() {
    // Hide revealed tiles (except those with units)
    this.board.hideRevealedTiles();
    
    // Update unit positions on tiles
    for (const unit of Object.values(this.units)) {
      if (unit.alive && this.board.isValidPosition(unit.x, unit.y)) {
        this.board.setTileHasUnit(unit.x, unit.y, true);
      }
    }
    
    // Start next turn
    this.turn++;
    this.phase = GamePhase.DEFENSE;
    this.logEvent(`=== Turn ${this.turn} ===`, 'event');
  }

  /**
   * Log an event
   * @param {string} message 
   * @param {string} type - 'defense', 'offense', 'event', 'danger'
   */
  logEvent(message, type = 'event') {
    this.events.push({
      turn: this.turn,
      phase: this.phase,
      message,
      type,
      timestamp: Date.now()
    });
  }

  /**
   * Get recent events
   * @param {number} count 
   * @returns {Array}
   */
  getRecentEvents(count = 10) {
    return this.events.slice(-count);
  }

  /**
   * Get all alive units
   * @returns {Array}
   */
  getAliveUnits() {
    return Object.values(this.units).filter(u => u.alive);
  }

  /**
   * Check if game is over
   * @returns {boolean}
   */
  isGameOver() {
    return this.gameOver;
  }

  /**
   * Get game winner
   * @returns {string|null}
   */
  getWinner() {
    return this.winner;
  }

  /**
   * Reveal all tiles on the board (for game over)
   */
  revealAllTiles() {
    const tiles = this.board.getAllTiles();
    tiles.forEach(tile => tile.reveal());
  }

  /**
   * Reset game state
   */
  reset() {
    this.board.clear();
    this.tileBag.reset();
    this.units = createAllUnits();
    this.turn = 1;
    this.phase = GamePhase.DEFENSE;
    this.defenseTurnCount = 0;
    this.firstCycle = true; // Reset first cycle flag
    this.gold = this.config.startingGold;
    this.currentDraw = [];
    this.gameOver = false;
    this.winner = null;
    this.events = [];
    this.logEvent('Game started', 'event');
  }
}
