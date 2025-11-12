/**
 * Game configuration and setup structures for Rockfall
 */

// Tile types enum
export const TileType = {
  BLANK: 'blank',
  SPIKES: 'spikes',
  BOULDER: 'boulder'
};

// Unit types enum
export const UnitType = {
  BASIC: 'basic',
  SPRINTER: 'sprinter'
};

// Player phases
export const GamePhase = {
  DEFENSE: 'defense',
  OFFENSE: 'offense'
};

/**
 * Default game configuration
 */
export const DEFAULT_GAME_CONFIG = {
  // Board settings
  totalPaths: 5, // Number of rows/paths
  
  // Starting conditions
  startingGold: 10,
  goldPerTurn: 4,
  
  // Tile bag composition
  tileBag: {
    [TileType.BLANK]: 20,
    [TileType.SPIKES]: 15,
    [TileType.BOULDER]: 10
  },
  
  // Unit costs
  unitCosts: {
    [UnitType.BASIC]: {
      summon: 2,
      move: 1
    },
    [UnitType.SPRINTER]: {
      summon: 3,
      move: 1
    }
  }
};

/**
 * Creates a new game setup with optional overrides
 * @param {Object} overrides - Custom configuration values
 * @param {number} seed - Tile bag seed for reproducibility
 * @returns {Object} Complete game setup
 */
export function createGameSetup(overrides = {}, seed = Date.now()) {
  return {
    ...DEFAULT_GAME_CONFIG,
    ...overrides,
    tileBagSeed: seed,
    // Merge tile bag if partially overridden
    tileBag: {
      ...DEFAULT_GAME_CONFIG.tileBag,
      ...(overrides.tileBag || {})
    },
    // Merge unit costs if partially overridden
    unitCosts: {
      ...DEFAULT_GAME_CONFIG.unitCosts,
      ...(overrides.unitCosts || {})
    }
  };
}

/**
 * Validates a game configuration
 * @param {Object} config - Game configuration to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateGameConfig(config) {
  const errors = [];
  
  if (!config.totalPaths || config.totalPaths < 1) {
    errors.push('totalPaths must be at least 1');
  }
  
  if (config.startingGold < 0) {
    errors.push('startingGold cannot be negative');
  }
  
  if (config.goldPerTurn < 0) {
    errors.push('goldPerTurn cannot be negative');
  }
  
  // Check tile bag has at least enough tiles for one turn
  const totalTiles = Object.values(config.tileBag).reduce((sum, count) => sum + count, 0);
  if (totalTiles < config.totalPaths) {
    errors.push(`tileBag must contain at least ${config.totalPaths} tiles for one turn`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get display name for tile type
 * @param {string} tileType 
 * @returns {string}
 */
export function getTileDisplayName(tileType) {
  const names = {
    [TileType.BLANK]: 'Blank',
    [TileType.SPIKES]: 'Spikes',
    [TileType.BOULDER]: 'Boulder'
  };
  return names[tileType] || 'Unknown';
}

/**
 * Get display name for unit type
 * @param {string} unitType 
 * @returns {string}
 */
export function getUnitDisplayName(unitType) {
  const names = {
    [UnitType.BASIC]: 'Basic',
    [UnitType.SPRINTER]: 'Sprinter'
  };
  return names[unitType] || 'Unknown';
}
