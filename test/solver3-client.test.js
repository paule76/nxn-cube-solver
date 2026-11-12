import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverClient } from '../src/solver3/client.js';
import { createSolvers } from '../src/solvers.js';
import { ALL_MOVES } from '../src/engine/facelets.js';
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
  assert.ok((await s2.solve(scrambled)).length > 0);
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

test('solvers: sizes without a solver return undefined', () => {
  const solvers = createSolvers({ createWorker: () => fakeWorker() });
  assert.equal(solvers.get('4x4'), undefined);
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
