/**
 * Game configuration and setup structures for Dungeon Rush
 */

// Tile types enum
export const TileType = {
  BLANK: 'blank',
  SPIKE_TRAP: 'spike_trap',
  CAGE_TRAP: 'cage_trap',
  OIL_SLICK_TRAP: 'oil_slick_trap',
  PUSHBACK_TRAP: 'pushback_trap',
  BOMB_TRAP: 'bomb_trap',
  WALL: 'wall',
  TREASURE: 'treasure'
};

// Unit types enum
export const UnitType = {
  BASIC: 'basic',
  SPRINTER: 'sprinter',
  JUMPER: 'jumper',
  SCOUT: 'scout',
  BOMBER: 'bomber'
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
  totalPaths: 4, // Number of rows/paths
  
  // Starting conditions
  startingGold: 4,
  goldPerTurn: 4,
  
  // Tile bag composition (36 total tiles)
  tileBag: {
    [TileType.BLANK]: 12,
    [TileType.SPIKE_TRAP]: 6,
    [TileType.CAGE_TRAP]: 4,
    [TileType.OIL_SLICK_TRAP]: 3,
    [TileType.PUSHBACK_TRAP]: 3,
    [TileType.BOMB_TRAP]: 2,
    [TileType.WALL]: 4,
    [TileType.TREASURE]: 2
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
    },
    [UnitType.JUMPER]: {
      summon: 3,
      move: 1
    },
    [UnitType.SCOUT]: {
      summon: 4,
      move: 2
    },
    [UnitType.BOMBER]: {
      summon: 4,
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
    [TileType.SPIKE_TRAP]: 'Spike Trap',
    [TileType.CAGE_TRAP]: 'Cage Trap',
    [TileType.OIL_SLICK_TRAP]: 'Oil Slick Trap',
    [TileType.PUSHBACK_TRAP]: 'Pushback Trap',
    [TileType.BOMB_TRAP]: 'Bomb Trap',
    [TileType.WALL]: 'Wall',
    [TileType.TREASURE]: 'Treasure'
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
    [UnitType.SPRINTER]: 'Sprinter',
    [UnitType.JUMPER]: 'Jumper',
    [UnitType.SCOUT]: 'Scout',
    [UnitType.BOMBER]: 'Bomber'
  };
  return names[unitType] || 'Unknown';
}
