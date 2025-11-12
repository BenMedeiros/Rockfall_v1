/**
 * Unit definitions and behaviors
 */
import { UnitType } from '../utils/gameConfig.js';

export class Unit {
  constructor(type, id) {
    this.type = type;
    this.id = id;
    this.x = -1; // Start at offense endzone (x=-1)
    this.y = -1; // Not on board yet
    this.alive = false;
    this.spawned = false;
    this.trapped = false;
    this.canRespawn = true;
  }

  /**
   * Spawn the unit at the offense endzone
   * @param {number} y - Row position in endzone
   */
  spawn(y = 0) {
    this.x = -1; // Offense endzone is at x=-1
    this.y = y;
    this.alive = true;
    this.spawned = true;
    this.trapped = false;
    this.canRespawn = false;
  }

  /**
   * Move the unit to a new position
   * @param {number} x 
   * @param {number} y 
   */
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Kill the unit
   */
  kill() {
    this.alive = false;
    this.spawned = false;
    this.x = -1; // Reset to offense endzone
    this.y = -1;
    // canRespawn will be set to true at end of offense turn
  }

  /**
   * Enable respawning for this unit
   */
  enableRespawn() {
    if (!this.alive) {
      this.canRespawn = true;
    }
  }

  /**
   * Set trapped status
   * @param {boolean} trapped 
   */
  setTrapped(trapped) {
    this.trapped = trapped;
  }

  /**
   * Get valid movement range for this unit
   * @returns {Array} Array of {dx, dy} offsets
   */
  getMovementOptions() {
    const options = [];
    
    switch (this.type) {
      case UnitType.BASIC:
        // Adjacent tiles only (not diagonal)
        options.push(
          { dx: 1, dy: 0 },  // Right
          { dx: 0, dy: 1 },  // Down
          { dx: 0, dy: -1 }  // Up
        );
        // Can move left unless at x=1 (would go back to spawn)
        if (this.x > 1) {
          options.push({ dx: -1, dy: 0 }); // Left
        }
        break;
        
      case UnitType.SPRINTER:
        // Returns same as basic for single-tile options
        // The double-move is handled by game logic
        options.push(
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        );
        if (this.x > 1) {
          options.push({ dx: -1, dy: 0 });
        }
        break;
    }
    
    return options;
  }

  /**
   * Get movement cost for this unit
   * @param {Object} gameConfig 
   * @returns {number}
   */
  getMoveCost(gameConfig) {
    return gameConfig.unitCosts[this.type].move;
  }

  /**
   * Get spawn cost for this unit
   * @param {Object} gameConfig 
   * @returns {number}
   */
  getSpawnCost(gameConfig) {
    return gameConfig.unitCosts[this.type].summon;
  }

  /**
   * Get unit color for rendering
   * @returns {string}
   */
  getColor() {
    const colors = {
      [UnitType.BASIC]: '#06d6a0',
      [UnitType.SPRINTER]: '#ffd166'
    };
    return colors[this.type] || '#eaeaea';
  }

  /**
   * Get unit symbol for rendering
   * @returns {string}
   */
  getSymbol() {
    const symbols = {
      [UnitType.BASIC]: 'B',
      [UnitType.SPRINTER]: 'S'
    };
    return symbols[this.type] || '?';
  }

  /**
   * Clone this unit
   * @returns {Unit}
   */
  clone() {
    const unit = new Unit(this.type, this.id);
    unit.x = this.x;
    unit.y = this.y;
    unit.alive = this.alive;
    unit.spawned = this.spawned;
    unit.trapped = this.trapped;
    unit.canRespawn = this.canRespawn;
    return unit;
  }
}

/**
 * Create a unit from type
 * @param {string} type 
 * @param {string} id 
 * @returns {Unit}
 */
export function createUnit(type, id) {
  return new Unit(type, id);
}

/**
 * Create all units for the offense player
 * @returns {Object} Map of unit type to unit instance
 */
export function createAllUnits() {
  return {
    [UnitType.BASIC]: createUnit(UnitType.BASIC, 'basic-1'),
    [UnitType.SPRINTER]: createUnit(UnitType.SPRINTER, 'sprinter-1')
  };
}
