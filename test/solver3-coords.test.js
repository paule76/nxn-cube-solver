import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/solver3/coords.js';
import { SOLVED3, applyMoves3 } from '../src/puzzles/cube3.js';
import { ALL_MOVES } from '../src/engine/facelets.js';

const rnd = (n) => Array.from({ length: n }, () => ALL_MOVES[Math.floor(Math.random() * 18)]);
const scrambled = () => applyMoves3(SOLVED3, rnd(30));

test('sizes', () => {
  assert.deepEqual(
    [C.N_TWIST, C.N_FLIP, C.N_SLICE, C.N_CPERM, C.N_UDEPERM, C.N_SPERM],
    [2187, 2048, 495, 40320, 40320, 24],
  );
});

test('solved state has all coordinates 0', () => {
  for (const get of [C.getTwist, C.getFlip, C.getSlice, C.getCornerPerm, C.getUDEdgePerm, C.getSlicePerm]) {
    assert.equal(get(SOLVED3), 0, get.name);
  }
});

test('get(set(i)) === i', () => {
  for (let i = 0; i < C.N_TWIST; i++) assert.equal(C.getTwist(C.setTwist(i)), i);
  for (let i = 0; i < C.N_FLIP; i++) assert.equal(C.getFlip(C.setFlip(i)), i);
  for (let i = 0; i < C.N_SLICE; i++) assert.equal(C.getSlice(C.setSlice(i)), i);
  for (let i = 0; i < C.N_SPERM; i++) assert.equal(C.getSlicePerm(C.setSlicePerm(i)), i);
  for (let k = 0; k < 2000; k++) {
    const i = Math.floor(Math.random() * C.N_CPERM);
    assert.equal(C.getCornerPerm(C.setCornerPerm(i)), i);
    const j = Math.floor(Math.random() * C.N_UDEPERM);
    assert.equal(C.getUDEdgePerm(C.setUDEdgePerm(j)), j);
  }
});

test('setters produce valid full states', () => {
  for (const s of [C.setTwist(1234), C.setFlip(999), C.setSlice(321), C.setCornerPerm(4321), C.setUDEdgePerm(777), C.setSlicePerm(13)]) {
    assert.equal(s.cp.length, 8);
    assert.equal(s.ep.length, 12);
    assert.equal(new Set(s.cp).size, 8);
    assert.equal(new Set(s.ep).size, 12);
    assert.equal(s.co.reduce((a, b) => a + b, 0) % 3, 0);
    assert.equal(s.eo.reduce((a, b) => a + b, 0) % 2, 0);
  }
});

test('phase-1 coordinates of random states are in range; goal means the subgroup', () => {
  for (let k = 0; k < 100; k++) {
    const s = scrambled();
    assert.ok(C.getTwist(s) < C.N_TWIST && C.getFlip(s) < C.N_FLIP && C.getSlice(s) < C.N_SLICE);
    const inGoal = C.getTwist(s) === 0 && C.getFlip(s) === 0 && C.getSlice(s) === 0;
    const subgroup = s.co.every((o) => o === 0) && s.eo.every((o) => o === 0) && [8, 9, 10, 11].every((p) => s.ep[p] >= 8);
    assert.equal(inGoal, subgroup);
  }
  // a pure phase-2 sequence stays in the subgroup
  const p2 = ALL_MOVES.filter((m) => 'UD'.includes(m.face) || m.turns === 2);
  const s = applyMoves3(SOLVED3, Array.from({ length: 30 }, () => p2[Math.floor(Math.random() * p2.length)]));
  assert.deepEqual([C.getTwist(s), C.getFlip(s), C.getSlice(s)], [0, 0, 0]);
});
