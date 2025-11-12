/**
 * Defense player actions and logic
 */

export class DefensePlayer {
  constructor(gameState) {
    this.gameState = gameState;
    this.selectedTiles = new Map(); // row -> tileType
  }

  /**
   * Start defense turn - draw tiles
   * @returns {Object}
   */
  startTurn() {
    const result = this.gameState.startDefensePhase();
    if (result.success) {
      this.selectedTiles.clear();
    }
    return result;
  }

  /**
   * Assign a tile to a specific row
   * @param {number} row 
   * @param {string} tileType 
   * @returns {Object} { success: boolean, replacedTile: string|null }
   */
  assignTileToRow(row, tileType) {
    if (row < 0 || row >= this.gameState.config.totalPaths) {
      return { success: false, replacedTile: null };
    }

    // Check if tile is in current draw
    const availableTiles = this.getAvailableTiles();
    if (!availableTiles.includes(tileType)) {
      return { success: false, replacedTile: null };
    }

    // Check if row already has a tile assigned
    const replacedTile = this.selectedTiles.get(row) || null;
    
    this.selectedTiles.set(row, tileType);
    
    // Log the tile placement with coordinates
    const nextColumn = this.gameState.board.maxColumn + 1;
    if (replacedTile) {
      this.gameState.logEvent(`Replaced ${replacedTile} with ${tileType} at (${nextColumn}, ${row})`, 'defense');
    } else {
      this.gameState.logEvent(`Placed ${tileType} at (${nextColumn}, ${row})`, 'defense');
    }
    
    return { success: true, replacedTile };
  }

  /**
   * Get tiles that haven't been assigned yet
   * @returns {Array}
   */
  getAvailableTiles() {
    const assigned = Array.from(this.selectedTiles.values());
    return this.gameState.currentDraw.filter(tile => {
      const assignedCount = assigned.filter(t => t === tile).length;
      const drawnCount = this.gameState.currentDraw.filter(t => t === tile).length;
      return assignedCount < drawnCount;
    });
  }

  /**
   * Check if all tiles have been assigned
   * @returns {boolean}
   */
  isPlacementComplete() {
    return this.selectedTiles.size === this.gameState.config.totalPaths;
  }

  /**
   * Get current tile assignments
   * @returns {Map}
   */
  getAssignments() {
    return new Map(this.selectedTiles);
  }

  /**
   * Clear assignment for a row
   * @param {number} row 
   */
  clearAssignment(row) {
    this.selectedTiles.delete(row);
  }

  /**
   * Clear all assignments
   */
  clearAllAssignments() {
    this.selectedTiles.clear();
  }

  /**
   * Place all assigned tiles on the board
   * @returns {Object}
   */
  placeTiles() {
    if (!this.isPlacementComplete()) {
      return { 
        success: false, 
        error: 'Not all tiles have been assigned' 
      };
    }

    // Create ordered array of tiles (by row)
    const orderedTiles = [];
    for (let row = 0; row < this.gameState.config.totalPaths; row++) {
      orderedTiles.push(this.selectedTiles.get(row));
    }

    const result = this.gameState.placeDefenseTiles(orderedTiles);
    if (result.success) {
      this.selectedTiles.clear();
    }
    
    return result;
  }

  /**
   * End defense turn
   */
  endTurn() {
    this.gameState.endDefensePhase();
    this.selectedTiles.clear();
  }

  /**
   * Auto-place tiles (random assignment for AI or quick play)
   * @returns {Object}
   */
  autoPlace() {
    const tiles = [...this.gameState.currentDraw];
    
    // Simple random assignment
    for (let row = 0; row < this.gameState.config.totalPaths; row++) {
      const randomIndex = Math.floor(Math.random() * tiles.length);
      const tile = tiles[randomIndex];
      this.selectedTiles.set(row, tile);
      tiles.splice(randomIndex, 1);
    }

    return this.placeTiles();
  }
}
