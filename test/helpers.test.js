import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { timeLimit } from './helpers.js';

const saved = process.env.CUBE_TIME_FACTOR;
afterEach(() => {
  if (saved === undefined) delete process.env.CUBE_TIME_FACTOR;
  else process.env.CUBE_TIME_FACTOR = saved;
});

test('timeLimit keeps the limit without CUBE_TIME_FACTOR', () => {
  delete process.env.CUBE_TIME_FACTOR;
  assert.equal(timeLimit(10000), 10000);
});

test('timeLimit scales the limit by CUBE_TIME_FACTOR', () => {
  process.env.CUBE_TIME_FACTOR = '1.5';
  assert.equal(timeLimit(10000), 15000);
  assert.equal(timeLimit(1000), 1500);
});

test('timeLimit ignores invalid factors', () => {
  for (const v of ['', 'abc', '0', '-2']) {
    process.env.CUBE_TIME_FACTOR = v;
    assert.equal(timeLimit(2000), 2000, `CUBE_TIME_FACTOR=${JSON.stringify(v)}`);
  }
});
