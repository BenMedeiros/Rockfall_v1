/**
 * Board renderer - Canvas-based rendering for the game board
 */

export class BoardRenderer {
  constructor(canvas, gameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameState = gameState;
    
    // Rendering settings
    this.tileSize = 60;
    this.padding = 10;
    this.endzoneWidth = 80;
    
    // Colors
    this.colors = {
      background: '#1a1a2e',
      grid: '#533483',
      offenseEndzone: '#06d6a0',
      defenseEndzone: '#e94560',
      tileHidden: '#2d3748',
      tileRevealed: '#4a5568',
      highlight: '#ffd166',
      selected: '#06d6a0'
    };
    
    // Mouse interaction
    this.hoveredTile = null;
    this.highlightedTiles = [];
    
    this.resizeCanvas();
  }

  /**
   * Resize canvas to fit board
   */
  resizeCanvas() {
    const dims = this.gameState.board.getDimensions();
    const boardWidth = Math.max(dims.width, 5); // Minimum 5 columns visible
    
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
    const x = Math.floor((pixelX - this.endzoneWidth - this.padding) / this.tileSize);
    const y = Math.floor((pixelY - this.padding) / this.tileSize);
    
    if (this.gameState.board.isValidPosition(x, y)) {
      return { x, y };
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
   * Render the entire board
   */
  render() {
    this.resizeCanvas();
    this.clear();
    this.drawEndzones();
    this.drawGrid();
    this.drawTiles();
    this.drawUnits();
    this.drawHighlights();
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
                     Math.max(this.gameState.board.maxColumn + 1, 5) * this.tileSize;
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
    const width = Math.max(dims.width, 5);
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
      this.drawTile(tile);
    }
  }

  /**
   * Draw a single tile
   * @param {Tile} tile 
   */
  drawTile(tile) {
    const pos = this.getTilePosition(tile.x, tile.y);
    
    // Draw tile background
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
   * Animate tile reveal
   * @param {number} x 
   * @param {number} y 
   */
  animateTileReveal(x, y) {
    // Simple flash animation
    const tile = this.gameState.board.getTile(x, y);
    if (!tile) return;
    
    const pos = this.getTilePosition(x, y);
    
    // Flash effect
    this.ctx.fillStyle = '#ffffff88';
    this.ctx.fillRect(pos.x, pos.y, this.tileSize, this.tileSize);
    
    setTimeout(() => this.render(), 100);
  }

  /**
   * Animate unit movement
   * @param {Unit} unit 
   * @param {number} fromX 
   * @param {number} fromY 
   */
  animateUnitMove(unit, fromX, fromY) {
    // For now, just re-render
    // TODO: Add smooth movement animation
    this.render();
  }
}
