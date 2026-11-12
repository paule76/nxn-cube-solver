// 5x5 solver by reduction: centres -> edge pairing (with edge parity) -> solve like a 3x3.
import { createMoveSet } from '../engine/facelets.js';
import { parse3 } from '../puzzles/cube3.js';
import { parse5, isSolved5 } from '../puzzles/cube5.js';
import { mergeMoves } from '../solver4/reduce.js';
import { createCenterSolver5 } from './centers.js';
import { createEdgePairer5 } from './edges.js';

const ENGINE = createMoveSet(5);
const ROWS = [0, 2, 4]; // 3x3 row/column -> 5x5 row/column (corner, midge, fixed centre)

/** 150 reduced 5x5 facelets -> 54 3x3 facelets. */
export function toReduced3from5(f) {
  const out = [];
  for (let side = 0; side < 6; side++) {
    for (const r of ROWS) for (const c of ROWS) out.push(f[side * 25 + r * 5 + c]);
  }
  return out;
}

/**
 * @param {(state3: object, options?: object) => object[]} search3 3x3 solver on the cubie model (outer turns)
 */
export function createSolver5(search3, options = {}) {
  const centers = createCenterSolver5(options);
  const edges = createEdgePairer5();

  /**
   * @param {string[]} facelets 150 colours of a valid 5x5
   * @returns {{ phases: { phase: 'centers'|'edges'|'parity'|'solve3', moves: object[] }[] }}
   */
  function solve(facelets) {
    const parsed = parse5(facelets);
    if (!parsed.ok) throw new Error(`invalid 5x5: ${parsed.code}`);
    const phases = [];
    let f = facelets;
    const run = (phase, raw) => {
      const moves = mergeMoves(raw);
      if (moves.length) phases.push({ phase, moves });
      f = ENGINE.applyAll(f, moves);
    };
    run('centers', centers.solveCenters(f, parsed.scheme));
    const paired = edges.pairEdges(f);
    run('edges', paired.edges);
    run('parity', paired.parity);
    const p3 = parse3(toReduced3from5(f));
    if (!p3.ok) throw new Error(`reduction failed: ${p3.code}`);
    // the 3x3 part need not be near-optimal here: the first solution with at most 22 moves is enough
    run('solve3', search3(p3.state, { minSearchMs: 0, maxLength: 22 }));
    const end = parse5(f);
    if (!end.ok || !isSolved5(end.state)) throw new Error('5x5 solution does not solve the cube');
    return { phases };
  }

  return { solve };
}
