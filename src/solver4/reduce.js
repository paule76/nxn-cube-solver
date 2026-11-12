// 4x4 solver by reduction: centres -> edge pairing -> parity -> solve like a 3x3.
import { createMoveSet, movesFor } from '../engine/facelets.js';
import { parse3 } from '../puzzles/cube3.js';
import { parse4, isSolved4 } from '../puzzles/cube4.js';
import { createCenterSolver } from './centers.js';
import { createEdgePairer } from './edges.js';
import { fixParity, toReduced3 } from './parity.js';

const ENGINE = createMoveSet(4);
const MOVES = movesFor(4);

/** Joins neighbouring turns of the same layer (R R -> R2, R R' -> nothing). */
export function mergeMoves(moves) {
  const out = [];
  for (const m of moves) {
    const last = out[out.length - 1];
    if (last && last.face === m.face && (last.depth ?? 1) === (m.depth ?? 1)) {
      const t = (((last.turns + m.turns) % 4) + 4) % 4;
      out.pop();
      if (t) out.push(MOVES.find((x) => x.face === m.face && (x.depth ?? 1) === (m.depth ?? 1) && x.turns === (t === 3 ? -1 : t)));
    } else out.push(m);
  }
  return out;
}

/**
 * @param {(state3: object) => object[]} search3 3x3 solver on the cubie model (outer turns)
 */
export function createSolver4(search3) {
  const centers = createCenterSolver();
  const edges = createEdgePairer();

  /**
   * @param {string[]} facelets 96 colours of a valid 4x4
   * @returns {{ phases: { phase: 'centers'|'edges'|'parity'|'solve3', moves: object[] }[] }}
   */
  function solve(facelets) {
    const parsed = parse4(facelets);
    if (!parsed.ok) throw new Error(`invalid 4x4: ${parsed.code}`);
    const phases = [];
    let f = facelets;
    const run = (phase, raw) => {
      const moves = mergeMoves(raw);
      if (moves.length) phases.push({ phase, moves });
      f = ENGINE.applyAll(f, moves);
    };
    run('centers', centers.solveCenters(f, parsed.scheme));
    run('edges', edges.pairEdges(f));
    run('parity', fixParity(f));
    const p3 = parse3(toReduced3(f));
    if (!p3.ok) throw new Error(`reduction failed: ${p3.code}`);
    run('solve3', search3(p3.state));
    const end = parse4(f);
    if (!end.ok || !isSolved4(end.state)) throw new Error('4x4 solution does not solve the cube');
    return { phases };
  }

  return { solve };
}
