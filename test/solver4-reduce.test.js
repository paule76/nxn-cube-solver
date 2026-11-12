import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildTables } from '../src/solver3/tables.js';
import { createSearch } from '../src/solver3/search.js';
import { parse3 } from '../src/puzzles/cube3.js';
import { cube4, toFacelets4, SOLVED4 } from '../src/puzzles/cube4.js';
import { createMoveSet } from '../src/engine/facelets.js';
import { toReduced3, OLL_PARITY, PLL_PARITY } from '../src/solver4/parity.js';
import { pairedCount } from '../src/solver4/edges.js';
import { centersSolved } from '../src/solver4/centers.js';
import { createSolver4, mergeMoves } from '../src/solver4/reduce.js';
import { parseMoves, moveToString } from '../src/engine/facelets.js';

const engine = createMoveSet(4);
const solved = cube4.solvedFacelets();
let solver;
before(() => {
  const search = createSearch(buildTables());
  const t0 = performance.now();
  solver = createSolver4((state) => search.solve(state));
  console.log(`# 4x4 solver setup: ${Math.round(performance.now() - t0)} ms`);
});

// fixed random source so length limits do not flake (mulberry32)
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allMoves = (phases) => phases.flatMap((p) => p.moves);
const solvedAfter = (f, phases) => cube4.isSolved(cube4.parse(engine.applyAll(f, allMoves(phases))).state);

test('mergeMoves joins turns of the same layer only', () => {
  const str = (s) => mergeMoves(parseMoves(s)).map(moveToString).join(' ');
  assert.equal(str("R R U Rw Rw' F2 F2 Uw Uw2 U"), "R2 U Uw' U");
});

test('toReduced3: solved 4x4 -> solved 3x3', () => {
  const p = parse3(toReduced3(solved));
  assert.ok(p.ok);
  assert.deepEqual(p.state.ep, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

for (const [name, alg, code] of [['OLL', OLL_PARITY, 'flippedEdge'], ['PLL', PLL_PARITY, 'parity']]) {
  test(`${name} parity keeps centres and pairs, creates exactly "${code}"`, () => {
    const f = engine.applyAll(solved, alg);
    const { scheme } = cube4.parse(f);
    assert.ok(centersSolved(f, scheme));
    assert.equal(pairedCount(f), 12);
    assert.equal(parse3(toReduced3(f)).code, code);
  });
}

test('parity cases are solved and contain the parity phase', () => {
  for (const alg of [OLL_PARITY, PLL_PARITY, [...OLL_PARITY, ...PLL_PARITY]]) {
    const f = engine.applyAll(solved, alg);
    const { phases } = solver.solve(f);
    assert.ok(phases.some((p) => p.phase === 'parity'));
    assert.ok(solvedAfter(f, phases));
  }
});

test('solved cube (any orientation) -> no phases', () => {
  assert.deepEqual(solver.solve(solved).phases, []);
  const g = toFacelets4(SOLVED4, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  assert.deepEqual(solver.solve(g).phases, []);
});

test('50 scrambles: solved, avg <= 90, max <= 120 moves, <= 3 s each', () => {
  const lengths = [];
  const times = [];
  let parity = 0;
  const rng = seeded(4444);
  for (let i = 0; i < 50; i++) {
    const f = engine.applyAll(solved, cube4.scramble(rng));
    const t0 = performance.now();
    const { phases } = solver.solve(f);
    times.push(performance.now() - t0);
    assert.ok(solvedAfter(f, phases), `scramble ${i}`);
    assert.ok(phases.every((p) => p.moves.length > 0));
    if (phases.some((p) => p.phase === 'parity')) parity++;
    lengths.push(allMoves(phases).length);
  }
  const avg = lengths.reduce((a, b) => a + b) / lengths.length;
  const avgMs = times.reduce((a, b) => a + b) / times.length;
  console.log(`# 4x4 total: avg ${avg.toFixed(1)}, max ${Math.max(...lengths)} moves; avg ${avgMs.toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms; parity in ${parity}/50`);
  assert.ok(avg <= 90, `avg ${avg}`);
  assert.ok(Math.max(...lengths) <= 120);
  assert.ok(Math.max(...times) <= 3000);
});
