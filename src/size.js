// Which cube size to show: URL hash (#2x2 / #3x3) wins, then the remembered choice, else 3x3.
// Only known sizes are accepted (values come from the URL and localStorage).
import { PUZZLE_IDS } from './puzzles/index.js';

export const SIZE_KEY = 'cube-solver-size';
export const DEFAULT_SIZE = '3x3';

/** @returns {string|null} a known size id or null */
export function sizeFromHash(hash) {
  const id = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
  return PUZZLE_IDS.includes(id) ? id : null;
}

/** @param {{ hash?: string, stored?: string|null }} options */
export function pickSize({ hash, stored } = {}) {
  return sizeFromHash(hash) ?? (PUZZLE_IDS.includes(stored) ? stored : DEFAULT_SIZE);
}
