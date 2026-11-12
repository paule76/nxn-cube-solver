import { MOVES } from './cube.js';

const OPPOSITE = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

/**
 * Random move sequence for practice. Never turns the same face twice in a row and never
 * "X, opposite of X, X" (e.g. R L R), so no moves cancel or merge.
 * @param {number} [length=12]
 * @param {() => number} [rng=Math.random] returns numbers in [0, 1)
 * @param {object[]} [pool=MOVES] allowed move objects (default: the 2x2's U/R/F moves)
 */
export function randomScramble(length = 12, rng = Math.random, pool = MOVES) {
  const faceOrder = [...new Set(pool.map((m) => m.face))];
  const moves = [];
  for (let i = 0; i < length; i++) {
    const last = moves[i - 1]?.face;
    const beforeLast = moves[i - 2]?.face;
    const faces = faceOrder.filter(
      (f) => f !== last && !(OPPOSITE[f] === last && f === beforeLast),
    );
    const face = faces[Math.floor(rng() * faces.length)];
    const options = pool.filter((m) => m.face === face); // all turns (and depths) of that face
    moves.push(options[Math.floor(rng() * options.length)]);
  }
  return moves;
}
