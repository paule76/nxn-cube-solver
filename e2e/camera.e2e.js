import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, netColors, cubeColors } from './helpers.js';

const ctx = setup();
const DEFAULT = 'rotateX(-25deg) rotateY(-35deg)';
const cam = (p) => p.$eval('.cube3d .camera', (e) => e.style.transform);

test('camera turns to hidden faces while scrambling and returns afterwards', async () => {
  const p = await openPage(ctx, { hash: '#3x3' });
  assert.equal(await cam(p), DEFAULT);
  await p.click('#scramble');
  const seen = new Set();
  while (!(await p.textContent('#message')).startsWith('Gemischt')) {
    seen.add(await cam(p));
    await p.waitForTimeout(40);
  }
  const moves = (await p.textContent('#message')).split(':')[1].split('–')[0].trim().split(' ');
  const hidden = moves.some((m) => 'DLB'.includes(m[0]));
  if (hidden) assert.ok([...seen].some((c) => c !== DEFAULT), 'camera moved for a hidden face');
  await p.waitForTimeout(400);
  assert.equal(await cam(p), DEFAULT);
  assert.equal(await cubeColors(p), await netColors(p));
  await closePage(p);
});

test('a camera the user dragged is not overridden for visible faces', async () => {
  const p = await openPage(ctx, { hash: '#2x2' });
  const r = await p.$eval('#cube3d', (e) => e.getBoundingClientRect().toJSON());
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await p.mouse.down();
  await p.mouse.move(r.x + r.width / 2 + 20, r.y + r.height / 2 + 4, { steps: 4 });
  await p.mouse.up();
  const dragged = await cam(p);
  assert.notEqual(dragged, DEFAULT);
  await p.click('#scramble'); // 2x2 only turns U/R/F, still visible from a slightly dragged view
  await p.waitForFunction(() => document.getElementById('message').textContent.startsWith('Gemischt'), null, { timeout: 12000 });
  await p.waitForTimeout(400);
  assert.equal(await cam(p), dragged);
  await closePage(p);
});
