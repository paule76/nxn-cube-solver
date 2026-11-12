import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverClient } from '../src/solver3/client.js';
import { createSolvers } from '../src/solvers.js';
import { ALL_MOVES, WIDE_MOVES } from '../src/engine/facelets.js';
import { PUZZLES } from '../src/puzzles/index.js';

function fakeWorker() {
  return {
    sent: [],
    postMessage(msg) {
      this.sent.push(msg);
    },
    reply(data) {
      this.onmessage({ data });
    },
  };
}

test('ready resolves; answers are matched by id; moves become ALL_MOVES instances', async () => {
  const w = fakeWorker();
  const c = createSolverClient(w);
  assert.equal(c.isReady, false);
  const a = c.solve({ x: 1 });
  const b = c.solve({ x: 2 });
  assert.deepEqual(w.sent.map((m) => [m.type, m.state.x]), [['solve', 1], ['solve', 2]]);
  w.reply({ type: 'ready', cached: true });
  await c.ready;
  assert.equal(c.isReady, true);
  w.reply({ type: 'solution', id: w.sent[1].id, moves: [{ face: 'R', turns: -1 }] });
  w.reply({ type: 'solution', id: w.sent[0].id, moves: [{ face: 'U', turns: 2 }] });
  const [ma, mb] = await Promise.all([a, b]);
  assert.equal(ma[0], ALL_MOVES.find((m) => m.face === 'U' && m.turns === 2));
  assert.equal(mb[0], ALL_MOVES.find((m) => m.face === 'R' && m.turns === -1));
  const s = c.randomScramble();
  w.reply({ type: 'scramble', id: w.sent[2].id, moves: [{ face: 'F', turns: 1 }] });
  assert.equal((await s).length, 1);
});

test('a request error rejects only that request', async () => {
  const w = fakeWorker();
  const c = createSolverClient(w);
  const a = c.solve({});
  w.reply({ type: 'error', id: w.sent[0].id, message: 'bad state' });
  await assert.rejects(a, /bad state/);
  assert.equal(c.failed, false);
});

test('a general error or worker crash fails everything', async () => {
  const w = fakeWorker();
  const c = createSolverClient(w);
  const a = c.solve({});
  w.onerror({ message: 'boom', preventDefault() {} });
  assert.equal(c.failed, true);
  await assert.rejects(a, /boom/);
  await assert.rejects(c.ready);
  await assert.rejects(c.solve({}));
});

test('solvers: 2x2 is ready at once, 3x3 starts its worker lazily', async () => {
  let created = 0;
  let worker;
  const solvers = createSolvers({ createWorker: () => { created++; return (worker = fakeWorker()); } });
  const s2 = solvers.get('2x2');
  assert.equal(s2.isReady, true);
  const p = PUZZLES['2x2'];
  const scrambled = p.parse(p.applyMoves(p.solvedFacelets(), p.scramble())).state;
  assert.ok((await s2.solve(scrambled))[0].moves.length > 0);
  assert.equal(created, 0);
  const s3 = solvers.get('3x3');
  assert.equal(s3.isReady, false);
  solvers.start('3x3');
  solvers.start('3x3');
  assert.equal(created, 1);
  worker.reply({ type: 'ready', cached: false });
  await s3.whenReady();
  assert.equal(s3.isReady, true);
});

test('client: solve4 sends facelets, prepare4 once, phases come back with 4x4 move instances', async () => {
  const w = fakeWorker();
  const c = createSolverClient(w);
  c.prepare4();
  c.prepare4();
  assert.equal(w.sent.filter((m) => m.type === 'prepare4').length, 1);
  assert.equal(c.isReady4, false);
  w.reply({ type: 'ready', cached: true });
  w.reply({ type: 'ready4' });
  await c.ready4;
  assert.equal(c.isReady4, true);
  const p = c.solve4(['W']);
  const msg = w.sent.find((m) => m.type === 'solve4');
  assert.deepEqual(msg.facelets, ['W']);
  w.reply({ type: 'solution4', id: msg.id, phases: [{ phase: 'centers', moves: [{ face: 'R', turns: 1, depth: 2 }, { face: 'U', turns: 2, depth: 1 }] }] });
  const [phase] = await p;
  assert.equal(phase.phase, 'centers');
  assert.equal(phase.moves[0], WIDE_MOVES.find((m) => m.face === 'R' && m.turns === 1));
  assert.equal(phase.moves[1], ALL_MOVES.find((m) => m.face === 'U' && m.turns === 2));
});

test('solvers: every size answers in phases; 4x4 prepares its tables in the worker', async () => {
  let worker;
  const solvers = createSolvers({ createWorker: () => (worker = fakeWorker()) });
  const p = PUZZLES['2x2'];
  const f = p.applyMoves(p.solvedFacelets(), p.scramble());
  const phases = await solvers.get('2x2').solve(p.parse(f).state, f);
  assert.equal(phases.length, 1);
  assert.equal(phases[0].phase, 'solve');
  assert.deepEqual(await solvers.get('2x2').solve(p.parse(p.solvedFacelets()).state, p.solvedFacelets()), []);
  const s4 = solvers.get('4x4');
  assert.ok(s4);
  solvers.start('4x4');
  assert.ok(worker.sent.some((m) => m.type === 'prepare4'));
  worker.reply({ type: 'ready', cached: true });
  assert.equal(s4.isReady, false);
  worker.reply({ type: 'ready4' });
  await s4.whenReady();
  assert.equal(s4.isReady, true);
  const answer = s4.solve({}, ['W']);
  const msg = worker.sent.find((m) => m.type === 'solve4');
  worker.reply({ type: 'solution4', id: msg.id, phases: [{ phase: 'edges', moves: [{ face: 'F', turns: -1, depth: 1 }] }] });
  assert.equal((await answer)[0].phase, 'edges');
});

test('solvers: sizes without a solver return undefined', () => {
  const solvers = createSolvers({ createWorker: () => fakeWorker() });
  assert.equal(solvers.get('9x9'), undefined);
});

test('solvers: a worker that cannot be created reports failure', async () => {
  const solvers = createSolvers({ createWorker: () => { throw new Error('no workers'); } });
  const s3 = solvers.get('3x3');
  solvers.start('3x3');
  assert.equal(s3.failed, true);
  await assert.rejects(s3.whenReady());
  await assert.rejects(s3.solve({}));
});

test('client: a failed 4x4 preparation leaves the 3x3 solver working and can be retried', async () => {
  const w = fakeWorker();
  const c = createSolverClient(w);
  w.reply({ type: 'ready', cached: true });
  const first = c.prepare4();
  w.reply({ type: 'error4', message: 'out of memory' });
  await assert.rejects(first, /out of memory/);
  assert.equal(c.failed, false);
  assert.equal(c.isReady4, false);
  const s = c.solve({});
  w.reply({ type: 'solution', id: w.sent.at(-1).id, moves: [] });
  assert.deepEqual(await s, []);
  const second = c.prepare4();
  assert.notEqual(second, first);
  assert.equal(w.sent.filter((m) => m.type === 'prepare4').length, 2);
  w.reply({ type: 'ready4' });
  await second;
  assert.equal(c.isReady4, true);
});
