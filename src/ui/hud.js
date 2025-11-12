/**
 * HUD (Heads-Up Display) management
 */
import { getTileDisplayName, getUnitDisplayName, GamePhase } from '../utils/gameConfig.js';

export class HUD {
  constructor(gameState) {
    this.gameState = gameState;
    
    // DOM elements
    this.elements = {
      turnCounter: document.getElementById('turnCounter'),
      phaseIndicator: document.getElementById('phaseIndicator'),
      goldAmount: document.getElementById('goldAmount'),
      goldIncome: document.getElementById('goldIncome'),
      tilesRemainingList: document.getElementById('tilesRemainingList'),
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
    this.elements.goldIncome.textContent = this.gameState.config.goldPerTurn;
  }

  /**
   * Update tiles remaining display
   */
  updateTilesRemaining() {
    const remaining = this.gameState.tileBag.getRemainingCounts();
    const html = Object.entries(remaining)
      .map(([type, count]) => `
        <li>
          <span>${getTileDisplayName(type)}:</span>
          <strong>${count}</strong>
        </li>
      `)
      .join('');
    
    this.elements.tilesRemainingList.innerHTML = html || '<li>No tiles remaining</li>';
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

    const html = tiles.map((tile, index) => {
      const assigned = Array.from(assignments.values()).filter(t => t === tile).length;
      const count = tiles.filter(t => t === tile).length;
      const remaining = count - assigned;
      
      return `
        <div class="draw-tile-item ${remaining === 0 ? 'placed' : ''}" data-tile="${tile}">
          <span>${getTileDisplayName(tile)}</span>
          <span>${remaining > 0 ? remaining : 'Placed'}</span>
        </div>
      `;
    })
    .filter((html, index, arr) => arr.indexOf(html) === index) // Remove duplicates
    .join('');
    
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
}
