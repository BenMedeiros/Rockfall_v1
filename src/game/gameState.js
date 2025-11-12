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
   * End defense phase, start offense phase
   */
  endDefensePhase() {
    this.phase = GamePhase.OFFENSE;
    this.currentDraw = [];
    
    // Grant gold to offense
    this.gold += this.config.goldPerTurn;
    this.logEvent(`Offense gained ${this.config.goldPerTurn} gold (Total: ${this.gold})`, 'offense');
    
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
      u.alive && u.x === 0 && u.spawned
    );
    if (spawnOccupied) {
      return { success: false, error: 'Spawn area occupied' };
    }

    // Spawn unit
    this.gold -= cost;
    unit.spawn(0); // Spawn at y=0 in endzone
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
    const validMoves = unit.getMovementOptions();
    const isValidMove = validMoves.some(move => move.dx === dx && move.dy === dy);
    
    if (!isValidMove) {
      return { success: false, error: 'Invalid move' };
    }

    // Check if target is valid position
    if (!this.board.isValidPosition(targetX, targetY) && !this.board.isDefenseEndzone(targetX)) {
      return { success: false, error: 'Invalid target position' };
    }

    // Check if reached defense endzone (win condition)
    if (this.board.isDefenseEndzone(targetX)) {
      this.gold -= cost;
      this.gameOver = true;
      this.winner = 'offense';
      this.logEvent(`${unitType} reached the defense endzone! Offense wins!`, 'offense');
      return { success: true, effects: { win: true } };
    }

    // Clear old position
    if (this.board.isValidPosition(unit.x, unit.y)) {
      this.board.setTileHasUnit(unit.x, unit.y, false);
    }

    // Move unit
    this.gold -= cost;
    unit.moveTo(targetX, targetY);
    
    // Reveal and apply tile effect
    const tile = this.board.getTile(targetX, targetY);
    tile.reveal();
    this.board.setTileHasUnit(targetX, targetY, true);
    
    const effects = tile.applyEffect(unit);
    this.logEvent(`${unitType} moved to (${targetX}, ${targetY})`, 'offense');
    
    if (effects.blocked) {
      // Move was blocked, revert position
      unit.moveTo(unit.x - dx, unit.y - dy);
      this.board.setTileHasUnit(targetX, targetY, false);
      this.board.setTileHasUnit(unit.x, unit.y, true);
      this.logEvent(`Movement blocked by boulder!`, 'event');
      return { success: false, error: 'Movement blocked by boulder' };
    }

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
   * Reset game state
   */
  reset() {
    this.board.clear();
    this.tileBag.reset();
    this.units = createAllUnits();
    this.turn = 1;
    this.phase = GamePhase.DEFENSE;
    this.gold = this.config.startingGold;
    this.currentDraw = [];
    this.gameOver = false;
    this.winner = null;
    this.events = [];
    this.logEvent('Game started', 'event');
  }
}
