/**
 * Board renderer - Canvas-based rendering for the game board
 */
import { getImageLoader } from '../utils/imageLoader.js';

export class BoardRenderer {
  constructor(canvas, gameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameState = gameState;
    this.imageLoader = getImageLoader();
    
    // Cache for tile cover assignments (so each tile consistently shows cover1 or cover2)
    this.tileCoverCache = new Map();
    
    // Rendering settings
    this.tileSize = 120;
    this.padding = 20;
    this.endzoneWidth = 160;
    
    // Colors
    this.colors = {
      background: '#1a1a2e',
      grid: '#533483',
      offenseEndzone: '#06d6a0',
      defenseEndzone: '#e94560',
      tileHidden: '#2d3748',
      tileRevealed: '#4a5568',
      highlight: '#ffd166',
      selected: '#06d6a0',
      preview: '#4a5568'
    };
    
    // Mouse interaction
    this.hoveredTile = null;
    this.highlightedTiles = [];
    
    // Preview tiles for defense placement
    this.previewTiles = new Map(); // row -> tileType
    
    // Cursor tile (tile being held)
    this.cursorTile = null;
    this.cursorPos = { x: 0, y: 0 };
    
    this.resizeCanvas();
  }

  /**
   * Resize canvas to fit board
   */
  resizeCanvas() {
    const dims = this.gameState.board.getDimensions();
    const boardWidth = Math.max(dims.width, 1); // Show at least 1 column
    
    this.canvas.width = this.endzoneWidth * 2 + boardWidth * this.tileSize + this.padding * 2;
    this.canvas.height = this.gameState.config.totalPaths * this.tileSize + this.padding * 2;
  }

  /**
   * Get tile position in pixels
   * @param {number} x 
   * @param {number} y 
   * @returns {Object} { x, y }
   */
  getTilePosition(x, y) {
    // Handle offense endzone (x=-1)
    if (x === -1) {
      return {
        x: this.endzoneWidth / 2 - this.tileSize / 2,
        y: this.padding + y * this.tileSize
      };
    }
    
    // Regular board tiles (x >= 0)
    return {
      x: this.endzoneWidth + this.padding + x * this.tileSize,
      y: this.padding + y * this.tileSize
    };
  }

  /**
   * Get tile coordinates from pixel position
   * @param {number} pixelX 
   * @param {number} pixelY 
   * @returns {Object|null} { x, y }
   */
  getTileFromPixel(pixelX, pixelY) {
    const y = Math.floor((pixelY - this.padding) / this.tileSize);
    
    // Check if within valid y range
    if (y >= 0 && y < this.gameState.config.totalPaths) {
      // Check if clicking in offense endzone (spawn area)
      if (pixelX >= 0 && pixelX < this.endzoneWidth) {
        return { x: -1, y: y }; // Spawn area
      }
      
      // Check board tiles and defense endzone
      const x = Math.floor((pixelX - this.endzoneWidth - this.padding) / this.tileSize);
      if (x >= 0) {
        if (this.gameState.board.isValidPosition(x, y) || 
            this.gameState.board.isDefenseEndzone(x)) {
          return { x, y };
        }
      }
    }
    
    return null;
  }

  /**
   * Set hovered tile
   * @param {number} x 
   * @param {number} y 
   */
  setHoveredTile(x, y) {
    this.hoveredTile = { x, y };
  }

  /**
   * Clear hovered tile
   */
  clearHoveredTile() {
    this.hoveredTile = null;
  }

  /**
   * Set highlighted tiles (for valid moves)
   * @param {Array} tiles - Array of {x, y}
   */
  setHighlightedTiles(tiles) {
    this.highlightedTiles = tiles;
  }

  /**
   * Clear highlighted tiles
   */
  clearHighlightedTiles() {
    this.highlightedTiles = [];
  }

  /**
   * Set preview tiles for defense placement
   * @param {Map} tiles - Map of row -> tileType
   */
  setPreviewTiles(tiles) {
    this.previewTiles = tiles;
  }

