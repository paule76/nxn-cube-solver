import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openPage, closePage, paint, netColors, cubeColors, stateAfter, SCRAMBLE_11, text } from './helpers.js';

const ctx = setup();
const SOLVED = stateAfter('');

test('autoplay reaches the end; editing during autoplay stops it', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.selectOption('#tempo', 'schnell');
  await p.click('#play');
  assert.equal(await text(p, '#play'), '⏸ Pause');
  await p.waitForFunction(() => document.getElementById('step-text').textContent.startsWith('Fertig'), null, { timeout: 12000 });
  assert.equal(await text(p, '#play'), '▶ Abspielen');
  await p.click('#solve');
  await p.click('#play');
  await p.waitForTimeout(1000);
  await p.click('.cell[data-index="0"]');
  await p.waitForTimeout(1500);
  assert.ok(await p.isHidden('#solution'));
  await closePage(p);
});

test('keyboard navigation and palette keys', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(1200);
  assert.match(await text(p, '#step-text'), /^Schritt 2/);
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(1200);
  assert.match(await text(p, '#step-text'), /^Schritt 1/);
  await p.keyboard.press('End');
  await p.waitForTimeout(100);
  assert.match(await text(p, '#step-text'), /^Fertig/);
  await p.keyboard.press('Home');
  await p.waitForTimeout(100);
  await p.click('.swatch[data-color="W"]');
  await p.keyboard.press('ArrowRight');
  assert.equal(await p.$eval('.swatch[aria-checked="true"]', (e) => e.dataset.color), 'Y');
  assert.match(await text(p, '#step-text'), /^Schritt 1/);
  await closePage(p);
});

test('focus stays on Weiter; Space steps instead of starting autoplay', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.focus('#next');
  await p.keyboard.press('Space');
  await p.waitForTimeout(1200);
  await p.keyboard.press('Space');
  await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(() => document.activeElement.id), 'next');
  assert.match(await text(p, '#step-text'), /^Schritt 3/);
  assert.equal(await text(p, '#play'), '▶ Abspielen');
  await closePage(p);
});

test('at the end: ArrowLeft then Space replays from the start', async () => {
  const p = await openPage(ctx);
  await paint(p, stateAfter(SCRAMBLE_11));
  await p.click('#solve');
  await p.click('#last');
  await p.waitForTimeout(100);
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press(' ');
  await p.waitForTimeout(150);
  await p.keyboard.press(' ');
  await p.waitForTimeout(1200);
  const total = (await p.$$('#moves li')).length;
  assert.match(await text(p, '#step-text'), new RegExp(`^Schritt [12] von ${total}`));
  await closePage(p);
});

test('drag rotates the view; a stale drag does not stick; sync net <-> 3D', async () => {
  const p = await openPage(ctx);
  const r = await p.$eval('#cube3d', (e) => e.getBoundingClientRect().toJSON());
  const cam = () => p.$eval('.cube3d .camera', (e) => e.style.transform);
  const before = await cam();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await p.mouse.down();
  await p.mouse.move(r.x + r.width / 2 + 100, r.y + r.height / 2 + 20, { steps: 8 });
  await p.mouse.up();
  assert.notEqual(await cam(), before);
  assert.equal((await p.$$('.cell.highlighted')).length, 0);
  await p.click('#reset-camera');
  const reset = await cam();
  await p.mouse.move(r.x + 2, r.y + r.height / 2);
  await p.mouse.down();
  await p.mouse.move(r.x - 40, r.y + r.height / 2, { steps: 3 });
  await p.mouse.up();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 5 });
  assert.equal(await cam(), reset);
  await p.hover('.cell[data-index="9"]');
  assert.ok(await p.$eval('.cube3d .sticker[data-index="9"]', (e) => e.classList.contains('highlighted')));
  await p.mouse.move(0, 0);
  await p.click('.cube3d .sticker[data-index="9"]', { force: true });
  assert.deepEqual(await p.$$eval('.cell.highlighted', (es) => es.map((e) => e.dataset.index)), ['9']);
  await closePage(p);
});

test('scramble animates, locks inputs and asks before overwriting', async () => {
  const p = await openPage(ctx);
  await p.click('#scramble');
  await p.waitForTimeout(150);
  assert.ok(await p.$eval('#solve', (e) => e.disabled));
  await p.waitForFunction(() => document.getElementById('message').textContent.startsWith('Gemischt'), null, { timeout: 12000 });
  const moves = (await text(p, '#message')).split(':')[1].split('–')[0].trim().split(' ');
  assert.equal(moves.length, 12);
  assert.equal(await cubeColors(p), await netColors(p));
  assert.notEqual(await netColors(p), SOLVED);
  await p.click('#scramble');
  assert.equal(await text(p, '#scramble'), 'Wirklich mischen?');
  await p.click('#clear');
  assert.equal(await text(p, '#scramble'), 'Zufällig mischen');
  assert.equal(await text(p, '#clear'), 'Wirklich leeren?');
  await p.waitForTimeout(3500);
  assert.equal(await text(p, '#clear'), 'Leeren');
  assert.equal(await text(p, '#message'), '');
  await p.click('#clear');
  await p.click('#clear');
  assert.ok((await netColors(p)).split('').every((c) => c === '-'));
  await p.click('#reset');
  assert.equal(await netColors(p), SOLVED);
  await p.click('#reset');
  assert.equal(await text(p, '#reset'), 'Gelöst zurücksetzen');
  await closePage(p);
});
