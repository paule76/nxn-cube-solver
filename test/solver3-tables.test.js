import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/solver3/coords.js';
import { buildTables, exportTables, importTables, prune, PHASE1_MOVES, PHASE2_MOVES } from '../src/solver3/tables.js';
import { SOLVED3, applyMove3, applyMoves3 } from '../src/puzzles/cube3.js';
import { moveToString } from '../src/engine/facelets.js';

let T;
let buildMs;
before(() => {
  const t0 = performance.now();
  T = buildTables();
  buildMs = performance.now() - t0;
  console.log(`# buildTables: ${Math.round(buildMs)} ms`);
});

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomState = (moves, n) => applyMoves3(SOLVED3, Array.from({ length: n }, () => pick(moves)));

test('move sets', () => {
  assert.equal(PHASE1_MOVES.length, 18);
  assert.equal(PHASE2_MOVES.map(moveToString).join(' '), "U U2 U' D D2 D' L2 R2 F2 B2");
});

test('build time', () => {
  assert.ok(buildMs < 6000, `${buildMs} ms`);
});

test('phase-1 move tables match the cubie model', () => {
  for (let k = 0; k < 500; k++) {
    const s = randomState(PHASE1_MOVES, 25);
    PHASE1_MOVES.forEach((m, j) => {
      const t = applyMove3(s, m);
      assert.equal(T.twistMove[C.getTwist(s) * 18 + j], C.getTwist(t));
      assert.equal(T.flipMove[C.getFlip(s) * 18 + j], C.getFlip(t));
      assert.equal(T.sliceMove[C.getSlice(s) * 18 + j], C.getSlice(t));
    });
  }
});

test('phase-2 move tables match the cubie model', () => {
  for (let k = 0; k < 500; k++) {
    const s = randomState(PHASE2_MOVES, 25);
    PHASE2_MOVES.forEach((m, j) => {
      const t = applyMove3(s, m);
      assert.equal(T.cpermMove[C.getCornerPerm(s) * 10 + j], C.getCornerPerm(t));
      assert.equal(T.udepermMove[C.getUDEdgePerm(s) * 10 + j], C.getUDEdgePerm(t));
      assert.equal(T.spermMove[C.getSlicePerm(s) * 10 + j], C.getSlicePerm(t));
    });
  }
});

test('pruning tables are complete with expected depths', () => {
  const maxDepth = (table, n) => {
    let max = 0;
    for (let i = 0; i < n; i++) {
      const d = prune(table, i);
      assert.notEqual(d, 15, `unset entry ${i}`);
      if (d > max) max = d;
    }
    return max;
  };
  assert.equal(prune(T.pTwistSlice, 0), 0);
  assert.ok(maxDepth(T.pTwistSlice, C.N_TWIST * C.N_SLICE) <= 12);
  assert.ok(maxDepth(T.pFlipSlice, C.N_FLIP * C.N_SLICE) <= 12);
  assert.ok(maxDepth(T.pCpermSperm, C.N_CPERM * C.N_SPERM) <= 18);
  assert.ok(maxDepth(T.pUdepermSperm, C.N_UDEPERM * C.N_SPERM) <= 18);
});

test('export / import round trip', () => {
  const bytes = exportTables(T);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 3_000_000 && bytes.length < 4_500_000, `${bytes.length} bytes`);
  const U = importTables(bytes);
  for (const key of Object.keys(T)) assert.deepEqual(U[key], T[key], key);
  assert.throws(() => importTables(bytes.slice(0, 1000)));
  const broken = bytes.slice();
  broken[0] ^= 0xff;
  assert.throws(() => importTables(broken));
});
