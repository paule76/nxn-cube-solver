import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createCenterSolver, centersSolved } from '../src/solver4/centers.js';
import { createEdgePairer, pairedCount } from '../src/solver4/edges.js';
import { cube4 } from '../src/puzzles/cube4.js';
import { createMoveSet } from '../src/engine/facelets.js';
import { timeLimit } from './helpers.js';

const engine = createMoveSet(4);
// fixed random source so the length limit does not flake (mulberry32)
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let centers;
let pairer;
before(() => {
  centers = createCenterSolver();
  const t0 = performance.now();
  pairer = createEdgePairer();
  console.log(`# edge pairer setup: ${Math.round(performance.now() - t0)} ms`);
});

test('pairedCount: solved = 12, after Rw = fewer', () => {
  const solved = cube4.solvedFacelets();
  assert.equal(pairedCount(solved), 12);
  const [rw] = engine.moves.filter((m) => m.face === 'R' && m.turns === 1 && m.depth === 2);
  assert.ok(pairedCount(engine.apply(solved, rw)) < 12);
});

test('checkpoint: 50 scrambles -> centres solved, all 12 edges paired; length and time', () => {
  const lengths = [];
  const times = [];
  const rng = seeded(2024);
  for (let i = 0; i < 50; i++) {
    let f = engine.applyAll(cube4.solvedFacelets(), cube4.scramble(rng));
    const { scheme } = cube4.parse(f);
    const c = centers.solveCenters(f, scheme);
    f = engine.applyAll(f, c);
    const t0 = performance.now();
    const e = pairer.pairEdges(f);
    times.push(performance.now() - t0);
    f = engine.applyAll(f, e);
    assert.equal(pairedCount(f), 12, `scramble ${i}`);
    assert.ok(centersSolved(f, scheme), `centres kept, scramble ${i}`);
    lengths.push(c.length + e.length);
  }
  const avg = lengths.reduce((a, b) => a + b) / lengths.length;
  const avgMs = times.reduce((a, b) => a + b) / times.length;
  console.log(`# centres+edges: avg ${avg.toFixed(1)}, max ${Math.max(...lengths)} moves; pairing avg ${avgMs.toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);
  assert.ok(avg <= 65, `avg ${avg}`);
  assert.ok(avgMs <= timeLimit(1000), `avg ${avgMs} ms`);
});

test('pairEdges throws instead of returning an unpaired cube', () => {
  let f = engine.applyAll(cube4.solvedFacelets(), cube4.scramble(seeded(7)));
  f = engine.applyAll(f, centers.solveCenters(f, cube4.parse(f).scheme));
  assert.throws(() => pairer.pairEdges(f, { maxSteps: 0 }), /edge pairing failed/);
});
