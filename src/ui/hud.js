/**
 * HUD (Heads-Up Display) management
 */
import { getTileDisplayName, getUnitDisplayName, GamePhase, TileType } from '../utils/gameConfig.js';
import { getImageLoader } from '../utils/imageLoader.js';

export class HUD {
  constructor(gameState) {
    this.gameState = gameState;
    this.imageLoader = getImageLoader();
    
    // DOM elements
    this.elements = {
      turnCounter: document.getElementById('turnCounter'),
      phaseIndicator: document.getElementById('phaseIndicator'),
      goldAmount: document.getElementById('goldAmount'),
      goldIncome: document.getElementById('goldIncome'),
      tileBagList: document.getElementById('tileBagList'),
      currentDrawTiles: document.getElementById('currentDrawTiles'),
      unitsRosterList: document.getElementById('unitsRosterList'),
      actionLogContent: document.getElementById('actionLogContent'),
      defensePanel: document.getElementById('defensePanel'),
      offensePanel: document.getElementById('offensePanel')
    };
  }

  /**
   * Update all HUD elements
   */
  updateAll() {
    this.updateTurnInfo();
    this.updatePhaseDisplay();
    this.updateGold();
    this.updateTilesRemaining();
    this.updateUnitsRoster();
    this.updateActionLog();
    this.updateButtonStates();
  }
  
  /**
   * Update button states (enable/disable based on game state)
   */
  updateButtonStates() {
    const isGameOver = this.gameState.isGameOver();
    
    // Disable End Turn buttons when game is over
    document.getElementById('endDefenseTurnBtn').disabled = isGameOver;
    document.getElementById('endOffenseTurnBtn').disabled = isGameOver;
    document.getElementById('autoPlaceBtn').disabled = isGameOver;
    
    // Keep New Game and Replay buttons enabled
  }

  /**
   * Update turn counter
   */
  updateTurnInfo() {
    this.elements.turnCounter.textContent = `Turn: ${this.gameState.turn}`;
  }

  /**
   * Update phase indicator and panel visibility
   */
  updatePhaseDisplay() {
    if (this.gameState.phase === GamePhase.DEFENSE) {
      this.elements.phaseIndicator.textContent = 'Defense Phase';
      this.elements.defensePanel.classList.remove('hidden');
      this.elements.offensePanel.classList.add('hidden');
    } else {
      this.elements.phaseIndicator.textContent = 'Offense Phase';
      this.elements.defensePanel.classList.add('hidden');
      this.elements.offensePanel.classList.remove('hidden');
    }
  }

  /**
   * Update gold display
   */
  updateGold() {
    this.elements.goldAmount.textContent = this.gameState.gold;
    
    // Calculate next turn income (base + units on board)
    const unitsOnBoard = Object.values(this.gameState.units).filter(u => 
      u.alive && u.x > -1 && !u.trapped
    ).length;
    const nextIncome = this.gameState.config.goldPerTurn + unitsOnBoard;
    
    this.elements.goldIncome.textContent = nextIncome;
  }

  /**
   * Update tile bag display
   */
  updateTilesRemaining() {
    const remaining = this.gameState.tileBag.getRemainingCounts();
    const html = Object.entries(remaining)
      .map(([type, count]) => {
        const iconSrc = this.getTileIconSrc(type);
        return `
          <div class="tile-bag-item">
            <img src="${iconSrc}" alt="${type}" class="tile-icon" />
            <span>${getTileDisplayName(type)}:</span>
            <strong>${count}</strong>
          </div>
        `;
      })
      .join('');
    
    this.elements.tileBagList.innerHTML = html || '<p>No tiles remaining</p>';
  }

