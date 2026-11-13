import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter3, text, timeLimit } from './helpers.js';

const ctx = setup();
const found = () => /^Lösung gefunden: \d+ Züge?\.$/.test(document.getElementById('message').textContent);
const SCRAMBLE = "R U2 F' L D B2 R' U F2 D' L2 B U' R2 F";

/** Solves a short 3x3 once so the worker is ready, then resets to solved (two clicks: confirm). */
async function warmUp(p) {
  await paint(p, stateAfter3('R U'));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: timeLimit(20000) });
  await p.click('#reset');
  await p.click('#reset');
}

test('3x3: scramble, solve, play to the end -> solved; 3D matches the net', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await paint(p, stateAfter3(SCRAMBLE));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: timeLimit(20000) });
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
  const context = await ctx.browser.newContext({ locale: 'de-DE' });
  // hold back the worker script so the click surely lands in the preparation phase
  let release;
  const held = new Promise((r) => {
    release = r;
  });
  await context.route('**/solver3/worker.js', async (route) => {
    await held;
    await route.continue();
  });
  const p = await context.newPage();
  await p.goto(`${ctx.server.url}#3x3`);
  await p.waitForFunction(() => !document.getElementById('solve').disabled);
  await paint(p, stateAfter3("R U F'"));
  await p.click('#solve');
  assert.equal(await text(p, '#message'), '3x3-Solver wird vorbereitet …');
  release();
  await p.waitForFunction(found, null, { timeout: timeLimit(20000) });
  assert.equal((await p.$$('#moves li')).length, 3);
  await context.close();
});

test('3x3: the second visit uses the tables from the browser cache', async () => {
  const context = await ctx.browser.newContext({ locale: 'de-DE' });
  const solveOnce = async () => {
    const p = await context.newPage();
    await p.goto(`${ctx.server.url}#3x3`);
    await paint(p, stateAfter3('R U'));
    await p.click('#solve');
    await p.waitForFunction(found, null, { timeout: timeLimit(20000) });
    const state = await p.getAttribute('html', 'data-solver-tables');
    await p.close();
    return state;
  };
  assert.equal(await solveOnce(), 'built');
  await new Promise((r) => setTimeout(r, 1500)); // let the first page finish writing the cache
  assert.equal(await solveOnce(), 'cached');
  await context.close();
});

test('3x3: clicking Lösen twice shows only the latest answer and does not reset navigation', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await warmUp(p);
  await paint(p, stateAfter3(SCRAMBLE));
  await p.click('#solve');
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: timeLimit(20000) });
  await p.click('#next');
  await p.waitForTimeout(1500);
  assert.match(await text(p, '#step-text'), /^Schritt 2 von/);
  await closePage(p);
});

test('3x3: a stale answer is dropped when the input changed meanwhile', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  await warmUp(p); // the solver is ready, so the guard after the search itself is exercised
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
  await warmUp(p);
  await paint(p, stateAfter3(SCRAMBLE));
  await p.click('#solve');
  await p.click('.size[data-size="2x2"]');
  await p.waitForTimeout(1500);
  assert.ok(await p.isHidden('#solution'));
  assert.ok(!(await text(p, '#message')).startsWith('Lösung gefunden'));
  await closePage(p);
});
