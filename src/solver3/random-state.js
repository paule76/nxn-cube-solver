// Uniformly random solvable 3x3 states, and inverting move sequences.
import { ALL_MOVES } from '../engine/facelets.js';

function shuffle(n, rng) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parity(p) {
  let inv = 0;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) inv++;
  return inv % 2;
}

/** @param {() => number} [rng=Math.random] */
export function randomState(rng = Math.random) {
  const cp = shuffle(8, rng);
  const ep = shuffle(12, rng);
  if (parity(cp) !== parity(ep)) [ep[10], ep[11]] = [ep[11], ep[10]];
  const co = Array.from({ length: 8 }, () => Math.floor(rng() * 3));
  co[7] = (3 - (co.slice(0, 7).reduce((a, b) => a + b, 0) % 3)) % 3;
  const eo = Array.from({ length: 12 }, () => Math.floor(rng() * 2));
  eo[11] = eo.slice(0, 11).reduce((a, b) => a + b, 0) % 2;
  return { cp, co, ep, eo };
}

/** Reverses a move sequence (R U2 F' → F U2 R'). */
export function inverseMoves(moves) {
  return [...moves]
    .reverse()
    .map((m) => ALL_MOVES.find((x) => x.face === m.face && x.turns === (m.turns === 2 ? 2 : -m.turns)));
}