  /**
   * Clear preview tiles
   */
  clearPreviewTiles() {
    this.previewTiles = new Map();
  }

  /**
   * Set cursor tile (tile being held)
   * @param {string} tileType 
   */
  setCursorTile(tileType) {
    this.cursorTile = tileType;
  }

  /**
   * Clear cursor tile
   */
  clearCursorTile() {
    this.cursorTile = null;
  }

  /**
   * Update cursor position
   * @param {number} x 
   * @param {number} y 
   */
  updateCursorPosition(x, y) {
    this.cursorPos = { x, y };
  }

  /**
   * Render the entire board
   */
  render() {
    this.resizeCanvas();
    this.clear();
    this.drawEndzones();
    this.drawGrid();
    this.drawTiles();
    this.drawPreviewTiles();
    this.drawUnits();
    this.drawHighlights();
    this.drawCursorTile();
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw offense and defense endzones
   */
  drawEndzones() {
    const height = this.gameState.config.totalPaths * this.tileSize;
    
    // Offense endzone (left)
    this.ctx.fillStyle = this.colors.offenseEndzone + '40';
    this.ctx.fillRect(0, this.padding, this.endzoneWidth, height);
    this.ctx.strokeStyle = this.colors.offenseEndzone;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, this.padding, this.endzoneWidth, height);
    
    // Offense label
    this.ctx.fillStyle = this.colors.offenseEndzone;
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('OFFENSE', this.endzoneWidth / 2, this.padding + height / 2);
    
    // Defense endzone (right)
    const defenseX = this.endzoneWidth + this.padding + 
                     Math.max(this.gameState.board.maxColumn + 1, 1) * this.tileSize;
    this.ctx.fillStyle = this.colors.defenseEndzone + '40';
    this.ctx.fillRect(defenseX, this.padding, this.endzoneWidth, height);
    this.ctx.strokeStyle = this.colors.defenseEndzone;
    this.ctx.strokeRect(defenseX, this.padding, this.endzoneWidth, height);
    
    // Defense label
    this.ctx.fillStyle = this.colors.defenseEndzone;
    this.ctx.fillText('DEFENSE', defenseX + this.endzoneWidth / 2, this.padding + height / 2);
  }

