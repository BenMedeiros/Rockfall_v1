/**
 * Seeded random number generator for reproducible randomness
 * Uses a simple LCG (Linear Congruential Generator)
 */
export class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /**
   * Generate next random number between 0 and 1
   * @returns {number} Random number [0, 1)
   */
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Generate random integer between min and max (inclusive)
   * @param {number} min 
   * @param {number} max 
   * @returns {number}
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   * @param {Array} array 
   * @returns {Array} Shuffled array
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Pick random element from array
   * @param {Array} array 
   * @returns {*}
   */
  choice(array) {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Reset seed to initial value
   * @param {number} seed 
   */
  reset(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
}
