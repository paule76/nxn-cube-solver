import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLVED3, toFacelets3, parse3, applyMoves3, CORNER_FACELETS3, EDGE_FACELETS, DEFAULT_SCHEME,
} from '../src/puzzles/cube3.js';
import { createMoveSet, parseMoves, ALL_MOVES } from '../src/engine/facelets.js';
import { formatParseError } from '../src/messages.js';
import { createI18n } from '../src/i18n.js';

const engine = createMoveSet(3);
const rnd = (n) => Array.from({ length: n }, () => ALL_MOVES[Math.floor(Math.random() * ALL_MOVES.length)]);
const de = (r) => formatParseError(r, createI18n({ lang: 'de' }).t);
const en = (r) => formatParseError(r, createI18n({ lang: 'en' }).t);
const solved = () => toFacelets3(SOLVED3);

test('solved facelets', () => {
  assert.equal(solved().join(''), 'W'.repeat(9) + 'R'.repeat(9) + 'G'.repeat(9) + 'Y'.repeat(9) + 'O'.repeat(9) + 'B'.repeat(9));
  const r = parse3(solved());
  assert.ok(r.ok);
  assert.deepEqual(r.state, SOLVED3);
  assert.deepEqual(r.scheme, DEFAULT_SCHEME);
});

test('model matches the engine for all moves and random sequences', () => {
  for (const m of ALL_MOVES) {
    assert.deepEqual(toFacelets3(applyMoves3(SOLVED3, [m])), engine.apply(solved(), m));
  }
  for (let i = 0; i < 200; i++) {
    const seq = rnd(1 + (i % 25));
    assert.deepEqual(toFacelets3(applyMoves3(SOLVED3, seq)), engine.applyAll(solved(), seq));
  }
});

test('round trip through parse3', () => {
  for (let i = 0; i < 50; i++) {
    const f = engine.applyAll(solved(), rnd(30));
    const r = parse3(f);
    assert.ok(r.ok, r.code);
    assert.deepEqual(toFacelets3(r.state, r.scheme), f);
  }
});

test('solved cube held differently (yellow top, blue front) is solved', () => {
  const r = parse3(toFacelets3(SOLVED3, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' }));
  assert.ok(r.ok, r.code);
  assert.deepEqual(r.state, SOLVED3);
});

test('incomplete and colour count', () => {
  const f = solved();
  f[0] = null;
  assert.equal(parse3(f).code, 'incomplete');
  const g = solved();
  g[0] = 'R';
  const r = parse3(g);
  assert.deepEqual(r, { ok: false, code: 'colorCount', params: { color: 'W', count: 8, expected: 9 } });
  assert.equal(de(r), 'Weiß kommt 8× vor (erwartet: 9×).');
  assert.equal(en(r), 'White appears 8× (expected: 9×).');
});

test('centres: swapped U/D centres and mirrored scheme are rejected', () => {
  const f = solved();
  [f[4], f[31]] = [f[31], f[4]]; // counts stay 9 each
  assert.equal(parse3(f).code, 'centers');
  const mirrored = toFacelets3(SOLVED3, { U: 'W', D: 'Y', F: 'G', B: 'B', R: 'O', L: 'R' });
  const r = parse3(mirrored);
  assert.equal(r.code, 'centers');
  assert.match(de(r), /^Die Mittelsteine passen nicht zusammen/);
  assert.match(en(r), /^The centre pieces do not match/);
});

test('flipped edge', () => {
  const f = solved();
  const [a, b] = EDGE_FACELETS[1]; // UF
  [f[a], f[b]] = [f[b], f[a]];
  const r = parse3(f);
  assert.equal(r.code, 'flippedEdge');
  assert.equal(de(r), 'Eine Kante ist gekippt – so ist der Würfel nicht lösbar.');
});

test('twisted corner', () => {
  const f = solved();
  const [a, b, c] = CORNER_FACELETS3[0];
  [f[a], f[b], f[c]] = [f[c], f[a], f[b]];
  assert.equal(parse3(f).code, 'twistedCorner');
});

test('two swapped edges are a parity error', () => {
  const f = solved();
  const [a1, a2] = EDGE_FACELETS[0]; // UR
  const [b1, b2] = EDGE_FACELETS[1]; // UF
  [f[a1], f[b1]] = [f[b1], f[a1]];
  [f[a2], f[b2]] = [f[b2], f[a2]];
  const r = parse3(f);
  assert.equal(r.code, 'parity');
  assert.equal(en(r), 'Two pieces are swapped – the cube cannot be solved like this.');
});

test('impossible edge names its position', () => {
  const f = solved();
  const [a, b] = EDGE_FACELETS[1]; // UF: W/G
  const [c] = EDGE_FACELETS[5]; // DF: Y/G -> take Y
  [f[b], f[c]] = [f[c], f[b]]; // UF becomes W/Y (opposites), DF becomes G/G
  const r = parse3(f);
  assert.deepEqual(r, { ok: false, code: 'edgeImpossible', params: { position: 'UF', colors: ['W', 'Y'] } });
  assert.equal(de(r), 'Kante oben-vorne (Weiß/Gelb) gibt es auf einem Würfel nicht.');
  assert.equal(en(r), 'Edge top-front (White/Yellow) does not exist on a cube.');
  void a;
});

test('duplicate edge (colour counts still fine)', () => {
  // UF piece also at UR, DR piece also at DF: G and R stay at 9 each
  const ep = [1, 1, 2, 3, 4, 4, 6, 7, 8, 9, 10, 11];
  const r = parse3(toFacelets3({ ...SOLVED3, ep }));
  assert.equal(r.code, 'duplicateEdge');
  assert.equal(de(r), 'Eine Kante kommt doppelt vor – bitte Eingabe prüfen.');
});

test('scheme is derived from the centres', () => {
  const f = engine.applyAll(solved(), parseMoves("R U F' D2 L B'"));
  assert.ok(parse3(f).ok);
});