  /**
   * Draw grid lines
   */
  drawGrid() {
    const dims = this.gameState.board.getDimensions();
    const width = Math.max(dims.width, 1); // Show at least 1 column worth of grid
    const height = this.gameState.config.totalPaths;
    
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= width; x++) {
      const pos = this.getTilePosition(x, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, this.padding);
      this.ctx.lineTo(pos.x, this.padding + height * this.tileSize);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      const pos = this.getTilePosition(0, y);
      this.ctx.beginPath();
      this.ctx.moveTo(this.endzoneWidth + this.padding, pos.y);
      this.ctx.lineTo(this.endzoneWidth + this.padding + width * this.tileSize, pos.y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw all tiles
   */
  drawTiles() {
    const tiles = this.gameState.board.getAllTiles();
    
    for (const tile of tiles) {
      if (tile !== null) {
        this.drawTile(tile);
      }
    }
  }

  /**
   * Draw preview tiles (defense placement)
   */
  drawPreviewTiles() {
    const nextColumn = this.gameState.board.maxColumn + 1;
    
    for (const [row, tileType] of this.previewTiles.entries()) {
      const pos = this.getTilePosition(nextColumn, row);
      
      // Draw semi-transparent tile
      this.ctx.globalAlpha = 0.7;
      
      if (this.imageLoader.isLoaded()) {
        // Get tile image based on type
        const imageMap = {
          'blank': 'empty.png',
          'spike_trap': 'trap_spikes.png',
          'cage_trap': 'trap_cage.png',
          'oil_slick_trap': 'trap_oilslick.png',
          'pushback_trap': 'trap_pushback.png',
          'bomb_trap': 'trap_bomb.png',
          'wall': 'wall.png',
          'treasure': 'treasure.png'
        };
        const imageName = imageMap[tileType] || 'empty.png';
        const image = this.imageLoader.getImage(imageName);
        
        if (image) {
          this.ctx.drawImage(image, pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        } else {
          // Fallback to color
          const colors = {
            'blank': '#4a5568',
            'spike_trap': '#ef476f',
            'cage_trap': '#8b4513',
            'oil_slick_trap': '#2c1810',
            'pushback_trap': '#f97316',
            'bomb_trap': '#dc2626',
            'wall': '#6b7280',
            'treasure': '#fbbf24'
          };
          const color = colors[tileType] || '#4a5568';
          this.ctx.fillStyle = color;
          this.ctx.fillRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        }
      } else {
        // Fallback rendering if images not loaded
        const colors = {
          'blank': '#4a5568',
          'spike_trap': '#ef476f',
          'cage_trap': '#8b4513',
          'oil_slick_trap': '#2c1810',
          'pushback_trap': '#f97316',
          'bomb_trap': '#dc2626',
          'wall': '#6b7280',
          'treasure': '#fbbf24'
        };
        const color = colors[tileType] || '#4a5568';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        
        // Draw tile symbol
        const symbols = {
          'blank': '',
          'spike_trap': '▲',
          'cage_trap': '⚿',
          'oil_slick_trap': '~',
          'pushback_trap': '◄',
          'bomb_trap': '💣',
          'wall': '█',
          'treasure': '💰'
        };
        const symbol = symbols[tileType] || '?';
        
        if (symbol) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 24px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(symbol, pos.x + this.tileSize / 2, pos.y + this.tileSize / 2);
        }
      }
      
      // Draw border to show it's a preview
      this.ctx.strokeStyle = this.colors.preview;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
      
      this.ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Get cover image for a tile (consistent per tile)
   * @param {Tile} tile 
   * @returns {string} Cover image filename
   */
  getTileCover(tile) {
    const key = `${tile.x},${tile.y}`;
    if (!this.tileCoverCache.has(key)) {
      // Randomly assign cover1 or cover2
      const cover = Math.random() < 0.5 ? 'dungeonrush_cover1.png' : 'dungeonrush_cover2.png';
      this.tileCoverCache.set(key, cover);
    }
    return this.tileCoverCache.get(key);
  }

  /**
   * Draw a single tile
   * @param {Tile} tile 
   */
  drawTile(tile) {
    if (!tile) return;
    
    const pos = this.getTilePosition(tile.x, tile.y);
    
    if (this.imageLoader.isLoaded()) {
      // Draw tile using images
      if (tile.revealed) {
        // Draw revealed tile image
        const imageName = tile.getImageName();
        const image = this.imageLoader.getImage(imageName);
        if (image) {
          this.ctx.drawImage(image, pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        } else {
          // Fallback to color if image not found
          this.ctx.fillStyle = tile.getColor();
          this.ctx.fillRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        }
      } else {
        // Draw face-down tile with cover image
        const coverName = this.getTileCover(tile);
        const coverImage = this.imageLoader.getImage(coverName);
        if (coverImage) {
          this.ctx.drawImage(coverImage, pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        } else {
          // Fallback to gray if cover not found
          this.ctx.fillStyle = this.colors.tileHidden;
          this.ctx.fillRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
        }
      }
    } else {
      // Fallback rendering if images not loaded
      if (tile.revealed) {
        this.ctx.fillStyle = tile.getColor();
      } else {
        this.ctx.fillStyle = this.colors.tileHidden;
      }
      
      this.ctx.fillRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
      
      // Draw tile symbol if revealed
      if (tile.revealed) {
        const symbol = tile.getSymbol();
        if (symbol) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 24px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(symbol, pos.x + this.tileSize / 2, pos.y + this.tileSize / 2);
        }
      } else {
        // Draw question mark for hidden tiles
        this.ctx.fillStyle = '#666';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('?', pos.x + this.tileSize / 2, pos.y + this.tileSize / 2);
      }
    }
  }

  /**
   * Draw all units
   */
  drawUnits() {
    const units = this.gameState.getAliveUnits();
    
    for (const unit of units) {
      this.drawUnit(unit);
    }
  }

  /**
   * Draw a single unit
   * @param {Unit} unit 
   */
  drawUnit(unit) {
    const pos = this.getTilePosition(unit.x, unit.y);
    const centerX = pos.x + this.tileSize / 2;
    const centerY = pos.y + this.tileSize / 2;
    const radius = this.tileSize / 3;
    
    // Draw unit circle
    this.ctx.fillStyle = unit.getColor();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw unit symbol
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(unit.getSymbol(), centerX, centerY);
    
    // Draw border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Draw highlights (hover, valid moves)
   */
  drawHighlights() {
    // Draw highlighted tiles (valid moves)
    for (const tile of this.highlightedTiles) {
      const pos = this.getTilePosition(tile.x, tile.y);
      this.ctx.strokeStyle = this.colors.highlight;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
    }
    
    // Draw hovered tile
    if (this.hoveredTile) {
      const pos = this.getTilePosition(this.hoveredTile.x, this.hoveredTile.y);
      this.ctx.strokeStyle = this.colors.selected;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(pos.x + 2, pos.y + 2, this.tileSize - 4, this.tileSize - 4);
    }
  }

  /**
   * Draw cursor tile (tile being held)
   */
  drawCursorTile() {
    if (!this.cursorTile) return;
    
    const size = 40;
    const x = this.cursorPos.x - size / 2;
    const y = this.cursorPos.y - size / 2;
    
    if (this.imageLoader.isLoaded()) {
      // Get tile image based on type
      const imageMap = {
        'blank': 'empty.png',
        'spike_trap': 'trap_spikes.png',
        'cage_trap': 'trap_cage.png',
        'oil_slick_trap': 'trap_oilslick.png',
        'pushback_trap': 'trap_pushback.png',
        'bomb_trap': 'trap_bomb.png',
        'wall': 'wall.png',
        'treasure': 'treasure.png'
      };
      const imageName = imageMap[this.cursorTile] || 'empty.png';
      const image = this.imageLoader.getImage(imageName);
      
      if (image) {
        this.ctx.drawImage(image, x, y, size, size);
      } else {
        // Fallback to color
        const colors = {
          'blank': '#4a5568',
          'spike_trap': '#ef476f',
          'cage_trap': '#8b4513',
          'oil_slick_trap': '#2c1810',
          'pushback_trap': '#f97316',
          'bomb_trap': '#dc2626',
          'wall': '#6b7280',
          'treasure': '#fbbf24'
        };
        const color = colors[this.cursorTile] || '#4a5568';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, size, size);
      }
    } else {
      // Fallback rendering if images not loaded
      const colors = {
        'blank': '#4a5568',
        'spike_trap': '#ef476f',
        'cage_trap': '#8b4513',
        'oil_slick_trap': '#2c1810',
        'pushback_trap': '#f97316',
        'bomb_trap': '#dc2626',
        'wall': '#6b7280',
        'treasure': '#fbbf24'
      };
      const symbols = {
        'blank': '',
        'spike_trap': '▲',
        'cage_trap': '⚿',
        'oil_slick_trap': '~',
        'pushback_trap': '◄',
        'bomb_trap': '💣',
        'wall': '█',
        'treasure': '💰'
      };
      
      const color = colors[this.cursorTile] || '#4a5568';
      const symbol = symbols[this.cursorTile] || '?';
      
      // Draw tile
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, size, size);
      
      // Draw symbol
      if (symbol) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(symbol, x + size / 2, y + size / 2);
      }
    }
    
    // Draw border
    this.ctx.strokeStyle = this.colors.preview;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, size, size);
  }

  /**
   * Animate tile reveal with flip effect
   * @param {number} x 
   * @param {number} y 
   * @param {Function} callback - Called after animation completes
   */
  animateTileReveal(x, y, callback) {
    const tile = this.gameState.board.getTile(x, y);
    if (!tile) {
      if (callback) callback();
      return;
    }
    
    const duration = 400;
    const startTime = Date.now();
    const pos = this.getTilePosition(x, y);
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Render board normally
      this.render();
      
      // Flip animation: create 3D effect by showing cover and revealed tile back-to-back
      const halfDuration = duration / 2;
      let scaleX;
      let showCover;
      
      if (elapsed < halfDuration) {
        // First half: shrink from 1 to 0 (showing cover front)
        scaleX = 1 - (elapsed / halfDuration);
        showCover = true;
      } else {
        // Second half: expand from 0 to 1 (showing revealed back)
        scaleX = (elapsed - halfDuration) / halfDuration;
        showCover = false;
      }
      
      // Draw the flipping tile with 3D perspective
      this.ctx.save();
      
      // Translate to center of tile
      const centerX = pos.x + this.tileSize / 2;
      const centerY = pos.y + this.tileSize / 2;
      this.ctx.translate(centerX, centerY);
      
      // For back-to-back effect: flip horizontally when showing back
      if (!showCover) {
        this.ctx.scale(-scaleX, 1); // Mirror the revealed tile
      } else {
        this.ctx.scale(scaleX, 1);
      }
      
      this.ctx.translate(-centerX, -centerY);
      
      if (showCover) {
        // Show cover during first half
        const coverName = this.getTileCover(tile);
        const coverImage = this.imageLoader.getImage(coverName);
        if (coverImage && coverImage.complete) {
          this.ctx.drawImage(coverImage, pos.x, pos.y, this.tileSize, this.tileSize);
        } else {
          // Fallback to gray
          this.ctx.fillStyle = '#4a5568';
          this.ctx.fillRect(pos.x, pos.y, this.tileSize, this.tileSize);
        }
      } else {
        // Show revealed tile during second half (back side)
        const imageName = tile.getImageName();
        const image = this.imageLoader.getImage(imageName);
        if (image && image.complete) {
          this.ctx.drawImage(image, pos.x, pos.y, this.tileSize, this.tileSize);
        } else {
          this.ctx.fillStyle = tile.getColor();
          this.ctx.fillRect(pos.x, pos.y, this.tileSize, this.tileSize);
        }
      }
      
      this.ctx.restore();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        this.render();
        if (callback) callback();
      }
    };
    
    animate();
  }

