import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoves } from '../src/cube.js';
import { stepText, describeMove } from '../src/step-text.js';
import { createI18n } from '../src/i18n.js';
import { parseMoves as parseMovesN } from '../src/engine/facelets.js';

const t = createI18n({ lang: 'de' }).t;
const tEn = createI18n({ lang: 'en' }).t;

const moves = parseMoves("F' U R2");

test('describeMove', () => {
  assert.equal(describeMove(moves[0], t), "F' – vordere Seite gegen den Uhrzeigersinn");
  assert.equal(describeMove(moves[2], t), 'R2 – rechte Seite halbe Drehung (180°)');
});

test('each move is announced exactly once, as the next thing to do', () => {
  assert.equal(stepText(moves, 0, t), "Schritt 1 von 3: F' – vordere Seite gegen den Uhrzeigersinn");
  assert.equal(stepText(moves, 1, t), 'Schritt 2 von 3: U – obere Seite im Uhrzeigersinn');
  assert.equal(stepText(moves, 2, t), 'Schritt 3 von 3: R2 – rechte Seite halbe Drehung (180°)');
  assert.equal(stepText(moves, 3, t), 'Fertig – der Würfel ist gelöst! 🎉');
  const texts = [0, 1, 2, 3].map((k) => stepText(moves, k, t));
  for (const m of ["F'", 'U ', 'R2']) assert.equal(texts.filter((t) => t.includes(m)).length, 1, m);
});

test('wide moves are described as two layers', () => {
  const [rw] = parseMovesN("Rw'");
  assert.equal(describeMove(rw, t), "Rw' – rechte zwei Schichten gegen den Uhrzeigersinn");
  assert.equal(describeMove(rw, tEn), "Rw' – right two layers counter-clockwise");
});

test('english step text', () => {
  assert.equal(stepText(moves, 0, tEn), "Step 1 of 3: F' – front face counter-clockwise");
  assert.equal(stepText(moves, 2, tEn), 'Step 3 of 3: R2 – right face half turn (180°)');
  assert.equal(stepText(moves, 3, tEn), 'Done – the cube is solved! 🎉');
});

test('4x4: step text names the phase; phases are flattened with marks', async () => {
  const { flattenPhases, phaseAt } = await import('../src/step-text.js');
  const [rw, u, f] = parseMovesN("Rw U F'");
  const { moves, marks } = flattenPhases([{ phase: 'centers', moves: [rw, u] }, { phase: 'edges', moves: [f] }]);
  assert.equal(moves.length, 3);
  assert.deepEqual(marks, [{ phase: 'centers', start: 0 }, { phase: 'edges', start: 2 }]);
  assert.equal(phaseAt(marks, 1), 'centers');
  assert.equal(phaseAt(marks, 2), 'edges');
  assert.equal(stepText(moves, 2, t, phaseAt(marks, 2)), "Kanten paaren · Schritt 3 von 3: F' – vordere Seite gegen den Uhrzeigersinn");
  assert.equal(stepText(moves, 0, tEn, 'centers'), 'Centres · Step 1 of 3: Rw – right two layers clockwise');
  assert.equal(stepText(moves, 3, t, 'edges'), 'Fertig – der Würfel ist gelöst! 🎉');
  assert.deepEqual(flattenPhases([{ phase: 'solve', moves: [u] }]).marks, []);
});
