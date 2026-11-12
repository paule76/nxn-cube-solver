// Note: page.$eval / page.evaluate are Playwright APIs that run the given test function in the
// browser; they are not JavaScript eval() on strings.
import { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.js';
import { SOLVED, toFacelets, applyMoves, parseMoves } from '../src/cube.js';

/** Starts server + browser once per test file; returns accessors. */
export function setup() {
  const ctx = { server: null, browser: null, pages: [] };
  before(async () => {
    ctx.server = await startServer();
    ctx.browser = await chromium.launch();
  });
  after(async () => {
    await ctx.browser?.close();
    await ctx.server?.close();
  });
  return ctx;
}

/**
 * Opens the app and waits for the solver. Collects console/page errors in page.errors.
 * @param {{ locale?: string, reducedMotion?: 'reduce'|'no-preference', viewport?: object, hash?: string }} options
 */
export async function openPage(ctx, { locale = 'de-DE', reducedMotion, viewport = { width: 1280, height: 1000 }, hash = '#2x2' } = {}) {
  const context = await ctx.browser.newContext({ locale, reducedMotion, viewport });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()));
  await page.goto(ctx.server.url + hash);
  await page.waitForFunction(() => !document.getElementById('solve').disabled);
  return page;
}

export async function closePage(page) {
  assert.deepEqual(page.errors, [], 'no console errors');
  await page.context().close();
}

/** Paints all cells of the net with the given facelet colours via palette + clicks. */
export async function paint(page, facelets) {
  for (const c of 'WYGBRO') {
    const idx = [...facelets].map((x, i) => (x === c ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    await page.click(`.swatch[data-color="${c}"]`);
    for (const i of idx) await page.click(`.cell[data-index="${i}"]`);
  }
}

const sortedColors = (selector) => (page) =>
  page.$$eval(selector, (els) =>
    els.sort((a, b) => a.dataset.index - b.dataset.index).map((e) => e.dataset.color || '-').join(''),
  );
export const netColors = sortedColors('.cell');
export const cubeColors = sortedColors('.cube3d .sticker');

/** 2x2 facelets after applying a move string to the solved cube. */
export const stateAfter = (moves) => toFacelets(applyMoves(SOLVED, parseMoves(moves))).join('');

export const SCRAMBLE_11 = "R U2 F' R U' R2 F U R' F2 U";
export const text = (page, sel) => page.textContent(sel);
export const counterVisible = (page) => page.evaluate(() => !document.querySelector('.turn-count').hidden);
export const rotatedCubies = (page) =>
  page.$$eval('.cube3d .cubie', (cs) => cs.filter((c) => /rotate[XYZ]\((?!0deg)/.test(c.style.transform)).length);
