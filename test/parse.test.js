import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLVED, toFacelets, parseFacelets, isSolved } from '../src/cube.js';
import { randomState } from './helpers.js';
import { formatParseError } from '../src/messages.js';
import { createI18n } from '../src/i18n.js';

const de = (r) => formatParseError(r, createI18n({ lang: 'de' }).t);
const en = (r) => formatParseError(r, createI18n({ lang: 'en' }).t);

const solved = () => toFacelets(SOLVED);

test('round trip', () => {
  for (let i = 0; i < 20; i++) {
    const s = randomState(15);
    const f = toFacelets(s);
    const r = parseFacelets(f);
    assert.ok(r.ok, r.error);
    assert.deepEqual(r.state, s);
    assert.deepEqual(toFacelets(r.state, r.scheme), f);
  }
});

test('solved in other orientation', () => {
  const f = toFacelets(SOLVED, { U: 'Y', D: 'W', F: 'B', B: 'G', R: 'R', L: 'O' });
  const r = parseFacelets(f);
  assert.ok(r.ok, r.error);
  assert.ok(isSolved(r.state));
});

test('empty field', () => {
  const f = solved();
  f[5] = null;
  const r = parseFacelets(f);
  assert.deepEqual(r, { ok: false, code: 'incomplete', params: {} });
  assert.equal(de(r), 'Es sind noch nicht alle Felder gefärbt.');
  assert.equal(en(r), 'Not all squares are coloured yet.');
});

test('color count', () => {
  const f = solved();
  f[0] = 'Y';
  const r = parseFacelets(f);
  assert.deepEqual(r, { ok: false, code: 'colorCount', params: { color: 'W', count: 3, expected: 4 } });
  assert.equal(de(r), 'Weiß kommt 3× vor (erwartet: 4×).');
  assert.equal(en(r), 'White appears 3× (expected: 4×).');
});

test('mirrored corner', () => {
  const f = solved();
  [f[4], f[9]] = [f[9], f[4]];
  const r = parseFacelets(f);
  assert.deepEqual(r, { ok: false, code: 'cornerOrder', params: { position: 'URF', colors: ['W', 'G', 'R'] } });
  assert.equal(
    de(r),
    'Ecke oben-vorne-rechts (Weiß/Grün/Rot): Farben in falscher Reihenfolge – evtl. eine Seite gespiegelt eingegeben (B von hinten, D von unten gesehen).',
  );
});

test('impossible corner names its position', () => {
  const f = solved();
  // URF shows W/R/Y (white and yellow are opposite) - fix counts by moving G to D
  f[9] = 'Y';
  f[13] = 'G';
  const r = parseFacelets(f);
  assert.deepEqual(r, { ok: false, code: 'cornerImpossible', params: { position: 'URF', colors: ['W', 'R', 'Y'] } });
  assert.equal(de(r), 'Ecke oben-vorne-rechts (Weiß/Rot/Gelb) gibt es auf einem Würfel nicht.');
  assert.equal(en(r), 'Corner top-front-right (White/Red/Yellow) does not exist on a cube.');
});

test('twisted corner', () => {
  const f = solved();
  [f[3], f[4], f[9]] = [f[9], f[3], f[4]];
  const r = parseFacelets(f);
  assert.equal(r.code, 'twistedCorner');
  assert.equal(de(r), 'Eine Ecke ist verdreht – so ist der Würfel nicht lösbar.');
});

test('duplicate corner', () => {
  // URF twice (positions 0,1) and DBL twice (positions 6,7): colour counts stay at 4 each
  const f = toFacelets({ cp: [0, 0, 2, 3, 4, 5, 6, 6], co: [0, 0, 0, 0, 0, 0, 0, 0] });
  const r = parseFacelets(f);
  assert.equal(r.code, 'duplicateCorner');
  assert.equal(de(r), 'Eine Ecke kommt doppelt vor – bitte Eingabe prüfen.');
});
