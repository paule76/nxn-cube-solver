import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, stateAfter, SCRAMBLE_11, text } from './helpers.js';

const ctx = setup();

test('starts in the browser language and switches completely', async () => {
  const p = await openPage(ctx, { locale: 'en-US' });
  assert.equal(await text(p, '#solve'), 'Solve');
  assert.equal(await p.getAttribute('html', 'lang'), 'en');
  const footer = await p.$$eval('.site-footer a', (as) => as.map((a) => a.textContent));
  assert.deepEqual(footer, ['Source on GitHub', 'MIT License']);
  await p.click('.swatch[data-color="Y"]');
  await p.click('.cell[data-index="0"]');
  await p.click('#solve');
  assert.equal(await text(p, '#message'), 'White appears 3× (expected: 4×).');
  await p.click('.lang[data-lang="de"]');
  assert.equal(await text(p, '#message'), 'Weiß kommt 3× vor (erwartet: 4×).');
  assert.equal(await text(p, '#solve'), 'Lösen');
  await p.reload();
  await p.waitForFunction(() => !document.getElementById('solve').disabled);
  assert.equal(await text(p, '#solve'), 'Lösen');
  await closePage(p);
});

test('solution texts in English; no horizontal scroll on phones', async () => {
  const p = await openPage(ctx, { locale: 'en-US', viewport: { width: 375, height: 900 } });
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  assert.match(await text(p, '#message'), /^Solution found: \d+ moves\.$/);
  assert.match(await text(p, '#step-text'), /^Step 1 of \d+: /);
  assert.equal(await text(p, '#play'), '▶ Play');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await closePage(p);
});
