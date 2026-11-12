import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setup, openPage, closePage, paint, netColors, cubeColors, stateAfter, SCRAMBLE_11, text, counterVisible, rotatedCubies,
} from './helpers.js';

const ctx = setup();
const finished = () => /^(Fertig|Done)/.test(document.getElementById('step-text').textContent);

test('arrow shows the next move and its direction', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter('R'));
  await p.click('#solve');
  assert.equal(await p.$eval('.hint-arrow', (e) => !e.hidden && e.dataset.face), 'R');
  assert.ok(await p.$eval('.hint-arrow', (e) => e.classList.contains('ccw')));
  await p.click('#next');
  await p.waitForFunction(finished);
  await p.waitForTimeout(100);
  assert.ok(await p.$eval('.hint-arrow', (e) => e.hidden));
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('double click on Weiter advances exactly one step', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.dblclick('#next');
  await p.waitForTimeout(1300);
  assert.match(await text(p, '#step-text'), /^Schritt 2 von/);
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('reduced motion steps immediately', async () => {
  const p = await openPage(ctx, { reducedMotion: 'reduce' });
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.click('#next');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Schritt 2'), null, { timeout: 500 });
  assert.equal(await counterVisible(p), false);
  await closePage(p);
});

test('half turn shows counter 1, pause, 2', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter('R2'));
  await p.click('#solve');
  const t0 = Date.now();
  await p.click('#next');
  const samples = [];
  for (const at of [150, 500, 850]) {
    await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    samples.push(await p.evaluate(() => {
      const e = document.querySelector('.turn-count');
      return e.hidden ? '-' : e.textContent;
    }));
  }
  assert.deepEqual(samples, ['1', '1', '2']);
  await p.waitForFunction(finished, null, { timeout: 2000 });
  await p.waitForTimeout(100);
  assert.equal(await counterVisible(p), false);
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('language switch during a half turn keeps the animation', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter('F2'));
  await p.click('#solve');
  await p.click('#next');
  await p.waitForTimeout(500);
  await p.click('.lang[data-lang="en"]');
  await p.waitForTimeout(30);
  assert.equal(await rotatedCubies(p), 4);
  assert.ok(await p.$eval('.hint-arrow', (e) => e.hidden));
  await p.waitForTimeout(900);
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('new solve during a half turn cancels it cleanly', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter('F2'));
  await p.click('#solve');
  await p.click('#next');
  await p.waitForTimeout(500);
  await p.click('#solve');
  await p.waitForTimeout(60);
  assert.equal(await counterVisible(p), false);
  await p.waitForTimeout(250);
  assert.equal(await rotatedCubies(p), 0);
  await p.click('#next');
  await p.waitForFunction(finished, null, { timeout: 2000 });
  await p.waitForTimeout(100);
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});
