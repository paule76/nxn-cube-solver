import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter3, text } from './helpers.js';

const ctx = setup();
const found = () => /^Lösung gefunden: \d+ Züge?\.$/.test(document.getElementById('message').textContent);
const SCRAMBLE = "R U2 F' L D B2 R' U F2 D' L2 B U' R2 F";

test('3x3: scramble, solve, play to the end -> solved; 3D matches the net', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await paint(p, stateAfter3(SCRAMBLE));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 20000 });
  const n = (await p.$$('#moves li')).length;
  assert.ok(n >= 1 && n <= 24, `moves ${n}`);
  await p.click('#last');
  await p.waitForTimeout(150);
  const f = await netColors(p);
  for (let face = 0; face < 6; face++) assert.equal(new Set(f.slice(face * 9, face * 9 + 9)).size, 1, `face ${face}`);
  assert.equal(await cubeColors(p), f);
  await closePage(p);
});

test('3x3: Lösen while the solver is being prepared solves automatically', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await paint(p, stateAfter3("R U F'"));
  const messages = new Set();
  await p.exposeFunction('__note', (m) => messages.add(m));
  await p.evaluate(() => {
    const el = document.getElementById('message');
    new MutationObserver(() => window.__note(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 20000 });
  assert.equal((await p.$$('#moves li')).length, 3);
  // Either the tables were still being built (message shown) or already ready – both are fine,
  // but if the preparing message appeared, the solution must have followed without another click.
  assert.ok([...messages].some((m) => m.startsWith('Lösung gefunden')));
  await closePage(p);
});

test('3x3: second visit loads the solver tables from the browser cache', async () => {
  const context = await ctx.browser.newContext({ locale: 'de-DE' });
  const first = await context.newPage();
  await first.goto(`${ctx.server.url}#3x3`);
  await paint(first, stateAfter3('R U'));
  await first.click('#solve');
  await first.waitForFunction(found, null, { timeout: 20000 });
  await first.close();
  const second = await context.newPage();
  const seen = [];
  second.on('console', () => {});
  await second.goto(`${ctx.server.url}#3x3`);
  await paint(second, stateAfter3('R U'));
  const t0 = Date.now();
  await second.click('#solve');
  seen.push(await text(second, '#message'));
  await second.waitForFunction(found, null, { timeout: 20000 });
  assert.ok(Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
  assert.ok(!seen.includes('3x3-Solver wird vorbereitet …'), seen.join(' | '));
  await context.close();
});

test('3x3: a stale answer is dropped when the input changed meanwhile', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  // warm up: make sure the solver is ready, so the guard after the search itself is exercised
  await paint(p, stateAfter3('R U'));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 20000 });
  await p.click('#reset');
  await p.click('#reset');
  await paint(p, stateAfter3(SCRAMBLE));
  await p.click('#solve');
  await p.click('.swatch[data-color="W"]');
  await p.click('.cell[data-index="0"]'); // change the input while the search runs (>= 100 ms)
  await p.waitForTimeout(1500);
  assert.ok(await p.isHidden('#solution'));
  assert.ok(!(await text(p, '#message')).startsWith('Lösung gefunden'));
  await closePage(p);
});

test('3x3: switching size during the search shows no stale result', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await paint(p, stateAfter3('R U'));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 20000 });
  await p.click('#reset');
  await p.click('#reset');
  await paint(p, stateAfter3(SCRAMBLE));
  await p.click('#solve');
  await p.click('.size[data-size="2x2"]');
  await p.waitForTimeout(1500);
  assert.ok(await p.isHidden('#solution'));
  assert.ok(!(await text(p, '#message')).startsWith('Lösung gefunden'));
  await closePage(p);
});
