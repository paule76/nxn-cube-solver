import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createCenterSolver, M1_MOVES, M2_MOVES, M3_MOVES, centersSolved, stageReached } from '../src/solver4/centers.js';
import { cube4, toFacelets4, SOLVED4 } from '../src/puzzles/cube4.js';
import { createMoveSet } from '../src/engine/facelets.js';

const engine = createMoveSet(4);
let solver;
before(() => {
  const t0 = performance.now();
  solver = createCenterSolver();
  console.log(`# center tables: ${Math.round(performance.now() - t0)} ms`);
});

const scrambled = () => engine.applyAll(cube4.solvedFacelets(), cube4.scramble());

test('move sets', () => {
  assert.equal(M1_MOVES.length, 36);
  assert.equal(M2_MOVES.length, 28);
  assert.equal(M3_MOVES.length, 24);
});

test('M2 moves keep stage 1, M3 moves keep stages 1 and 2', () => {
  for (let k = 0; k < 20; k++) {
    let f = scrambled();
    const { scheme } = cube4.parse(f);
    f = engine.applyAll(f, solver.solveStage(f, scheme, 1));
    assert.ok(stageReached(f, scheme, 1));
    for (const m of M2_MOVES) assert.ok(stageReached(engine.apply(f, m), scheme, 1), `M2 ${m.face}${m.turns}${m.depth ?? ''}`);
    f = engine.applyAll(f, solver.solveStage(f, scheme, 2));
    assert.ok(stageReached(f, scheme, 2));
    for (const m of M3_MOVES) {
      const g = engine.apply(f, m);
      assert.ok(stageReached(g, scheme, 1) && stageReached(g, scheme, 2), `M3 ${m.face}${m.turns}${m.depth ?? ''}`);
    }
  }
});

test('stage 1 table covers every arrangement', () => {
  const stats = solver.stats();
  console.log(`# center stages: ${JSON.stringify(stats)}`);
  assert.equal(stats.m1.states, 735471); // C(24, 8)
  assert.equal(stats.m2.states, 12870); // C(16, 8)
});

test('50 scrambles: centres solved afterwards', () => {
  const lengths = [];
  for (let i = 0; i < 50; i++) {
    const f = scrambled();
    const { scheme } = cube4.parse(f);
    const moves = solver.solveCenters(f, scheme);
    assert.ok(centersSolved(engine.applyAll(f, moves), scheme));
    lengths.push(moves.length);
  }
  console.log(`# centre moves: avg ${(lengths.reduce((a, b) => a + b) / lengths.length).toFixed(1)}, max ${Math.max(...lengths)}`);
});

test('solved cube (any orientation) needs no centre moves', () => {
  const f = cube4.solvedFacelets();
  assert.deepEqual(solver.solveCenters(f, cube4.parse(f).scheme), []);
  const g = toFacelets4(SOLVED4, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  assert.deepEqual(solver.solveCenters(g, cube4.parse(g).scheme), []);
});
