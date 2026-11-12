import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLVED4, toFacelets4, parse4, isSolved4, CORNER_FACELETS4, WING_FACELETS, WING_NAMES, CENTER_FACELETS, cube4,
} from '../src/puzzles/cube4.js';
import { createMoveSet, movesFor } from '../src/engine/facelets.js';
import { OPPOSITE_FACE } from '../src/engine/geometry.js';
import { formatParseError } from '../src/messages.js';
import { createI18n } from '../src/i18n.js';

const engine = createMoveSet(4);
const MOVES4 = movesFor(4);
const rnd = (n) => Array.from({ length: n }, () => MOVES4[Math.floor(Math.random() * MOVES4.length)]);
const solved = () => toFacelets4(SOLVED4);
const de = (r) => formatParseError(r, createI18n({ lang: 'de' }).t);
const en = (r) => formatParseError(r, createI18n({ lang: 'en' }).t);

test('structure: 8 corners, 24 edge pieces, 24 centres cover all 96 facelets', () => {
  assert.equal(CORNER_FACELETS4.length, 8);
  assert.equal(WING_FACELETS.length, 24);
  assert.equal(CENTER_FACELETS.length, 24);
  const all = [...CORNER_FACELETS4.flat(), ...WING_FACELETS.flat(), ...CENTER_FACELETS];
  assert.equal(new Set(all).size, 96);
  assert.equal(new Set(WING_NAMES).size, 24);
});

test('solved cube, also held differently', () => {
  assert.equal(solved().join(''), ['W', 'R', 'G', 'Y', 'O', 'B'].map((c) => c.repeat(16)).join(''));
  const r = parse4(solved());
  assert.ok(r.ok && isSolved4(r.state));
  const other = toFacelets4(SOLVED4, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  const q = parse4(other);
  assert.ok(q.ok, q.code);
  assert.ok(isSolved4(q.state));
});

test('every reachable position is valid and round-trips', () => {
  for (let i = 0; i < 200; i++) {
    const f = engine.applyAll(solved(), rnd(1 + (i % 40)));
    const r = parse4(f);
    assert.ok(r.ok, r.code);
    assert.deepEqual(toFacelets4(r.state, r.scheme), f);
  }
});

test('errors: empty field, colour count', () => {
  const f = solved();
  f[5] = null;
  assert.equal(parse4(f).code, 'incomplete');
  const g = solved();
  g[0] = 'Y';
  const r = parse4(g);
  assert.deepEqual(r.params, { color: 'W', count: 15, expected: 16 });
  assert.equal(de(r), 'Weiß kommt 15× vor (erwartet: 16×).');
});

test('errors: twisted and mirrored corner', () => {
  const f = solved();
  const [a, b, c] = CORNER_FACELETS4[0];
  [f[a], f[b], f[c]] = [f[c], f[a], f[b]];
  assert.equal(parse4(f).code, 'twistedCorner');
  const g = solved();
  [g[b], g[c]] = [g[c], g[b]];
  assert.equal(parse4(g).code, 'cornerOrder');
});

test('errors: swapped stickers of an edge piece read as a duplicate (mirror hint)', () => {
  const f = solved();
  const [a, b] = WING_FACELETS[0];
  [f[a], f[b]] = [f[b], f[a]];
  const r = parse4(f);
  assert.equal(r.code, 'duplicateEdge4');
  assert.match(de(r), /gespiegelt/);
  assert.match(en(r), /mirrored/);
});

test('errors: impossible edge piece names its position', () => {
  const f = solved();
  const [a, b] = WING_FACELETS[0];
  // make piece 0 show two opposite colours, keep the colour counts balanced
  const opposite = { W: 'Y', Y: 'W', G: 'B', B: 'G', R: 'O', O: 'R' };
  const lost = f[b];
  f[b] = opposite[f[a]];
  const fix = WING_FACELETS.slice(1).flat().find((i) => f[i] === opposite[f[a]]);
  f[fix] = lost;
  const r = parse4(f);
  assert.equal(r.code, 'edgeImpossible');
  assert.equal(r.params.position, WING_NAMES[0]);
  assert.match(de(r), /^Kante .+, Teil [12] \(/);
  assert.match(en(r), /^Edge .+, part [12] \(/);
});

test('centres need no own check: four of each colour follow from the counts', () => {
  for (let i = 0; i < 20; i++) {
    const r = parse4(engine.applyAll(solved(), rnd(40)));
    const counts = {};
    for (const s of r.state.centers) counts[s] = (counts[s] ?? 0) + 1;
    assert.deepEqual(Object.values(counts), [4, 4, 4, 4, 4, 4]);
  }
});

test('scramble: 40 moves, never the same face twice, never X opp(X) X; uses wide moves', () => {
  let wide = 0;
  for (let i = 0; i < 300; i++) {
    const s = cube4.scramble();
    assert.equal(s.length, 40);
    for (let k = 0; k < s.length; k++) {
      assert.ok(MOVES4.includes(s[k]));
      if (s[k].depth === 2) wide++;
      if (k >= 1) assert.notEqual(s[k].face, s[k - 1].face);
      if (k >= 2 && OPPOSITE_FACE[s[k].face] === s[k - 1].face) assert.notEqual(s[k].face, s[k - 2].face);
    }
  }
  assert.ok(wide > 300 * 40 * 0.4, 'about half of the moves are wide');
});