  /**
   * Animate unit movement
   * @param {Unit} unit 
   * @param {number} fromX - Starting grid X
   * @param {number} fromY - Starting grid Y
   * @param {number} toX - Target grid X
   * @param {number} toY - Target grid Y
   * @param {Function} callback - Called after animation completes
   */
  animateUnitMove(unit, fromX, fromY, toX, toY, callback) {
    console.log(`Animating unit from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    
    const moveDuration = 2000; // 2 full seconds for movement
    const pixelsPerFrame = 3; // Move 3 pixels per frame at 60fps
    
    // Get pixel positions using the same logic as getTilePosition
    const startPos = this.getTilePosition(fromX, fromY);
    const endPos = this.getTilePosition(toX, toY);
    const startPixelX = startPos.x;
    const startPixelY = startPos.y;
    const endPixelX = endPos.x;
    const endPixelY = endPos.y;
    
    console.log(`Pixel animation: (${startPixelX}, ${startPixelY}) -> (${endPixelX}, ${endPixelY})`);
    
    // Calculate total distance
    const deltaX = endPixelX - startPixelX;
    const deltaY = endPixelY - startPixelY;
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    console.log(`Total distance: ${totalDistance} pixels`);
    
    // If no movement, just callback immediately
    if (totalDistance === 0) {
      console.log('No movement needed, calling callback');
      this.render();
      if (callback) callback();
      return;
    }
    
    // Calculate direction
    const dirX = deltaX / totalDistance;
    const dirY = deltaY / totalDistance;
    
    let traveledDistance = 0;
    let frameCount = 0;
    
    const animate = () => {
      frameCount++;
      // Move by pixels per frame
      traveledDistance += pixelsPerFrame;
      const progress = Math.min(traveledDistance / totalDistance, 1);
      
      if (frameCount % 20 === 0) {
        console.log(`Frame ${frameCount}: progress = ${progress.toFixed(2)}, traveled = ${traveledDistance.toFixed(0)}`);
      }
      
      // Linear movement for consistent speed
      const currentPixelX = startPixelX + deltaX * progress;
      const currentPixelY = startPixelY + deltaY * progress;
      
      // Render the board normally (without the moving unit at its final position)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw background
      this.ctx.fillStyle = '#1a202c';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw all tiles
      this.drawTiles();
      
      // Draw all units except the one being animated (at its final position)
      for (const unitType in this.gameState.units) {
        const u = this.gameState.units[unitType];
        if (u && u.alive && u !== unit) {
          this.drawUnit(u);
        }
      }
      
      // Draw the moving unit at its interpolated position
      if (unit && unit.alive) {
        this.ctx.fillStyle = unit.owner === 'offense' ? '#3b82f6' : '#ef4444';
        this.ctx.fillRect(
          currentPixelX + 10,
          currentPixelY + 10,
          this.tileSize - 20,
          this.tileSize - 20
        );
        
        // Unit label
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          unit.type.substring(0, 1).toUpperCase(),
          currentPixelX + this.tileSize / 2,
          currentPixelY + this.tileSize / 2
        );
      }
      
      // Draw highlights and endzones
      this.drawHighlights();
      this.drawEndzones();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete, render final state
        console.log(`Animation complete after ${frameCount} frames`);
        this.render();
        if (callback) callback();
      }
    };
    
    console.log('Starting animation...');
    requestAnimationFrame(animate);
  }

  /**
   * Animate bomb explosion
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {Array} affectedPositions - Tiles that will be destroyed
   * @param {Function} callback - Called after animation completes
   */
  animateExplosion(x, y, affectedPositions, callback) {
    const duration = 800; // Total animation duration
    const startTime = Date.now();
    
    // Create particles for each affected tile
    const particles = [];
    affectedPositions.forEach(pos => {
      const tilePos = this.getTilePosition(pos.x, pos.y);
      const centerX = tilePos.x + this.tileSize / 2;
      const centerY = tilePos.y + this.tileSize / 2;
      
      // Create 8 particles per tile
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 6,
          color: Math.random() > 0.5 ? '#ff6b35' : '#f7931e'
        });
      }
    });
    
    const explosionCenter = this.getTilePosition(x, y);
    const centerX = explosionCenter.x + this.tileSize / 2;
    const centerY = explosionCenter.y + this.tileSize / 2;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Render the board normally
      this.render();
      
      // Draw shockwave expanding from center
      if (progress < 0.4) {
        const shockProgress = progress / 0.4;
        const shockRadius = shockProgress * this.tileSize * 2.5;
        const shockAlpha = 1 - shockProgress;
        
        // Outer ring
        this.ctx.strokeStyle = `rgba(255, 200, 50, ${shockAlpha * 0.8})`;
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, shockRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner glow
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, shockRadius);
        gradient.addColorStop(0, `rgba(255, 255, 200, ${shockAlpha * 0.6})`);
        gradient.addColorStop(0.5, `rgba(255, 150, 50, ${shockAlpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, shockRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Draw affected tiles with destruction effect
      affectedPositions.forEach(pos => {
        const tilePos = this.getTilePosition(pos.x, pos.y);
        
        // Flash white at start, then fade to red/orange
        let tileAlpha;
        let color;
        if (progress < 0.2) {
          // Initial white flash
          const flashProgress = progress / 0.2;
          tileAlpha = 1 - flashProgress;
          color = `rgba(255, 255, 255, ${tileAlpha})`;
        } else {
          // Fade out with fire colors
          const fadeProgress = (progress - 0.2) / 0.8;
          tileAlpha = 1 - fadeProgress;
          color = `rgba(255, ${Math.floor(100 - fadeProgress * 50)}, 50, ${tileAlpha * 0.7})`;
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(tilePos.x, tilePos.y, this.tileSize, this.tileSize);
      });
      
      // Update and draw particles
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.15; // Gravity
        particle.vx *= 0.98; // Air resistance
        
        const particleAlpha = 1 - progress;
        this.ctx.fillStyle = particle.color.replace(')', `, ${particleAlpha})`);
        this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        if (callback) callback();
      }
    };
    
    animate();
  }

  /**
   * Animate tiles sliding left after destruction
   * @param {Map} positionMap - Map of old positions to new positions
   * @param {Function} callback - Called after animation completes
   */
  animateTileSlide(positionMap, callback) {
    if (positionMap.size === 0) {
      if (callback) callback();
      return;
    }
    
    const duration = 500; // Animation duration
    const startTime = Date.now();
    
    // Store original positions
    const animations = [];
    for (const [oldKey, newPos] of positionMap.entries()) {
      const [oldX, oldY] = oldKey.split(',').map(Number);
      if (oldX !== newPos.x) {
        animations.push({
          tile: this.gameState.board.getTile(newPos.x, newPos.y),
          fromX: oldX,
          toX: newPos.x,
          y: newPos.y
        });
      }
    }
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Render base board
      this.clearCanvas();
      this.drawEndzones();
      this.drawGrid();
      
      // Draw static tiles first (ones not moving)
      this.gameState.board.forEachTile((tile, x, y) => {
        const key = `${x},${y}`;
        // Check if this tile is being animated
        const isAnimating = animations.some(anim => anim.tile === tile);
        if (!isAnimating && tile) {
          const pos = this.getTilePosition(x, y);
          this.drawTileAt(tile, pos.x, pos.y, this.tileSize);
        }
      });
      
      // Draw moving tiles at interpolated positions
      animations.forEach(anim => {
        const currentX = anim.fromX + (anim.toX - anim.fromX) * eased;
        const pos = this.getTilePosition(currentX, anim.y);
        
        if (anim.tile) {
          // Draw with slight fade/scale effect during movement
          this.ctx.save();
          const scale = 1 - (Math.sin(progress * Math.PI) * 0.05); // Slight bounce
          this.ctx.translate(pos.x + this.tileSize / 2, pos.y + this.tileSize / 2);
          this.ctx.scale(scale, scale);
          this.ctx.translate(-(pos.x + this.tileSize / 2), -(pos.y + this.tileSize / 2));
          
          this.drawTileAt(anim.tile, pos.x, pos.y, this.tileSize);
          this.ctx.restore();
        }
      });
      
      // Draw units
      this.drawUnits();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete, render normally
        this.render();
        if (callback) callback();
      }
    };
    
    animate();
  }

  /**
   * Draw a tile at a specific pixel position
   * @param {Tile} tile 
   * @param {number} x - Pixel X
   * @param {number} y - Pixel Y
   * @param {number} size - Tile size
   */
  drawTileAt(tile, x, y, size) {
    if (!tile.revealed) {
      // Face-down tile
      const coverName = this.getTileCover(tile);
      const coverImage = this.imageLoader.getImage(coverName);
      if (coverImage && coverImage.complete) {
        this.ctx.drawImage(coverImage, x, y, size, size);
      } else {
        // Fallback
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(x, y, size, size);
      }
    } else {
      // Face-up tile
      const imageName = tile.getImageName();
      if (imageName) {
        const image = this.imageLoader.getImage(imageName);
        if (image && image.complete) {
          this.ctx.drawImage(image, x, y, size, size);
        } else {
          // Fallback
          this.ctx.fillStyle = tile.getColor();
          this.ctx.fillRect(x, y, size, size);
        }
      } else {
        this.ctx.fillStyle = tile.getColor();
        this.ctx.fillRect(x, y, size, size);
      }
    }
    
    // Border
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, size, size);
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

