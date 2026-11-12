import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter, SCRAMBLE_11, text } from './helpers.js';

const ctx = setup();

test('default cube is already solved', async () => {
  const p = await openPage(ctx);
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Schon gelöst!');
  await closePage(p);
});

test('single move is solved in one step', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter('R'));
  await p.click('#solve');
  assert.equal(await text(p, '#moves'), "R'");
  await p.click('#next');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Fertig'));
  assert.equal(await netColors(p), stateAfter(''));
  await closePage(p);
});

test('invalid colour count is reported', async () => {
  const p = await openPage(ctx);
  await p.click('.swatch[data-color="Y"]');
  await p.click('.cell[data-index="0"]');
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Weiß kommt 3× vor (erwartet: 4×).');
  await closePage(p);
});

test('11-move scramble: optimal solution ends solved, 3D matches net', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  const n = (await p.$$('#moves li')).length;
  assert.ok(n >= 1 && n <= 11, `moves ${n}`);
  await p.click('#last');
  await p.waitForTimeout(100);
  const f = await netColors(p);
  for (let face = 0; face < 6; face++) assert.equal(new Set(f.slice(face * 4, face * 4 + 4)).size, 1);
  assert.equal(await cubeColors(p), f);
  await closePage(p);
});
