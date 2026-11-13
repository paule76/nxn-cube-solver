import { MOVES, SOLVED, applyMoves } from '../src/cube.js';

export function randomMoves(n) {
  return Array.from({ length: n }, () => MOVES[Math.floor(Math.random() * MOVES.length)]);
}

/**
 * Scales a test time limit by CUBE_TIME_FACTOR (e.g. 1.5 on slow machines).
 * Without the variable, or with a value that is not a positive number, the limit is unchanged.
 */
export function timeLimit(ms) {
  const factor = Number(process.env.CUBE_TIME_FACTOR);
  return factor > 0 ? ms * factor : ms;
}

export function randomState(n = 15) {
  return applyMoves(SOLVED, randomMoves(n));
}
