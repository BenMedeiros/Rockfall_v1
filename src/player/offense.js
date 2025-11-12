/**
 * Offense player actions and logic
 */

export class OffensePlayer {
  constructor(gameState) {
    this.gameState = gameState;
    this.selectedUnit = null;
    this.moveTargets = []; // For sprinter double-move
  }

  /**
   * Select a unit for movement
   * @param {string} unitType 
   * @returns {boolean}
   */
  selectUnit(unitType) {
    const unit = this.gameState.units[unitType];
    if (!unit || !unit.alive || unit.trapped) {
      return false;
    }

    this.selectedUnit = unitType;
    this.moveTargets = [];
    return true;
  }

  /**
   * Deselect current unit
   */
  deselectUnit() {
    this.selectedUnit = null;
    this.moveTargets = [];
  }

  /**
   * Get currently selected unit
   * @returns {Unit|null}
   */
  getSelectedUnit() {
    if (!this.selectedUnit) return null;
    return this.gameState.units[this.selectedUnit];
  }

  /**
   * Get valid move positions for selected unit
   * @returns {Array} Array of {x, y} positions
   */
  getValidMoves() {
    const unit = this.getSelectedUnit();
    if (!unit) return [];

    const moves = [];
    const options = unit.getMovementOptions(this.gameState.config.totalPaths);
    
    // Get all alive units for collision detection
    const aliveUnits = this.gameState.getAliveUnits();

    for (const move of options) {
      const targetX = unit.x + move.dx;
      const targetY = unit.y + move.dy;

      // Check if moving to defense endzone (single spot, any y from last column can reach it)
      if (this.gameState.board.isDefenseEndzone(targetX)) {
        // Only add defense endzone once, at a normalized position
        const defenseEndzonePos = { x: targetX, y: Math.floor(this.gameState.config.totalPaths / 2) };
        if (!moves.some(m => this.gameState.board.isDefenseEndzone(m.x))) {
          moves.push(defenseEndzonePos);
        }
        continue;
      }

      // Check if position is valid board tile
      if (this.gameState.board.isValidPosition(targetX, targetY)) {
        // Check if within bounds for y
        if (targetY >= 0 && targetY < this.gameState.config.totalPaths) {
          // Check if position is occupied by another unit
          const isOccupied = aliveUnits.some(u => 
            u.x === targetX && u.y === targetY && u !== unit
          );
          
          // Don't check for boulders - let unit attempt move and discover on reveal
          
          if (!isOccupied) {
            moves.push({ x: targetX, y: targetY });
          }
        }
      }
    }

    return moves;
  }

  /**
   * Spawn a unit
   * @param {string} unitType 
   * @returns {Object}
   */
  spawnUnit(unitType) {
    return this.gameState.spawnUnit(unitType);
  }

  /**
   * Move selected unit to target position
   * @param {number} targetX 
   * @param {number} targetY 
   * @returns {Object}
   */
  moveSelectedUnit(targetX, targetY) {
    if (!this.selectedUnit) {
      return { success: false, error: 'No unit selected' };
    }

    const result = this.gameState.moveUnit(this.selectedUnit, targetX, targetY);
    
    if (result.success) {
      this.deselectUnit();
    }

    return result;
  }

  /**
   * Move unit with specified type (for sprinter double-move)
   * @param {string} unitType 
   * @param {Array} targets - Array of {x, y} positions
   * @returns {Object}
   */
  moveUnitMultiple(unitType, targets) {
    const unit = this.gameState.units[unitType];
    if (!unit) {
      return { success: false, error: 'Invalid unit type' };
    }

    // Currently only sprinter can move multiple times
    if (unit.type !== 'sprinter') {
      return { success: false, error: 'Unit cannot move multiple times' };
    }

    if (targets.length !== 2) {
      return { success: false, error: 'Sprinter must move exactly 2 tiles' };
    }

    // Check gold for movement
    const cost = unit.getMoveCost(this.gameState.config);
    if (this.gameState.gold < cost) {
      return { success: false, error: 'Not enough gold' };
    }

    // Execute first move
    const firstMove = this.gameState.moveUnit(unitType, targets[0].x, targets[0].y);
    if (!firstMove.success) {
      return firstMove;
    }

    // Check if unit died or was trapped on first move
    if (!unit.alive || unit.trapped) {
      return { 
        success: true, 
        partial: true,
        message: 'Movement stopped after first tile' 
      };
    }

    // Execute second move
    const secondMove = this.gameState.moveUnit(unitType, targets[1].x, targets[1].y);
    return secondMove;
  }

  /**
   * Check if offense can afford an action
   * @param {string} actionType - 'spawn' or 'move'
   * @param {string} unitType 
   * @returns {boolean}
   */
  canAfford(actionType, unitType) {
    const unit = this.gameState.units[unitType];
    if (!unit) return false;

    const cost = actionType === 'spawn' 
      ? unit.getSpawnCost(this.gameState.config)
      : unit.getMoveCost(this.gameState.config);

    return this.gameState.gold >= cost;
  }

  /**
   * Get all units that can be spawned
   * @returns {Array}
   */
  getSpawnableUnits() {
    return Object.entries(this.gameState.units)
      .filter(([type, unit]) => {
        return !unit.alive && 
               unit.canRespawn && 
               this.canAfford('spawn', type);
      })
      .map(([type, unit]) => ({ type, unit }));
  }

  /**
   * Get all units that can move
   * @returns {Array}
   */
  getMovableUnits() {
    return Object.entries(this.gameState.units)
      .filter(([type, unit]) => {
        return unit.alive && 
               !unit.trapped && 
               this.canAfford('move', type);
      })
      .map(([type, unit]) => ({ type, unit }));
  }

  /**
   * End offense turn
   */
  endTurn() {
    this.deselectUnit();
    this.gameState.endOffensePhase();
  }
}
