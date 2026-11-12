import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, PUZZLE_IDS } from '../src/puzzles/index.js';

test('registry', () => {
  assert.deepEqual(PUZZLE_IDS, ['2x2', '3x3']);
  assert.equal(PUZZLES['2x2'].size, 2);
  assert.equal(PUZZLES['3x3'].size, 3);
});

for (const id of ['2x2', '3x3']) {
  test(`${id} fulfils the puzzle interface`, () => {
    const p = PUZZLES[id];
    assert.equal(p.id, id);
    const f = p.solvedFacelets();
    assert.equal(f.length, 6 * p.size * p.size);
    const r = p.parse(f);
    assert.ok(r.ok);
    assert.ok(p.isSolved(r.state));
    const s = p.scramble();
    assert.equal(s.length, id === '2x2' ? 12 : 20);
    for (const m of s) assert.ok(p.moveFaces.includes(m.face));
    assert.equal(typeof p.applyMoves, 'function');
    const scrambled = p.applyMoves(f, s);
    assert.ok(p.parse(scrambled).ok);
  });
}

test('only the 2x2 can be solved for now', () => {
  assert.equal(typeof PUZZLES['2x2'].solve, 'function');
  assert.equal(PUZZLES['3x3'].solve, undefined);
  const p = PUZZLES['2x2'];
  const f = p.applyMoves(p.solvedFacelets(), p.scramble());
  const moves = p.solve(p.parse(f).state);
  assert.ok(p.isSolved(p.parse(p.applyMoves(f, moves)).state));
});
