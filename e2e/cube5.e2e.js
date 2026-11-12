import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter5, text } from './helpers.js';

const ctx = setup();

test('5x5: 150 fields, 98 cubies; switching 4x4 <-> 5x5 keeps both inputs', async () => {
  const p = await openPage(ctx, { hash: '#5x5' });
  assert.equal((await p.$$('.cell')).length, 150);
  assert.equal((await p.$$('.cube3d .cubie')).length, 98);
  await p.click('.swatch[data-color="R"]');
  await p.click('.cell[data-index="0"]');
  const edited5 = await netColors(p);
  await p.click('.size[data-size="4x4"]');
  await p.click('.swatch[data-color="B"]');
  await p.click('.cell[data-index="0"]');
  const edited4 = await netColors(p);
  await p.click('.size[data-size="5x5"]');
  assert.equal(await netColors(p), edited5);
  await p.click('.size[data-size="4x4"]');
  assert.equal(await netColors(p), edited4);
  await closePage(p);
});

test('5x5: validation messages; a valid cube gets solved', async () => {
  const p = await openPage(ctx, { hash: '#5x5' });
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Schon gelöst!');
  await p.click('.swatch[data-color="Y"]');
  await p.click('.cell[data-index="0"]');
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Weiß kommt 24× vor (erwartet: 25×).');
  await p.click('#reset');
  await p.click('#reset');
  await paint(p, stateAfter5("Rw U Fw' D2 Lw2 B"));
  await p.click('#solve');
  await p.waitForFunction(() => /^Lösung gefunden: \d+ Züge?\.$/.test(document.getElementById('message').textContent), null, { timeout: 60000 });
  await closePage(p);
});

test('5x5: scramble animates 60 moves (two-layer turn = 41 cubies); 3D matches the net', async () => {
  const p = await openPage(ctx, { hash: '#5x5', locale: 'de-DE', reducedMotion: 'no-preference' });
  await p.click('#scramble');
  let maxTurning = 0;
  const deadline = Date.now() + 60000;
  while (!(await text(p, '#message')).startsWith('Gemischt')) {
    assert.ok(Date.now() < deadline, 'scramble did not finish within 60 s');
    const turning = await p.$$eval('.cube3d .cubie', (cs) => cs.filter((c) => /rotate[XYZ]\((?!0deg)/.test(c.style.transform)).length);
    maxTurning = Math.max(maxTurning, turning);
    await p.waitForTimeout(25);
  }
  const moves = (await text(p, '#message')).split(':')[1].split('–')[0].trim().split(' ');
  assert.equal(moves.length, 60);
  if (moves.some((m) => m.includes('w'))) assert.equal(maxTurning, 41, 'a two-layer turn moves 41 cubies');
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('5x5: no horizontal scroll on small phones (DE and EN)', async () => {
  for (const locale of ['de-DE', 'en-US']) {
    const p = await openPage(ctx, { hash: '#5x5', locale, viewport: { width: 360, height: 900 } });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await closePage(p);
  }
});
