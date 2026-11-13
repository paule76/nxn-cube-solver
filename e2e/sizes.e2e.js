import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter3, text, timeLimit } from './helpers.js';

const ctx = setup();
const SOLVED3 = stateAfter3('');

test('first visit shows the 3x3; the hash selects the size', async () => {
  const p = await openPage(ctx, { hash: '' });
  assert.ok(p.url().endsWith('#3x3'));
  assert.equal((await p.$$('.cell')).length, 54);
  assert.equal((await p.$$('.cube3d .cubie')).length, 26);
  assert.equal(await p.getAttribute('.size[data-size="3x3"]', 'aria-pressed'), 'true');
  await closePage(p);
  const q = await openPage(ctx, { hash: '#2x2' });
  assert.equal((await q.$$('.cell')).length, 24);
  await closePage(q);
});

test('switching sizes keeps each input; back button switches back', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await p.click('.swatch[data-color="R"]');
  await p.click('.cell[data-index="0"]');
  const edited = await netColors(p);
  await p.click('.size[data-size="2x2"]');
  assert.ok(p.url().endsWith('#2x2'));
  assert.equal((await p.$$('.cell')).length, 24);
  await p.goBack();
  await p.waitForFunction(() => document.querySelectorAll('.cell').length === 54);
  assert.equal(await netColors(p), edited);
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Weiß kommt 8× vor (erwartet: 9×).');
  await closePage(p);
});

test('URL always matches the shown size (back during scramble, unknown hash)', async () => {
  const p = await openPage(ctx, { hash: '#2x2' });
  await p.click('.size[data-size="3x3"]');
  await p.click('#scramble');
  await p.waitForTimeout(200);
  await p.goBack();
  await p.waitForTimeout(200);
  assert.ok(p.url().endsWith('#3x3'), p.url());
  assert.equal((await p.$$('.cell')).length, 54);
  await p.evaluate(() => { location.hash = '#foo'; });
  await p.waitForTimeout(100);
  assert.ok(p.url().endsWith('#3x3'), p.url());
  await closePage(p);
});

test('the last chosen size is remembered without a hash', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await p.click('.size[data-size="2x2"]');
  const q = await p.context().newPage();
  await q.goto(p.url().replace(/#.*$/, ''));
  await q.waitForFunction(() => document.querySelectorAll('.cell').length > 0);
  assert.equal((await q.$$('.cell')).length, 24);
  await q.close();
  await closePage(p);
});

test('a solved 3x3 is recognised and a scrambled one is solved', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Schon gelöst!');
  await paint(p, stateAfter3("R U F' D2 L B'"));
  await p.click('#solve');
  await p.waitForFunction(() => /^Lösung gefunden: \d+ Züge?\.$/.test(document.getElementById('message').textContent), null, { timeout: timeLimit(15000) });
  await closePage(p);
});

test('3x3 validation error: flipped edge', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  const f = [...SOLVED3];
  [f[7], f[19]] = [f[19], f[7]]; // UF edge flipped
  await paint(p, f.join(''));
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'Eine Kante ist gekippt – so ist der Würfel nicht lösbar.');
  await closePage(p);
});

test('3x3 scramble animates all faces; 3D matches the net', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await p.click('#scramble');
  assert.ok(await p.$eval('.size[data-size="2x2"]', (e) => e.disabled));
  await p.waitForFunction(() => document.getElementById('message').textContent.startsWith('Gemischt'), null, { timeout: timeLimit(15000) });
  const moves = (await text(p, '#message')).split(':')[1].split('–')[0].trim().split(' ');
  assert.equal(moves.length, 20);
  assert.equal(await cubeColors(p), await netColors(p));
  assert.notEqual(await netColors(p), SOLVED3);
  await p.click('#solve');
  await p.waitForFunction(() => /^Lösung gefunden: \d+ Züge?\.$/.test(document.getElementById('message').textContent), null, { timeout: timeLimit(15000) });
  await closePage(p);
});

test('English labels and no horizontal scroll on small phones', async () => {
  for (const width of [360, 375]) {
    const p = await openPage(ctx, { hash: '#3x3', locale: 'en-US', viewport: { width, height: 900 } });
    assert.equal(await p.getAttribute('.size-switch', 'aria-label'), 'Cube size');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await closePage(p);
  }
});
