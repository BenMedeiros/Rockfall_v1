/**
 * Image loader utility for tile and unit images
 */

export class ImageLoader {
  constructor() {
    this.images = new Map();
    this.loaded = false;
    this.loadPromise = null;
  }

  /**
   * Load all game images
   * @returns {Promise}
   */
  async loadImages() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const imageFiles = [
      // Tile images
      'empty.png',
      'trap_spikes.png',
      'trap_cage.png',
      'trap_oilslick.png',
      'trap_pushback.png',
      'trap_bomb.png',
      'wall.png',
      'treasure.png',
      // Cover images for face-down tiles
      'dungeonrush_cover1.png',
      'dungeonrush_cover2.png'
    ];

    this.loadPromise = Promise.all(
      imageFiles.map(filename => this._loadImage(filename))
    ).then(() => {
      this.loaded = true;
      console.log('All images loaded successfully');
    }).catch(error => {
      console.error('Error loading images:', error);
      throw error;
    });

    return this.loadPromise;
  }

  /**
   * Load a single image
   * @param {string} filename 
   * @returns {Promise}
   */
  _loadImage(filename) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(filename, img);
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${filename}`));
      };
      img.src = `img/${filename}`;
    });
  }

  /**
   * Get an image by filename
   * @param {string} filename 
   * @returns {Image|null}
   */
  getImage(filename) {
    return this.images.get(filename) || null;
  }

  /**
   * Get a random cover image for face-down tiles
   * @returns {Image|null}
   */
  getRandomCoverImage() {
    const covers = ['dungeonrush_cover1.png', 'dungeonrush_cover2.png'];
    const randomCover = covers[Math.floor(Math.random() * covers.length)];
    return this.getImage(randomCover);
  }

  /**
   * Check if all images are loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }
}

// Singleton instance
let imageLoaderInstance = null;

/**
 * Get the singleton image loader instance
 * @returns {ImageLoader}
 */
export function getImageLoader() {
  if (!imageLoaderInstance) {
    imageLoaderInstance = new ImageLoader();
  }
  return imageLoaderInstance;
}
