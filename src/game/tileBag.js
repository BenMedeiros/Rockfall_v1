/**
 * Tile bag system for drawing tiles with seeded randomness
 */
import { SeededRandom } from '../utils/seededRandom.js';

export class TileBag {
  constructor(tileCounts, seed) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
    this.originalCounts = { ...tileCounts };
    this.remainingTiles = this._createTileArray(tileCounts);
    this.drawnTiles = [];
  }

  /**
   * Create array of tiles from counts object
   * @param {Object} tileCounts 
   * @returns {Array}
   */
  _createTileArray(tileCounts) {
    const tiles = [];
    for (const [tileType, count] of Object.entries(tileCounts)) {
      for (let i = 0; i < count; i++) {
        tiles.push(tileType);
      }
    }
    // Shuffle tiles using seeded random
    return this.rng.shuffle(tiles);
  }

  /**
   * Draw a single tile from the bag
   * @returns {string|null} Tile type or null if bag is empty
   */
  drawTile() {
    if (this.remainingTiles.length === 0) {
      return null;
    }
    const tile = this.remainingTiles.pop();
    this.drawnTiles.push(tile);
    return tile;
  }

  /**
   * Draw multiple tiles from the bag
   * @param {number} count 
   * @returns {Array} Array of tile types
   */
  drawTiles(count) {
    const tiles = [];
    for (let i = 0; i < count; i++) {
      const tile = this.drawTile();
      if (tile === null) {
        break; // No more tiles available
      }
      tiles.push(tile);
    }
    return tiles;
  }

  /**
   * Get count of remaining tiles by type
   * @returns {Object}
   */
  getRemainingCounts() {
    const counts = {};
    for (const tile of this.remainingTiles) {
      counts[tile] = (counts[tile] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get total number of remaining tiles
   * @returns {number}
   */
  getTotalRemaining() {
    return this.remainingTiles.length;
  }

  /**
   * Check if enough tiles remain for a draw
   * @param {number} count 
   * @returns {boolean}
   */
  canDraw(count) {
    return this.remainingTiles.length >= count;
  }

  /**
   * Reset the bag to initial state
   */
  reset() {
    this.rng.reset(this.seed);
    this.remainingTiles = this._createTileArray(this.originalCounts);
    this.drawnTiles = [];
  }

  /**
   * Get the complete draw order (for debugging/replay)
   * @returns {Array}
   */
  getDrawOrder() {
    return [...this.drawnTiles];
  }
}
