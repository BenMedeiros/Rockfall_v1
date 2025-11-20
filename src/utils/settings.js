/**
 * Settings manager - handles saving/loading user preferences to localStorage
 */

const SETTINGS_KEY = 'dungeonRush_settings';

const DEFAULT_SETTINGS = {
  ui: {
    tileBag: {
      isCollapsed: false
    }
  }
};

export class Settings {
  constructor() {
    this.settings = this.load();
  }

  /**
   * Load settings from localStorage
   * @returns {Object}
   */
  load() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  /**
   * Save settings to localStorage
   */
  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Merge saved settings with defaults
   * @param {Object} saved 
   * @returns {Object}
   */
  mergeWithDefaults(saved) {
    return {
      ui: {
        tileBag: {
          isCollapsed: saved?.ui?.tileBag?.isCollapsed ?? DEFAULT_SETTINGS.ui.tileBag.isCollapsed
        }
      }
    };
  }

  /**
   * Get a setting value
   * @param {string} path - Dot notation path (e.g., 'ui.tileBag.isCollapsed')
   * @returns {*}
   */
  get(path) {
    const keys = path.split('.');
    let value = this.settings;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    return value;
  }

  /**
   * Set a setting value
   * @param {string} path - Dot notation path
   * @param {*} value 
   */
  set(path, value) {
    const keys = path.split('.');
    let obj = this.settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    this.save();
  }

  /**
   * Reset to default settings
   */
  reset() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
  }
}

// Singleton instance
let settingsInstance = null;

export function getSettings() {
  if (!settingsInstance) {
    settingsInstance = new Settings();
  }
  return settingsInstance;
}
