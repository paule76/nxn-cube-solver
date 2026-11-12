import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createCenterSolver5, centersSolved5 } from '../src/solver5/centers.js';
import { createEdgePairer5, pairedWings, EDGE_PARITY } from '../src/solver5/edges.js';
import { cube5, parse5 } from '../src/puzzles/cube5.js';
import { createMoveSet } from '../src/engine/facelets.js';

const engine = createMoveSet(5);
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
  centers = createCenterSolver5();
  pairer = createEdgePairer5();
});

test('edge parity: swaps the two wings of one edge, keeps centres, still a valid cube', () => {
  const f = engine.applyAll(cube5.solvedFacelets(), EDGE_PARITY);
  const p = parse5(f);
  assert.ok(p.ok);
  assert.ok(centersSolved5(f, p.scheme));
  assert.equal(pairedWings(f), 22);
  assert.equal(pairedWings(cube5.solvedFacelets()), 24);
});

test('checkpoint: 20 scrambles -> all 24 wings paired, centres kept; centres+edges avg <= 120', () => {
  const rng = seeded(77);
  const lengths = [];
  const times = [];
  for (let i = 0; i < 20; i++) {
    let f = cube5.applyMoves(cube5.solvedFacelets(), cube5.scramble(rng));
    const { scheme } = cube5.parse(f);
    const c = centers.solveCenters(f, scheme);
    f = engine.applyAll(f, c);
    const t0 = performance.now();
    const { edges, parity } = pairer.pairEdges(f);
    times.push(performance.now() - t0);
    f = engine.applyAll(f, [...edges, ...parity]);
    assert.equal(pairedWings(f), 24, `scramble ${i}`);
    assert.ok(centersSolved5(f, scheme), `centres kept, scramble ${i}`);
    lengths.push(c.length + edges.length + parity.length);
  }
  const avg = lengths.reduce((a, b) => a + b) / lengths.length;
  const avgMs = times.reduce((a, b) => a + b) / times.length;
  console.log(`# 5x5 centres+edges: avg ${avg.toFixed(1)}, max ${Math.max(...lengths)}; pairing avg ${avgMs.toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);
  assert.ok(avg <= 120, `avg ${avg}`);
  assert.ok(avgMs <= 1000);
});

test('pairEdges throws instead of returning an unpaired cube', () => {
  let f = cube5.applyMoves(cube5.solvedFacelets(), cube5.scramble(seeded(5)));
  f = engine.applyAll(f, centers.solveCenters(f, cube5.parse(f).scheme));
  assert.throws(() => pairer.pairEdges(f, { maxSteps: 0 }), /edge pairing failed/);
});
