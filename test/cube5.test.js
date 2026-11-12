import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cube5, parse5, toFacelets5, isSolved5, SOLVED5,
  CORNER_FACELETS5, MIDGE_FACELETS, WING_FACELETS5, WING_NAMES5, X_CENTER_FACELETS, T_CENTER_FACELETS, FIXED_CENTERS,
} from '../src/puzzles/cube5.js';
import { createMoveSet, movesFor } from '../src/engine/facelets.js';
import { PUZZLES, PUZZLE_IDS } from '../src/puzzles/index.js';
import { formatParseError } from '../src/messages.js';
import { createI18n } from '../src/i18n.js';

const engine = createMoveSet(5);
const MOVES5 = movesFor(5);
const solved = () => cube5.solvedFacelets();
const random = (k) => Array.from({ length: k }, () => MOVES5[Math.floor(Math.random() * MOVES5.length)]);
const swap = (f, a, b) => {
  const g = [...f];
  [g[a], g[b]] = [g[b], g[a]];
  return g;
};
const de = createI18n({ lang: 'de' }).t;
const en = createI18n({ lang: 'en' }).t;

test('registry and pieces: every facelet belongs to exactly one piece', () => {
  assert.deepEqual(PUZZLE_IDS, ['2x2', '3x3', '4x4', '5x5']);
  assert.equal(PUZZLES['5x5'], cube5);
  assert.equal(cube5.size, 5);
  const all = [
    ...CORNER_FACELETS5.flat(), ...MIDGE_FACELETS.flat(), ...WING_FACELETS5.flat(),
    ...X_CENTER_FACELETS, ...T_CENTER_FACELETS, ...FIXED_CENTERS,
  ];
  assert.equal(CORNER_FACELETS5.length, 8);
  assert.equal(MIDGE_FACELETS.length, 12);
  assert.equal(WING_FACELETS5.length, 24);
  assert.equal(X_CENTER_FACELETS.length, 24);
  assert.equal(T_CENTER_FACELETS.length, 24);
  assert.equal(all.length, 150);
  assert.equal(new Set(all).size, 150);
  assert.deepEqual(WING_NAMES5.slice(0, 2), ['UR1', 'UR2']);
});

