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
    this.treasureCollected = false; // Track if treasure was collected
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
    // Don't hide tiles with units or collected treasure
    if (!this.hasUnit && !(this.type === TileType.TREASURE && this.treasureCollected)) {
      this.revealed = false;
    }
  }

  /**
   * Apply tile effect to a unit
   * @param {Unit} unit 
   * @param {Object} direction - {dx, dy} for movement direction (for oil slick/pushback)
   * @returns {Object} { killed: boolean, trapped: boolean, blocked: boolean, pushed: {dx, dy}, treasure: boolean, bomb: boolean }
   */
  applyEffect(unit, direction = {dx: 0, dy: 0}) {
    const result = {
      killed: false,
      trapped: false,
      blocked: false,
      pushed: null, // {dx, dy} if unit should be pushed
      treasure: false,
      bomb: false // If bomb trap triggers
    };

    switch (this.type) {
      case TileType.BLANK:
        // No effect
        break;
        
      case TileType.SPIKE_TRAP:
        result.killed = true;
        break;
        
      case TileType.CAGE_TRAP:
        result.trapped = true;
        break;
        
      case TileType.OIL_SLICK_TRAP:
        // Unit continues moving in same direction
        result.pushed = { dx: direction.dx, dy: direction.dy };
        break;
        
      case TileType.PUSHBACK_TRAP:
        // Push unit back one tile (opposite direction)
        result.pushed = { dx: -direction.dx, dy: -direction.dy };
        break;
        
      case TileType.BOMB_TRAP:
        result.bomb = true;
        result.killed = true; // Unit on bomb trap dies
        break;
        
      case TileType.WALL:
        result.blocked = true;
        break;
        
      case TileType.TREASURE:
        result.treasure = true;
        break;
    }

    return result;
  }

  /**
   * Get tile image filename for rendering
   * @returns {string}
   */
  getImageName() {
    const images = {
      [TileType.BLANK]: 'empty.png',
      [TileType.SPIKE_TRAP]: 'trap_spikes.png',
      [TileType.CAGE_TRAP]: 'trap_cage.png',
      [TileType.OIL_SLICK_TRAP]: 'trap_oilslick.png',
      [TileType.PUSHBACK_TRAP]: 'trap_pushback.png',
      [TileType.BOMB_TRAP]: 'trap_bomb.png',
      [TileType.WALL]: 'wall.png',
      [TileType.TREASURE]: 'treasure.png'
    };
    return images[this.type] || 'empty.png';
  }

  /**
   * Get tile color for rendering (fallback if images not loaded)
   * @returns {string}
   */
  getColor() {
    const colors = {
      [TileType.BLANK]: '#4a5568',
      [TileType.SPIKE_TRAP]: '#ef476f',
      [TileType.CAGE_TRAP]: '#8b4513',
      [TileType.OIL_SLICK_TRAP]: '#2c1810',
      [TileType.PUSHBACK_TRAP]: '#f97316',
      [TileType.BOMB_TRAP]: '#dc2626',
      [TileType.WALL]: '#6b7280',
      [TileType.TREASURE]: '#fbbf24'
    };
    return colors[this.type] || '#2d3748';
  }

  /**
   * Get tile symbol for rendering (fallback if images not loaded)
   * @returns {string}
   */
  getSymbol() {
    const symbols = {
      [TileType.BLANK]: '',
      [TileType.SPIKE_TRAP]: '▲',
      [TileType.CAGE_TRAP]: '⚿',
      [TileType.OIL_SLICK_TRAP]: '~',
      [TileType.PUSHBACK_TRAP]: '◄',
      [TileType.BOMB_TRAP]: '💣',
      [TileType.WALL]: '█',
      [TileType.TREASURE]: '💰'
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
