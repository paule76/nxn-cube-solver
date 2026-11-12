import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVES, SOLVED, applyMoves, toFacelets, parseFacelets, moveToString } from '../src/cube.js';
import { randomScramble } from '../src/scramble.js';
import { ALL_MOVES } from '../src/engine/facelets.js';
import { OPPOSITE_FACE } from '../src/engine/geometry.js';

test('default length 12 and custom length', () => {
  assert.equal(randomScramble().length, 12);
  assert.equal(randomScramble(5).length, 5);
});

test('never the same face twice in a row', () => {
  for (let i = 0; i < 1000; i++) {
    const s = randomScramble();
    for (let k = 1; k < s.length; k++) assert.notEqual(s[k].face, s[k - 1].face);
    for (const m of s) assert.ok(MOVES.includes(m));
  }
});

test('deterministic with a seeded rng', () => {
  const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const a = randomScramble(12, seeded(42)).map(moveToString).join(' ');
  const b = randomScramble(12, seeded(42)).map(moveToString).join(' ');
  assert.equal(a, b);
});

test('uses all faces and turn kinds', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) for (const m of randomScramble()) seen.add(moveToString(m));
  assert.equal(seen.size, 9);
});

test('result is a valid cube state', () => {
  const r = parseFacelets(toFacelets(applyMoves(SOLVED, randomScramble())));
  assert.ok(r.ok, r.error);
});

test('3x3 scramble: 20 moves, all faces, no X opp(X) X', () => {
  const faces = new Set();
  for (let i = 0; i < 1000; i++) {
    const s = randomScramble(20, Math.random, ALL_MOVES);
    assert.equal(s.length, 20);
    for (let k = 0; k < s.length; k++) {
      assert.ok(ALL_MOVES.includes(s[k]));
      faces.add(s[k].face);
      if (k >= 1) assert.notEqual(s[k].face, s[k - 1].face);
      if (k >= 2 && OPPOSITE_FACE[s[k].face] === s[k - 1].face) assert.notEqual(s[k].face, s[k - 2].face);
    }
  }
  assert.equal(faces.size, 6);
});
