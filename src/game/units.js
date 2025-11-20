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
   * @param {number} totalPaths - Total number of paths/rows on the board
   * @returns {Array} Array of {dx, dy} offsets
   */
  getMovementOptions(totalPaths = 5) {
    const options = [];
    
    // Special case: units at spawn (x=-1)
    if (this.x === -1) {
      if (this.type === UnitType.SPRINTER) {
        // Sprinter can reach column 0 or 1 (any row)
        for (let targetY = 0; targetY < totalPaths; targetY++) {
          const dy = targetY - this.y;
          options.push({ dx: 1, dy: dy });  // Column 0
          options.push({ dx: 2, dy: dy });  // Column 1
        }
      } else if (this.type === UnitType.JUMPER) {
        // Jumper can jump to column 1 (any row)
        for (let targetY = 0; targetY < totalPaths; targetY++) {
          const dy = targetY - this.y;
          options.push({ dx: 2, dy: dy });  // Column 1 (jump over column 0)
        }
      } else {
        // Basic unit can only move to column 0 (any row)
        for (let targetY = 0; targetY < totalPaths; targetY++) {
          const dy = targetY - this.y;
          options.push({ dx: 1, dy: dy });
        }
      }
      return options;
    }
    
    switch (this.type) {
      case UnitType.BASIC:
      case UnitType.SCOUT:
      case UnitType.BOMBER:
        // Move 1: Adjacent tiles only (not diagonal)
        options.push(
          { dx: 1, dy: 0 },  // Right
          { dx: 0, dy: 1 },  // Down
          { dx: 0, dy: -1 }  // Up
        );
        // Can move left unless at x=0 (would go back to spawn)
        if (this.x > 0) {
          options.push({ dx: -1, dy: 0 }); // Left
        }
        break;
        
      case UnitType.SPRINTER:
        // Move 2: Move 1, then if no trap/obstruction, move 1 again
        // For simplicity, we'll allow 2-tile moves in cardinal directions
        options.push(
          // 2 tiles horizontally
          { dx: 2, dy: 0 },   // Right 2
          // 2 tiles vertically
          { dx: 0, dy: 2 },   // Down 2
          { dx: 0, dy: -2 },  // Up 2
          // Also allow single moves
          { dx: 1, dy: 0 },   // Right 1
          { dx: 0, dy: 1 },   // Down 1
          { dx: 0, dy: -1 }   // Up 1
        );
        if (this.x > 0) {
          options.push({ dx: -1, dy: 0 }); // Left 1
        }
        if (this.x > 1) {
          options.push({ dx: -2, dy: 0 }); // Left 2
        }
        break;
        
      case UnitType.JUMPER:
        // Jump 1: Jump over one adjacent tile, landing two spaces away
        // Can jump orthogonally or diagonally
        options.push(
          // Orthogonal jumps (2 spaces away)
          { dx: 2, dy: 0 },   // Right
          { dx: 0, dy: 2 },   // Down
          { dx: 0, dy: -2 },  // Up
          // Diagonal jumps (2 spaces diagonally)
          { dx: 2, dy: 2 },   // Right-Down
          { dx: 2, dy: -2 },  // Right-Up
          { dx: -2, dy: 2 },  // Left-Down
          { dx: -2, dy: -2 }  // Left-Up
        );
        if (this.x > 1) {
          options.push({ dx: -2, dy: 0 }); // Left
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
      [UnitType.SPRINTER]: '#ffd166',
      [UnitType.JUMPER]: '#118ab2',
      [UnitType.SCOUT]: '#8338ec',
      [UnitType.BOMBER]: '#ef476f'
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
      [UnitType.SPRINTER]: 'S',
      [UnitType.JUMPER]: 'J',
      [UnitType.SCOUT]: 'Sc',
      [UnitType.BOMBER]: 'Bo'
    };
    return symbols[this.type] || '?';
  }

  /**
   * Check if this unit has Jump ability
   * @returns {boolean}
   */
  hasJumpAbility() {
    return this.type === UnitType.JUMPER;
  }

  /**
   * Check if this unit has Reveal ability (Scout)
   * @returns {boolean}
   */
  hasRevealAbility() {
    return this.type === UnitType.SCOUT;
  }

  /**
   * Check if this unit has Bomb ability (Bomber)
   * @returns {boolean}
   */
  hasBombAbility() {
    return this.type === UnitType.BOMBER;
  }

  /**
   * Check if movement is a jump (distance of 2)
   * @param {number} dx
   * @param {number} dy
   * @returns {boolean}
   */
  isJumpMove(dx, dy) {
    if (!this.hasJumpAbility()) return false;
    // Jump moves are 2 spaces away (orthogonal or diagonal)
    return (Math.abs(dx) === 2 && dy === 0) || 
           (dx === 0 && Math.abs(dy) === 2) ||
           (Math.abs(dx) === 2 && Math.abs(dy) === 2);
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
    [UnitType.SPRINTER]: createUnit(UnitType.SPRINTER, 'sprinter-1'),
    [UnitType.JUMPER]: createUnit(UnitType.JUMPER, 'jumper-1'),
    [UnitType.SCOUT]: createUnit(UnitType.SCOUT, 'scout-1'),
    [UnitType.BOMBER]: createUnit(UnitType.BOMBER, 'bomber-1')
  };
}