  /**
   * Update current draw tiles display
   * @param {Array} tiles 
   * @param {Map} assignments - Map of row -> tileType
   */
  updateCurrentDraw(tiles, assignments = new Map()) {
    if (!tiles || tiles.length === 0) {
      this.elements.currentDrawTiles.innerHTML = '<p>No tiles drawn</p>';
      return;
    }

    // Create array with assignment status for each tile
    const assignedSet = new Set(assignments.values());
    const tileItems = [];
    const assignedTiles = [];
    
    tiles.forEach(tileType => {
      const iconSrc = this.getTileIconSrc(tileType);
      tileItems.push({ tileType, iconSrc, assigned: false });
    });
    
    // Mark assigned tiles
    Array.from(assignments.values()).forEach(assignedType => {
      const index = tileItems.findIndex(item => item.tileType === assignedType && !item.assigned);
      if (index !== -1) {
        tileItems[index].assigned = true;
      }
    });

    const html = tileItems.map(({ tileType, iconSrc, assigned }) => {
      return `
        <div class="draw-tile-item ${assigned ? 'placed' : ''}" data-tile="${tileType}">
          <img src="${iconSrc}" alt="${tileType}" class="tile-icon" />
        </div>
      `;
    }).join('');
    
    this.elements.currentDrawTiles.innerHTML = html;
  }

  /**
   * Update units roster display
   */
  updateUnitsRoster() {
    const units = Object.entries(this.gameState.units);
    const config = this.gameState.config;
    
    const html = units.map(([type, unit]) => {
      const spawnCost = unit.getSpawnCost(config);
      const moveCost = unit.getMoveCost(config);
      const canSpawn = !unit.alive && unit.canRespawn && this.gameState.gold >= spawnCost;
      const canMove = unit.alive && !unit.trapped && this.gameState.gold >= moveCost;
      
      let statusClass = '';
      let statusText = '';
      
      if (unit.alive) {
        statusClass = 'available';
        statusText = `Active (${unit.x}, ${unit.y})`;
      } else if (unit.canRespawn) {
        statusClass = 'available';
        statusText = 'Can spawn';
      } else {
        statusClass = 'dead';
        statusText = 'Dead (wait 1 turn)';
      }
      
      return `
        <div class="unit-card ${statusClass}" data-unit-type="${type}">
          <div class="unit-card-header">
            <span class="unit-name">${getUnitDisplayName(type)}</span>
            <span class="unit-status">${statusText}</span>
          </div>
          <div class="unit-actions">
            <button class="btn-spawn" 
                    data-unit-type="${type}" 
                    ${!canSpawn ? 'disabled' : ''}>
              Spawn (${spawnCost}g)
            </button>
            <button class="btn-move" 
                    data-unit-type="${type}" 
                    ${!canMove ? 'disabled' : ''}>
              Move (${moveCost}g)
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.unitsRosterList.innerHTML = html;
  }

  /**
   * Update action log
   */
  updateActionLog() {
    const events = this.gameState.getRecentEvents(15);
    
    const html = events.map(event => `
      <div class="log-entry ${event.type}">
        ${event.message}
      </div>
    `).join('');
    
    this.elements.actionLogContent.innerHTML = html;
    
    // Scroll to bottom
    this.elements.actionLogContent.scrollTop = this.elements.actionLogContent.scrollHeight;
  }

  /**
   * Show game over message
   * @param {string} winner 
   */
  showGameOver(winner) {
    const message = winner === 'offense' 
      ? 'Offense wins! A unit reached the defense endzone!'
      : 'Defense wins! Offense ran out of tiles!';
    
    this.gameState.logEvent(message, winner);
    this.updateActionLog();
    
    // Show alert
    setTimeout(() => {
      alert(message);
    }, 500);
  }

  /**
   * Clear current draw display
   */
  clearCurrentDraw() {
    this.elements.currentDrawTiles.innerHTML = '<p>No tiles drawn</p>';
  }

  /**
   * Get tile icon source path
   * @param {string} tileType 
   * @returns {string}
   */
  getTileIconSrc(tileType) {
    const images = {
      [TileType.BLANK]: 'img/empty.png',
      [TileType.SPIKE_TRAP]: 'img/trap_spikes.png',
      [TileType.CAGE_TRAP]: 'img/trap_cage.png',
      [TileType.OIL_SLICK_TRAP]: 'img/trap_oilslick.png',
      [TileType.PUSHBACK_TRAP]: 'img/trap_pushback.png',
      [TileType.BOMB_TRAP]: 'img/trap_bomb.png',
      [TileType.WALL]: 'img/wall.png',
      [TileType.TREASURE]: 'img/treasure.png'
    };
    return images[tileType] || 'img/empty.png';
  }
}
