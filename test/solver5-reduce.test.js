import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildTables } from '../src/solver3/tables.js';
import { createSearch } from '../src/solver3/search.js';
import { parse3 } from '../src/puzzles/cube3.js';
import { cube5, toFacelets5, SOLVED5 } from '../src/puzzles/cube5.js';
import { createMoveSet } from '../src/engine/facelets.js';
import { EDGE_PARITY } from '../src/solver5/edges.js';
import { createSolver5, toReduced3from5 } from '../src/solver5/reduce.js';

const engine = createMoveSet(5);
const solved = cube5.solvedFacelets();
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let solver;
before(() => {
  const search = createSearch(buildTables());
  const t0 = performance.now();
  solver = createSolver5((state, options) => search.solve(state, options));
  console.log(`# 5x5 solver setup: ${Math.round(performance.now() - t0)} ms`);
});
const allMoves = (phases) => phases.flatMap((p) => p.moves);
const solvedAfter = (f, phases) => cube5.isSolved(cube5.parse(engine.applyAll(f, allMoves(phases))).state);

test('toReduced3from5: solved 5x5 -> solved 3x3', () => {
  assert.ok(parse3(toReduced3from5(solved)).ok);
});

test('edge parity case is solved and has a parity phase', () => {
  const f = engine.applyAll(solved, EDGE_PARITY);
  const { phases } = solver.solve(f);
  assert.ok(phases.some((p) => p.phase === 'parity'));
  assert.ok(solvedAfter(f, phases));
});

test('solved cube (any holding) -> no phases', () => {
  assert.deepEqual(solver.solve(solved).phases, []);
  const g = toFacelets5(SOLVED5, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  assert.deepEqual(solver.solve(g).phases, []);
});

test('30 scrambles: solved, avg <= 140, max <= 180 moves, avg <= 1.5 s, each <= 6 s', () => {
  const rng = seeded(2025);
  const lengths = [];
  const times = [];
  for (let i = 0; i < 30; i++) {
    const f = cube5.applyMoves(solved, cube5.scramble(rng));
    const t0 = performance.now();
    const { phases } = solver.solve(f);
    times.push(performance.now() - t0);
    assert.ok(solvedAfter(f, phases), `scramble ${i}`);
    lengths.push(allMoves(phases).length);
  }
  const avg = lengths.reduce((a, b) => a + b) / lengths.length;
  const avgMs = times.reduce((a, b) => a + b) / times.length;
  console.log(`# 5x5 total: avg ${avg.toFixed(1)}, max ${Math.max(...lengths)} moves; avg ${avgMs.toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);
  assert.ok(avg <= 140, `avg ${avg}`);
  assert.ok(Math.max(...lengths) <= 180);
  assert.ok(avgMs <= 1500, `avg ${avgMs} ms`);
  assert.ok(Math.max(...times) <= 6000);
});