test('solved cube: valid and solved; any holding is solved too', () => {
  const p = parse5(solved());
  assert.ok(p.ok);
  assert.ok(isSolved5(p.state));
  const g = toFacelets5(SOLVED5, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  const q = parse5(g);
  assert.ok(q.ok && isSolved5(q.state));
});

test('the six fixed centres never move', () => {
  const f = solved();
  for (const m of MOVES5) {
    const g = engine.apply(f, m);
    for (const j of FIXED_CENTERS) assert.equal(g[j], f[j]);
  }
});

test('model == engine: every move and 200 random sequences', () => {
  const check = (f) => {
    const p = parse5(f);
    assert.ok(p.ok, p.code);
    assert.deepEqual(toFacelets5(p.state, p.scheme), f);
  };
  for (const m of MOVES5) check(engine.apply(solved(), m));
  for (let k = 0; k < 200; k++) check(engine.applyAll(solved(), random(30)));
});

test('scramble: 60 moves, no same face twice, no X-opposite-X', () => {
  const OPP = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
  for (let k = 0; k < 50; k++) {
    const s = cube5.scramble();
    assert.equal(s.length, 60);
    for (let i = 1; i < s.length; i++) {
      assert.notEqual(s[i].face, s[i - 1].face);
      if (i > 1) assert.ok(!(s[i].face === s[i - 2].face && OPP[s[i].face] === s[i - 1].face));
    }
    const f = cube5.applyMoves(solved(), s);
    const p = parse5(f);
    assert.ok(p.ok);
    assert.deepEqual(toFacelets5(p.state, p.scheme), f); // round trip
  }
});

test('errors: incomplete, colorCount, centers', () => {
  const f = solved();
  assert.equal(parse5(f.map((c, i) => (i === 3 ? null : c))).code, 'incomplete');
  const g = [...f];
  g[0] = g[30]; // one more R, one less W
  assert.equal(parse5(g).code, 'colorCount');
  assert.equal(parse5(swap(f, FIXED_CENTERS[0], FIXED_CENTERS[1])).code, 'centers');
});

test('errors: corners', () => {
  const f = solved();
  const [a, b, c] = CORNER_FACELETS5[0];
  assert.equal(parse5(swap(f, a, b)).code, 'cornerOrder');
  const tw = [...f];
  [tw[a], tw[b], tw[c]] = [f[b], f[c], f[a]];
  assert.equal(parse5(tw).code, 'twistedCorner');
});

test('errors: midges (impossible, flipped, parity) and edge pieces (duplicate)', () => {
  const f = solved();
  // a white/yellow midge: swap the non-white sticker of a U midge with a yellow t-centre on D
  const [u, side] = MIDGE_FACELETS[1]; // UF
  const yellowT = T_CENTER_FACELETS.find((j) => f[j] === 'Y');
  const imp = parse5(swap(f, side, yellowT));
  assert.equal(imp.code, 'edgeImpossible');
  assert.equal(imp.params.position, 'UF');
  assert.equal(formatParseError(imp, de), 'Kante oben-vorne (Mittelstück) (Weiß/Gelb) gibt es auf einem Würfel nicht.');
  assert.match(formatParseError(imp, en), /top-front \(middle piece\)/);
  // a wing with impossible colours names the wing
  const wingSide = WING_FACELETS5[2].find((j) => f[j] !== 'W'); // the F sticker of a UF wing
  const wimp = parse5(swap(f, wingSide, T_CENTER_FACELETS.filter((j) => f[j] === 'Y')[1]));
  assert.equal(wimp.code, 'edgeImpossible');
  assert.equal(wimp.params.position, WING_NAMES5[2]);
  // corners: impossible colours and duplicates
  const c0 = CORNER_FACELETS5[0][1]; // white/yellow corner
  const cimp = parse5(swap(f, c0, T_CENTER_FACELETS.find((j) => f[j] === 'Y')));
  assert.equal(cimp.code, 'cornerImpossible');
  assert.match(formatParseError(cimp, de), /^Ecke /);
  const dup = [...f];
  CORNER_FACELETS5[1].forEach((j, k) => {
    dup[j] = f[CORNER_FACELETS5[0][k]];
  });
  assert.equal(parse5(dup).code, 'colorCount'); // a duplicated corner changes the colour counts first
  assert.equal(parse5(swap(f, u, side)).code, 'flippedEdge');
  const [w1, w2] = WING_FACELETS5[0];
  assert.equal(parse5(swap(f, w1, w2)).code, 'duplicateEdge4');
  // two midges exchanged (both stickers): odd midge permutation with even corners
  const [a1, a2] = MIDGE_FACELETS[0];
  const [b1, b2] = MIDGE_FACELETS[1];
  assert.equal(parse5(swap(swap(f, a1, b1), a2, b2)).code, 'parity');
});

test('errors: centerCount – colour counts fine, but x- and t-centres of two colours swapped', () => {
  const f = solved();
  const wx = X_CENTER_FACELETS.find((j) => f[j] === 'W');
  const yt = T_CENTER_FACELETS.find((j) => f[j] === 'Y');
  const r = parse5(swap(f, wx, yt));
  assert.equal(r.code, 'centerCount');
  assert.match(formatParseError(r, de), /^Mittelsteine von (Weiß|Gelb)/);
  assert.match(formatParseError(r, en), /^(White|Yellow) centre pieces/);
  // same-coloured exchange inside a group is fine
  const wx2 = X_CENTER_FACELETS.filter((j) => f[j] === 'W')[1];
  assert.ok(parse5(swap(f, wx, wx2)).ok);
});
