import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeometry, FACES, FACE_NORMALS, inLayer, rotation, cssRotate } from '../src/engine/geometry.js';
import { createMoveSet, parseMoves, moveToString } from '../src/engine/facelets.js';
import { STICKERS } from '../src/geometry.js';
import { SOLVED, MOVES as MOVES_2X2, applyMoves, toFacelets } from '../src/cube.js';
import { randomMoves } from './helpers.js';

const COLOR = { U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' };
const solvedFacelets = (n) => FACES.flatMap((f) => Array(n * n).fill(COLOR[f]));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

for (const n of [2, 3, 4]) {
  test(`n=${n}: stickers unique and on their face`, () => {
    const g = createGeometry(n);
    assert.equal(g.stickers.length, 6 * n * n);
    assert.equal(new Set(g.stickers.map((s) => `${s.position}|${s.normal}`)).size, 6 * n * n);
    g.stickers.forEach((s, i) => {
      assert.deepEqual(s.normal, FACE_NORMALS[FACES[Math.floor(i / (n * n))]]);
      assert.equal(dot(s.position, s.normal), n - 1);
    });
    assert.equal(g.cubies.length, n ** 3 - Math.max(0, n - 2) ** 3);
    for (const f of FACES) assert.equal(g.cubies.filter((p) => inLayer(p, f, n)).length, n * n);
  });

  test(`n=${n}: every move x4 is identity, X X' identity, perms are bijections`, () => {
    const ms = createMoveSet(n);
    assert.equal(ms.moves.length, 18);
    const start = [...Array(6 * n * n).keys()];
    for (const m of ms.moves) {
      const perm = ms.perm(m);
      assert.equal(new Set(perm).size, perm.length);
      const inv = { face: m.face, turns: m.turns === 2 ? 2 : -m.turns };
      assert.deepEqual(ms.applyAll(start, [m, inv]), start);
      if (m.turns === 1) assert.deepEqual(ms.applyAll(start, [m, m, m, m]), start);
    }
  });
}

test('n=2 sticker order is unchanged', () => {
  assert.deepEqual(createGeometry(2).stickers.map((s) => [s.position, s.normal]), STICKERS.map((s) => [s.position, s.normal]));
});

test('engine matches the 2x2 cubie model', () => {
  const ms = createMoveSet(2);
  for (const m of MOVES_2X2) {
    assert.deepEqual(ms.apply(toFacelets(SOLVED), m), toFacelets(applyMoves(SOLVED, [m])), moveToString(m));
  }
  for (let i = 0; i < 200; i++) {
    const seq = randomMoves(1 + (i % 15));
    assert.deepEqual(ms.applyAll(toFacelets(SOLVED), seq), toFacelets(applyMoves(SOLVED, seq)));
  }
});

test('directions of D, L, B on the 3x3', () => {
  const ms = createMoveSet(3);
  const at = (f, face, r, c) => f[FACES.indexOf(face) * 9 + r * 3 + c];
  const d = ms.apply(solvedFacelets(3), parseMoves('D')[0]);
  for (let c = 0; c < 3; c++) assert.equal(at(d, 'R', 2, c), 'G'); // front bottom row -> right
  const l = ms.apply(solvedFacelets(3), parseMoves('L')[0]);
  for (let r = 0; r < 3; r++) assert.equal(at(l, 'F', r, 0), 'W'); // top left column -> front
  const b = ms.apply(solvedFacelets(3), parseMoves('B')[0]);
  for (let c = 0; c < 3; c++) assert.equal(at(b, 'U', 0, c), 'R'); // right column -> top
  for (let r = 0; r < 3; r++) assert.equal(at(b, 'L', r, 0), 'W'); // top row -> left
});

test('rotation and css for D/L/B', () => {
  assert.deepEqual(rotation({ face: 'D', turns: 1 }), { axis: 'y', degrees: 90 });
  assert.deepEqual(rotation({ face: 'L', turns: -1 }), { axis: 'x', degrees: -90 });
  assert.deepEqual(rotation({ face: 'B', turns: 2 }), { axis: 'z', degrees: 180 });
  assert.equal(cssRotate({ axis: 'y', degrees: 90 }), 'rotateY(90deg)');
});

test('notation round trip for all 18 moves', () => {
  const s = "U U2 U' D D2 D' L L2 L' R R2 R' F F2 F' B B2 B'";
  assert.equal(parseMoves(s).map(moveToString).join(' '), s);
  assert.throws(() => parseMoves('X'));
});
