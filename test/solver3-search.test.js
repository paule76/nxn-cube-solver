import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildTables } from '../src/solver3/tables.js';
import { createSearch } from '../src/solver3/search.js';
import { randomState, inverseMoves } from '../src/solver3/random-state.js';
import { SOLVED3, applyMoves3, isSolved3, toFacelets3, parse3 } from '../src/puzzles/cube3.js';
import { ALL_MOVES, parseMoves } from '../src/engine/facelets.js';
import { randomScramble } from '../src/scramble.js';

let search;
before(() => {
  search = createSearch(buildTables());
});

test('solved -> empty, one move -> one move', () => {
  assert.deepEqual(search.solve(SOLVED3), []);
  for (const m of ALL_MOVES) {
    const sol = search.solve(applyMoves3(SOLVED3, [m]));
    assert.equal(sol.length, 1);
    assert.ok(isSolved3(applyMoves3(applyMoves3(SOLVED3, [m]), sol)));
  }
});

test('short scrambles get short solutions (no longer than the scramble)', () => {
  for (const s of ["R U", "R U F'", "R2 U' F L", "U R2 F' D B2", "L' B U2 R D' F2"]) {
    const moves = parseMoves(s);
    const sol = search.solve(applyMoves3(SOLVED3, moves));
    assert.ok(sol.length <= moves.length, `${s} -> ${sol.length}`);
  }
  for (let i = 0; i < 100; i++) {
    const sol = search.solve(randomState());
    for (let k = 1; k < sol.length; k++) assert.notEqual(sol[k].face, sol[k - 1].face, 'merged');
  }
});

test('random short scrambles (5-10 moves) are almost never answered with a longer solution', () => {
  let longer = 0;
  let total = 0;
  for (let len = 5; len <= 10; len++) {
    for (let i = 0; i < 15; i++) {
      const moves = randomScramble(len, Math.random, ALL_MOVES);
      const sol = search.solve(applyMoves3(SOLVED3, moves));
      total++;
      if (sol.length > len) longer++;
    }
  }
  assert.ok(longer <= total * 0.05, `${longer} of ${total} longer than the scramble`);
});

test('200 random states are solved, mostly within 20 moves', () => {
  const lengths = [];
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) {
    const s = randomState();
    const sol = search.solve(s);
    assert.ok(isSolved3(applyMoves3(s, sol)));
    for (const m of sol) assert.ok(ALL_MOVES.includes(m));
    lengths.push(sol.length);
  }
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  console.log(`# avg ${avg.toFixed(2)}, max ${Math.max(...lengths)}, ${Math.round((performance.now() - t0) / 200)} ms/solve`);
  assert.ok(avg <= 21, `avg ${avg}`);
  assert.ok(Math.max(...lengths) <= 24);
});

test('timeout returns the best solution found so far', () => {
  let clock = 0;
  const s = randomState();
  const sol = search.solve(s, { maxLength: 0, timeoutMs: 50, now: () => (clock += 1) });
  assert.ok(sol.length > 0);
  assert.ok(isSolved3(applyMoves3(s, sol)));
});

test('random states are valid and roughly uniform', () => {
  for (let i = 0; i < 1000; i++) assert.ok(parse3(toFacelets3(randomState())).ok);
  const counts = new Array(12).fill(0);
  for (let i = 0; i < 12000; i++) counts[randomState().ep.indexOf(0)]++;
  for (const c of counts) assert.ok(Math.abs(c - 1000) <= 150, `${counts}`);
});

test('inverse of a solution scrambles the solved cube into that state', () => {
  assert.deepEqual(inverseMoves(parseMoves("R U2 F'")).map((m) => m.face + m.turns).join(), 'F1,U2,R-1');
  for (let i = 0; i < 20; i++) {
    const s = randomState();
    assert.deepEqual(applyMoves3(SOLVED3, inverseMoves(search.solve(s))), s);
  }
});
