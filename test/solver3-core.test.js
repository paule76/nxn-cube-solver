import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverCore } from '../src/solver3/core.js';
import { buildTables, exportTables } from '../src/solver3/tables.js';
import { randomState } from '../src/solver3/random-state.js';
import { applyMoves3, isSolved3 } from '../src/puzzles/cube3.js';

let good;
before(() => {
  good = exportTables(buildTables());
});

function fakeCache(initial) {
  return {
    stored: initial,
    saved: 0,
    cleared: 0,
    load: async function () { return this.stored; },
    save: async function (bytes) { this.saved++; this.stored = bytes; },
    clear: async function () { this.cleared++; this.stored = null; },
  };
}

test('uses cached tables when present', async () => {
  const cache = fakeCache(good);
  const core = createSolverCore({ load: () => cache.load(), save: (b) => cache.save(b), clear: () => cache.clear() });
  const { cached } = await core.init();
  assert.equal(cached, true);
  assert.equal(cache.saved, 0);
  const s = randomState();
  assert.ok(isSolved3(applyMoves3(s, core.solve(s))));
});

test('builds and stores tables when the cache is empty', async () => {
  const cache = fakeCache(null);
  const core = createSolverCore({ load: () => cache.load(), save: (b) => cache.save(b), clear: () => cache.clear() });
  const { cached } = await core.init();
  assert.equal(cached, false);
  await core.saved; // saving happens after "ready"
  assert.equal(cache.saved, 1);
});

test('wrong cached tables (same size and version) are detected and replaced', async () => {
  const bad = good.slice();
  // corrupt the start of the twist move table (right after the 4-byte header)
  for (let i = 4; i < 4 + 2187 * 18 * 2; i++) bad[i] = (bad[i] + 7) & 0xff; // whole twist move table
  const cache = fakeCache(bad);
  const core = createSolverCore({ load: () => cache.load(), save: (b) => cache.save(b), clear: () => cache.clear() });
  await core.init();
  for (let i = 0; i < 5; i++) {
    const s = randomState();
    assert.ok(isSolved3(applyMoves3(s, core.solve(s))), 'solution must be valid');
  }
  await core.saved;
  assert.ok(cache.cleared >= 1 || cache.saved >= 1, 'bad cache was replaced');
});

test('a failing cache never blocks the solver', async () => {
  const core = createSolverCore({
    load: () => Promise.reject(new Error('blocked')),
    save: () => Promise.reject(new Error('quota')),
    clear: () => Promise.reject(new Error('nope')),
  });
  const { cached } = await core.init();
  assert.equal(cached, false);
  const s = randomState();
  assert.ok(isSolved3(applyMoves3(s, core.solve(s))));
});
