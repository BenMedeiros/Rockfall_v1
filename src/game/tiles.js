/**
 * Tile definitions and behaviors
 */
import { TileType } from '../utils/gameConfig.js';

export class Tile {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.revealed = false;
    this.hasUnit = false;
  }

  /**
   * Reveal this tile
   */
  reveal() {
    this.revealed = true;
  }

  /**
   * Hide this tile (flip face-down)
   */
  hide() {
    if (!this.hasUnit) {
      this.revealed = false;
    }
  }

  /**
   * Apply tile effect to a unit
   * @param {Unit} unit 
   * @returns {Object} { killed: boolean, trapped: boolean, blocked: boolean }
   */
  applyEffect(unit) {
    const result = {
      killed: false,
      trapped: false,
      blocked: false
    };

    switch (this.type) {
      case TileType.SPIKES:
        result.killed = true;
        break;
      case TileType.BOULDER:
        result.blocked = true;
        break;
      case TileType.BLANK:
        // No effect
        break;
    }

    return result;
  }

  /**
   * Get tile color for rendering
   * @returns {string}
   */
  getColor() {
    const colors = {
      [TileType.BLANK]: '#4a5568',
      [TileType.SPIKES]: '#ef476f',
      [TileType.BOULDER]: '#8b7355'
    };
    return colors[this.type] || '#2d3748';
  }

  /**
   * Get tile symbol for rendering
   * @returns {string}
   */
  getSymbol() {
    const symbols = {
      [TileType.BLANK]: '',
      [TileType.SPIKES]: '▲',
      [TileType.BOULDER]: '●'
    };
    return symbols[this.type] || '?';
  }

  /**
   * Clone this tile
   * @returns {Tile}
   */
  clone() {
    const tile = new Tile(this.type, this.x, this.y);
    tile.revealed = this.revealed;
    tile.hasUnit = this.hasUnit;
    return tile;
  }
}

/**
 * Create a tile from type
 * @param {string} type 
 * @param {number} x 
 * @param {number} y 
 * @returns {Tile}
 */
export function createTile(type, x, y) {
  return new Tile(type, x, y);
}
