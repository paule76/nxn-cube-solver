import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSize, sizeFromHash, SIZE_KEY } from '../src/size.js';

test('sizeFromHash only accepts known sizes', () => {
  assert.equal(sizeFromHash('#3x3'), '3x3');
  assert.equal(sizeFromHash('#2x2'), '2x2');
  assert.equal(sizeFromHash('#4x4'), '4x4');
  assert.equal(sizeFromHash('#5x5'), null);
  assert.equal(sizeFromHash('#<img src=x onerror=alert(1)>'), null);
  assert.equal(sizeFromHash(''), null);
  assert.equal(sizeFromHash(undefined), null);
});

test('pickSize: hash wins, then stored value, then 3x3', () => {
  assert.equal(SIZE_KEY, 'cube-solver-size');
  assert.equal(pickSize({ hash: '#3x3', stored: '2x2' }), '3x3');
  assert.equal(pickSize({ hash: '#5x5', stored: '2x2' }), '2x2');
  assert.equal(pickSize({ hash: '', stored: null }), '3x3');
  assert.equal(pickSize({ hash: '', stored: '<img>' }), '3x3');
  assert.equal(pickSize({}), '3x3');
});
