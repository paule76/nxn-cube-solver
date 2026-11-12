import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter4, text } from './helpers.js';

const ctx = setup();

test('4x4: 96 fields, 56 cubies; switching 3x3 <-> 4x4 keeps both inputs', async () => {
  const p = await openPage(ctx, { hash: '#4x4' });
  assert.equal((await p.$$('.cell')).length, 96);
  assert.equal((await p.$$('.cube3d .cubie')).length, 56);
  await p.click('.swatch[data-color="R"]');
  await p.click('.cell[data-index="0"]');
  const edited4 = await netColors(p);
  await p.click('.size[data-size="3x3"]');
  await p.click('.swatch[data-color="B"]');
  await p.click('.cell[data-index="0"]');
  const edited3 = await netColors(p);
  await p.click('.size[data-size="4x4"]');
  assert.equal(await netColors(p), edited4);
  await p.click('.size[data-size="3x3"]');
  assert.equal(await netColors(p), edited3);
  await closePage(p);
});

test('4x4: validation messages', async () => {
  const p = await openPage(ctx, { hash: '#4x4' });
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Schon gelöst!');
  await p.click('.swatch[data-color="Y"]');
  await p.click('.cell[data-index="0"]');
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Weiß kommt 15× vor (erwartet: 16×).');
  await p.click('#reset');
  await p.click('#reset');
  await paint(p, stateAfter4("Rw U Fw' D2 Lw2 B"));
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Gültiger Würfel – der 4x4-Solver folgt.');
  await closePage(p);
});

test('4x4: scramble animates (incl. two-layer turns); 3D matches the net', async () => {
  const p = await openPage(ctx, { hash: '#4x4' });
  await p.click('#scramble');
  let maxTurning = 0;
  while (!(await text(p, '#message')).startsWith('Gemischt')) {
    const turning = await p.$$eval('.cube3d .cubie', (cs) => cs.filter((c) => /rotate[XYZ]\((?!0deg)/.test(c.style.transform)).length);
    maxTurning = Math.max(maxTurning, turning);
    await p.waitForTimeout(25);
  }
  const moves = (await text(p, '#message')).split(':')[1].split('–')[0].trim().split(' ');
  assert.equal(moves.length, 40);
  if (moves.some((m) => m.includes('w'))) assert.equal(maxTurning, 28, 'a two-layer turn moves 28 cubies');
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('4x4: no horizontal scroll on small phones (DE and EN)', async () => {
  for (const locale of ['de-DE', 'en-US']) {
    const p = await openPage(ctx, { hash: '#4x4', locale, viewport: { width: 360, height: 900 } });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await closePage(p);
  }
});
