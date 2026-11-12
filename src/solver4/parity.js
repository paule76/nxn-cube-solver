// 4x4 parity on a reduced cube (centres solved, edges paired) and the reduced 3x3 view.
// Inner slices are written as wide and outer turn (r2 = Rw2 R2).
import { createMoveSet, parseMoves } from '../engine/facelets.js';
import { parse3 } from '../puzzles/cube3.js';

const ENGINE = createMoveSet(4);
const ROWS = [0, 1, 3]; // 3x3 row/column -> 4x4 row/column (corner, edge piece, centre)

/** 96 reduced 4x4 facelets -> 54 3x3 facelets (each paired edge and solved centre read once). */
export function toReduced3(f) {
  const out = [];
  for (let side = 0; side < 6; side++) {
    for (const r of ROWS) for (const c of ROWS) out.push(f[side * 16 + r * 4 + c]);
  }
  return out;
}

/** Flips one edge pair (15 moves, wide turns only). */
export const OLL_PARITY = Object.freeze(parseMoves("Rw' U2 Lw F2 Lw' F2 Rw2 U2 Rw U2 Rw' U2 F2 Rw2 F2"));
/** r2 U2 r2 Uw2 r2 Uw2 – swaps the UF and UB edge pairs. */
export const PLL_PARITY = Object.freeze(parseMoves('Rw2 R2 U2 Rw2 R2 Uw2 Rw2 R2 Uw2'));

/**
 * Moves that make the reduced cube a valid 3x3 position.
 * @returns {object[]} [] when there is no parity
 */
export function fixParity(facelets) {
  let f = facelets;
  const out = [];
  for (let k = 0; k < 2; k++) {
    const p = parse3(toReduced3(f));
    if (p.ok) return out;
    const alg = p.code === 'flippedEdge' ? OLL_PARITY : p.code === 'parity' ? PLL_PARITY : null;
    if (!alg) throw new Error(`reduced cube is not a 3x3 position: ${p.code}`);
    f = ENGINE.applyAll(f, alg);
    out.push(...alg);
  }
  if (!parse3(toReduced3(f)).ok) throw new Error('parity could not be fixed');
  return out;
}
