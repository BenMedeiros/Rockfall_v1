/**
 * Board management system for Dungeon Rush
 */
import { createTile } from './tiles.js';

export class Board {
  constructor(totalPaths) {
    this.totalPaths = totalPaths; // Number of rows
    this.columns = []; // Array of columns, each column is an array of tiles
    this.maxColumn = -1; // Highest column index with tiles
  }

  /**
   * Add a new column of tiles to the board
   * @param {Array} tileTypes - Array of tile types (one per path/row)
   * @returns {boolean} Success
   */
  addColumn(tileTypes) {
    if (tileTypes.length !== this.totalPaths) {
      console.error(`Expected ${this.totalPaths} tiles, got ${tileTypes.length}`);
      return false;
    }

    const columnIndex = this.maxColumn + 1;
    const newColumn = [];

    for (let row = 0; row < this.totalPaths; row++) {
      const tile = createTile(tileTypes[row], columnIndex, row);
      newColumn.push(tile);
    }

    this.columns.push(newColumn);
    this.maxColumn = columnIndex;
    return true;
  }

  /**
   * Get tile at specific position
   * @param {number} x - Column
   * @param {number} y - Row
   * @returns {Tile|null}
   */
  getTile(x, y) {
    if (x < 0 || x > this.maxColumn || y < 0 || y >= this.totalPaths) {
      return null;
    }
    return this.columns[x][y];
  }

  /**
   * Check if position is valid on the board
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean}
   */
  isValidPosition(x, y) {
    return x >= 0 && x <= this.maxColumn && y >= 0 && y < this.totalPaths;
  }

  /**
   * Check if position is in offense endzone (spawn area)
   * @param {number} x 
   * @returns {boolean}
   */
  isOffenseEndzone(x) {
    return x === -1;
  }

  /**
   * Check if position is in defense endzone (goal area)
   * @param {number} x 
   * @returns {boolean}
   */
  isDefenseEndzone(x) {
    return x > this.maxColumn;
  }

  /**
   * Reveal tile at position
   * @param {number} x 
   * @param {number} y 
   */
  revealTile(x, y) {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.reveal();
    }
  }

  /**
   * Hide all revealed tiles except those with units
   */
  hideRevealedTiles() {
    for (const column of this.columns) {
      for (const tile of column) {
        tile.hide();
      }
    }
  }

  /**
   * Mark tile as having a unit
   * @param {number} x 
   * @param {number} y 
   * @param {boolean} hasUnit 
   */
  setTileHasUnit(x, y, hasUnit) {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.hasUnit = hasUnit;
    }
  }

  /**
   * Get all tiles in a specific column
   * @param {number} x 
   * @returns {Array}
   */
  getColumn(x) {
    if (x < 0 || x > this.maxColumn) {
      return [];
    }
    return this.columns[x];
  }

  /**
   * Get all tiles in a specific row
   * @param {number} y 
   * @returns {Array}
   */
  getRow(y) {
    if (y < 0 || y >= this.totalPaths) {
      return [];
    }
    return this.columns.map(column => column[y]);
  }

  /**
   * Get board dimensions
   * @returns {Object} { width, height }
   */
  getDimensions() {
    return {
      width: this.maxColumn + 1,
      height: this.totalPaths
    };
  }

  /**
   * Get all tiles on the board
   * @returns {Array}
   */
  getAllTiles() {
    const tiles = [];
    for (const column of this.columns) {
      tiles.push(...column);
    }
    return tiles;
  }

  /**
   * Clear the board
   */
  clear() {
    this.columns = [];
    this.maxColumn = -1;
  }

  /**
   * Clone the board
   * @returns {Board}
   */
  clone() {
    const board = new Board(this.totalPaths);
    board.maxColumn = this.maxColumn;
    board.columns = this.columns.map(column => 
      column.map(tile => tile.clone())
    );
    return board;
  }

  /**
   * Destroy tiles at specified positions
   * @param {Array} positions - Array of {x, y} positions
   * @returns {Array} Destroyed tiles
   */
  destroyTiles(positions) {
    const destroyed = [];
    
    for (const pos of positions) {
      const tile = this.getTile(pos.x, pos.y);
      if (tile) {
        destroyed.push({ ...pos, tile });
        // Mark tile as destroyed (set to null)
        if (this.columns[pos.x]) {
          this.columns[pos.x][pos.y] = null;
        }
      }
    }
    
    return destroyed;
  }

  /**
   * Shift tiles left to fill gaps after destruction
   * Removes null tiles and compacts columns
   * @returns {Object} Mapping of old positions to new positions
   */
  shiftTilesLeft() {
    const positionMap = new Map(); // Map old position to new position
    
    // First pass: collect all tiles that need to be moved
    const tilesToMove = [];
    for (let y = 0; y < this.totalPaths; y++) {
      const rowTiles = [];
      
      // Collect all non-null tiles in this row
      for (let x = 0; x <= this.maxColumn; x++) {
        const tile = this.columns[x] ? this.columns[x][y] : null;
        if (tile !== null) {
          rowTiles.push({ tile, oldX: x, y });
        }
      }
      
      tilesToMove.push(rowTiles);
    }
    
    // Second pass: clear ALL positions first
    for (let x = 0; x <= this.maxColumn; x++) {
      if (this.columns[x]) {
        for (let y = 0; y < this.totalPaths; y++) {
          this.columns[x][y] = null;
        }
      }
    }
    
    // Third pass: place tiles in their new positions
    for (let y = 0; y < tilesToMove.length; y++) {
      const rowTiles = tilesToMove[y];
      
      for (let newX = 0; newX < rowTiles.length; newX++) {
        const { tile, oldX } = rowTiles[newX];
        
        // Update tile position
        tile.x = newX;
        
        // Store mapping
        positionMap.set(`${oldX},${y}`, { x: newX, y });
        
        // Ensure column exists
        if (!this.columns[newX]) {
          this.columns[newX] = new Array(this.totalPaths).fill(null);
        }
        
        // Place tile in new position
        this.columns[newX][y] = tile;
      }
    }
    
    // Remove completely empty columns from the end
    while (this.maxColumn >= 0 && this.isColumnEmpty(this.maxColumn)) {
      this.columns.pop();
      this.maxColumn--;
    }
    
    return positionMap;
  }

  /**
   * Check if a column is empty (all nulls)
   * @param {number} x - Column index
   * @returns {boolean}
   */
  isColumnEmpty(x) {
    if (x < 0 || x >= this.columns.length) return true;
    const column = this.columns[x];
    return column.every(tile => tile === null);
  }
}

