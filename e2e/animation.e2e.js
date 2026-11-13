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

/** Records every layer-turn duration (CSS transition of the cubies) set from now on. */
const recordTurnMs = (p) =>
  p.evaluate(() => {
    const seen = new Set();
    window.turnMsSeen = seen;
    const tick = () => {
      if (window.turnMsSeen !== seen) return; // a newer recorder took over
      for (const c of document.querySelectorAll('.cube3d .cubie')) {
        const m = /transform (\d+)ms/.exec(c.style.transition);
        if (m) seen.add(Number(m[1]));
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
const turnMsSeen = (p) => p.evaluate(() => [...window.turnMsSeen].sort((a, b) => a - b));

test('single steps (Weiter, Zurück, arrow keys) turn a quarter in 430 ms', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter('R'));
  await p.click('#solve');
  await recordTurnMs(p);
  const t0 = await p.evaluate(() => performance.now());
  await p.click('#next');
  await p.waitForFunction(finished, null, { timeout: 2000 });
  const ms = (await p.evaluate(() => performance.now())) - t0;
  assert.ok(ms >= 430, `quarter turn took ${Math.round(ms)} ms`);
  await p.click('#prev');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Schritt 1 '), null, { timeout: 2000 });
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('ArrowRight');
  await p.waitForFunction(finished, null, { timeout: 2000 });
  await p.keyboard.press('ArrowLeft');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Schritt 1 '), null, { timeout: 2000 });
  assert.deepEqual(await turnMsSeen(p), [430]);
  await closePage(p);
});

test('autoplay keeps 300 ms per quarter turn', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.selectOption('#tempo', 'schnell');
  await recordTurnMs(p);
  await p.click('#play');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Schritt 4 '), null, { timeout: 8000 });
  await p.click('#play'); // pause
  assert.deepEqual(await turnMsSeen(p), [300]);
  await closePage(p);
});

test('double click on Weiter advances exactly one step', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.dblclick('#next');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Schritt 2 '), null, { timeout: 3000 });
  await p.waitForTimeout(300);
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
  // Record the sequence of counter values in the page until the move is done (no fixed sample times).
  const recording = p.evaluate(() => new Promise((resolve) => {
    const seen = [];
    const t0 = performance.now();
    const tick = () => {
      const e = document.querySelector('.turn-count');
      const v = e.hidden ? '-' : e.textContent;
      if (seen.at(-1) !== v) seen.push(v);
      if (/^(Fertig|Done)/.test(document.getElementById('step-text').textContent)) {
        resolve({ seen, ms: performance.now() - t0 });
      } else requestAnimationFrame(tick);
    };
    tick();
  }));
  await p.click('#next');
  const { seen, ms } = await recording;
  assert.deepEqual(seen.filter((v) => v !== '-'), ['1', '2']);
  assert.ok(ms >= 900, `half turn took ${Math.round(ms)} ms`);
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
  await p.waitForFunction(finished, null, { timeout: 2000 });
  await p.waitForTimeout(100);
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
