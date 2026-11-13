import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createCenterSolver5, centersSolved5, stageReached5, Z1_MOVES, Z2_MOVES, Z3_MOVES, Z3B_MOVES } from '../src/solver5/centers.js';
import { AXIS_VIEWS, SIDE_VIEWS } from '../src/solver5/rotate.js';
import { cube5, toFacelets5, SOLVED5 } from '../src/puzzles/cube5.js';
import { createMoveSet } from '../src/engine/facelets.js';
import { timeLimit } from './helpers.js';

const engine = createMoveSet(5);
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
  const t0 = performance.now();
  solver = createCenterSolver5();
  console.log(`# 5x5 centre tables: ${Math.round(performance.now() - t0)} ms`);
});

test('move sets', () => {
  assert.equal(Z1_MOVES.length, 36);
  assert.equal(Z2_MOVES.length, 28);
  assert.equal(Z3_MOVES.length, 24);
  assert.equal(Z3B_MOVES.length, 14);
});

test('later stage moves keep earlier stages', () => {
  const rng = seeded(11);
  for (let k = 0; k < 10; k++) {
    let f = cube5.applyMoves(cube5.solvedFacelets(), cube5.scramble(rng));
    const { scheme } = cube5.parse(f);
    for (let stage = 0; stage < 4; stage++) {
      f = engine.applyAll(f, solver.solveStage(f, scheme, stage));
      assert.ok(stageReached5(f, scheme, stage), `stage ${stage}`);
      const next = [Z2_MOVES, Z3_MOVES, Z3B_MOVES][stage];
      for (const m of next ?? []) {
        const g = engine.apply(f, m);
        for (let s = 0; s <= stage; s++) assert.ok(stageReached5(g, scheme, s), `stage ${s} kept by ${m.face}${m.turns}/${m.depth ?? 1}`);
      }
    }
  }
});

test('views: rotating there and moving back gives the same cube', () => {
  const rng = seeded(3);
  const f = cube5.applyMoves(cube5.solvedFacelets(), cube5.scramble(rng));
  const moves = cube5.scramble(rng).slice(0, 10);
  for (const view of [...AXIS_VIEWS, ...SIDE_VIEWS]) {
    const viaView = view.facelets(f);
    const after = engine.applyAll(viaView, moves);
    assert.deepEqual(view.facelets(engine.applyAll(f, view.movesBack(moves))), after);
  }
});

test('checkpoint: 30 scrambles -> centres solved; avg <= 45 moves; time within safety limits', () => {
  const rng = seeded(555);
  const lengths = [];
  const times = [];
  for (let i = 0; i < 30; i++) {
    const f = cube5.applyMoves(cube5.solvedFacelets(), cube5.scramble(rng));
    const { scheme } = cube5.parse(f);
    const t0 = performance.now();
    const moves = solver.solveCenters(f, scheme);
    times.push(performance.now() - t0);
    assert.ok(centersSolved5(engine.applyAll(f, moves), scheme), `scramble ${i}`);
    lengths.push(moves.length);
  }
  const avg = lengths.reduce((a, b) => a + b) / lengths.length;
  const avgMs = times.reduce((a, b) => a + b) / times.length;
  console.log(`# 5x5 centres: avg ${avg.toFixed(1)}, max ${Math.max(...lengths)} moves; avg ${avgMs.toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);
  assert.ok(avg <= 45, `avg ${avg}`);
  assert.ok(avgMs <= timeLimit(2000), `avg ${avgMs} ms`); // target 1 s, measured alone
  assert.ok(Math.max(...times) <= timeLimit(10000));
});

test('solved cube in any holding needs no centre moves', () => {
  const g = toFacelets5(SOLVED5, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  assert.deepEqual(solver.solveCenters(g, cube5.parse(g).scheme), []);
});
