import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter, stateAfter4, text } from './helpers.js';

const ctx = setup();
const found = () => /^(Lösung gefunden|Solution found): \d+ (Züge|moves)\.$/.test(document.getElementById('message').textContent);
const SCRAMBLE = "Rw U2 Fw' L D Bw2 R' Uw F2 D' Lw2 B U' Rw2 F Dw R2 Bw' U Lw";

test('4x4: scramble, solve in phases, play to the end -> solved; 3D matches the net', async () => {
  const p = await openPage(ctx, { hash: '#4x4' });
  await paint(p, stateAfter4(SCRAMBLE));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 30000 });
  const titles = await p.$$eval('#moves .phase', (ls) => ls.map((l) => l.textContent));
  assert.deepEqual(titles.filter((x) => x !== 'Parität'), ['Mitten', 'Kanten paaren', 'Wie ein 3x3 lösen']);
  const n = (await p.$$('#moves li.move')).length;
  assert.match(await text(p, '#message'), new RegExp(`: ${n} Züge\\.$`));
  assert.match(await text(p, '#step-text'), /^Mitten · Schritt 1 von \d+: /);
  // step to the first two-layer turn: its arrow carries the "w" mark
  const labels = await p.$$eval('#moves li.move', (ls) => ls.map((l) => l.textContent));
  const wide = labels.findIndex((l) => l.includes('w'));
  assert.ok(wide >= 0, 'a 4x4 solution contains two-layer turns');
  for (let i = 0; i < wide; i++) {
    await p.click('#next');
    await p.waitForFunction((k) => document.getElementById('step-text').textContent.includes(`Schritt ${k} von`), i + 2);
  }
  await p.waitForSelector('.wide');
  await p.click('#last');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Fertig'));
  const f = await netColors(p);
  for (let face = 0; face < 6; face++) assert.equal(new Set(f.slice(face * 16, face * 16 + 16)).size, 1, `face ${face}`);
  assert.equal(await cubeColors(p), f);
  assert.equal(await text(p, '#step-text'), 'Fertig – der Würfel ist gelöst! 🎉');
  await closePage(p);
});

test('4x4: English phase headings', async () => {
  const p = await openPage(ctx, { hash: '#4x4', locale: 'en-US' });
  await paint(p, stateAfter4("Rw U Fw' D2 Lw2 B"));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 30000 });
  const titles = await p.$$eval('#moves .phase', (ls) => ls.map((l) => l.textContent));
  assert.ok(titles.includes('Centres') && titles.includes('Pair edges') && titles.includes('Solve like a 3x3'), titles.join());
  assert.match(await text(p, '#step-text'), /^Centres · Step 1 of \d+: /);
  await closePage(p);
});

test('4x4: Lösen while the solver is being prepared solves automatically', async () => {
  const context = await ctx.browser.newContext({ locale: 'de-DE' });
  let release;
  const held = new Promise((r) => {
    release = r;
  });
  await context.route('**/solver3/worker.js', async (route) => {
    await held;
    await route.continue();
  });
  const p = await context.newPage();
  await p.goto(`${ctx.server.url}#4x4`);
  await p.waitForFunction(() => !document.getElementById('solve').disabled);
  await paint(p, stateAfter4("Rw U Fw'"));
  await p.click('#solve');
  assert.equal(await text(p, '#message'), '4x4-Solver wird vorbereitet …');
  release();
  await p.waitForFunction(found, null, { timeout: 30000 });
  assert.ok((await p.$$('#moves li.move')).length > 0);
  await context.close();
});

test('2x2 shows no phase headings', async () => {
  const p = await openPage(ctx, { hash: '#2x2' });
  await paint(p, stateAfter("R U F'"));
  await p.click('#solve');
  await p.waitForFunction(found, null, { timeout: 30000 });
  assert.equal((await p.$$('#moves .phase')).length, 0);
  assert.match(await text(p, '#step-text'), /^Schritt 1 von /);
  await closePage(p);
});
