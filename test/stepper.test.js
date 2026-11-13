import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStepper, STEP_TURN_MS } from '../src/stepper.js';

function slowView() {
  const shown = [];
  let release;
  return {
    shown,
    release: () => release(),
    showMove(move, direction) {
      shown.push([move, direction]);
      return new Promise((r) => { release = r; });
    },
  };
}

const makeSolution = () => ({ moves: ['a', 'b', 'c'], step: 0 });

test('second goTo while a move is showing is ignored', async () => {
  const view = slowView();
  let sol = makeSolution();
  const stepper = createStepper(view, () => sol);
  const p1 = stepper.goTo(1);
  const p2 = stepper.goTo(1);
  assert.equal(stepper.busy, true);
  view.release();
  assert.deepEqual(await Promise.all([p1, p2]), [true, false]);
  assert.equal(sol.step, 1);
  assert.deepEqual(view.shown, [['a', 1]]);
  assert.equal(stepper.busy, false);
});

test('solution cleared during animation does not throw', async () => {
  const view = slowView();
  let sol = makeSolution();
  const stepper = createStepper(view, () => sol);
  const p = stepper.goTo(1);
  const old = sol;
  sol = null;
  view.release();
  assert.equal(await p, false);
  assert.equal(old.step, 0);
});

test('backward step shows the undone move with direction -1', async () => {
  const view = slowView();
  const sol = { moves: ['a', 'b', 'c'], step: 2 };
  const stepper = createStepper(view, () => sol);
  const p = stepper.goTo(1);
  view.release();
  assert.equal(await p, true);
  assert.deepEqual(view.shown, [['b', -1]]);
});

test('jumps clamp and skip animation', async () => {
  const view = slowView();
  const sol = makeSolution();
  const stepper = createStepper(view, () => sol);
  assert.equal(await stepper.goTo(99), true);
  assert.equal(sol.step, 3);
  assert.equal(await stepper.goTo(3), false);
  assert.deepEqual(view.shown, []);
});

function recordingView() {
  const options = [];
  return { options, showMove: async (move, direction, opts) => { options.push(opts); } };
}

test('single steps animate a quarter turn in 430 ms', () => {
  assert.equal(STEP_TURN_MS, 430);
});

test('turnMs is passed through to the view', async () => {
  const view = recordingView();
  const sol = makeSolution();
  const stepper = createStepper(view, () => sol);
  assert.equal(await stepper.goTo(1, { turnMs: STEP_TURN_MS }), true);
  assert.equal(await stepper.goTo(0, { turnMs: STEP_TURN_MS }), true);
  assert.deepEqual(view.options, [{ turnMs: 430 }, { turnMs: 430 }]);
});

test('without turnMs the view keeps its default duration', async () => {
  const view = recordingView();
  const sol = makeSolution();
  const stepper = createStepper(view, () => sol);
  assert.equal(await stepper.goTo(1), true);
  assert.equal(view.options[0].turnMs, undefined);
});

test('step changed elsewhere during animation is not overwritten', async () => {
  const view = slowView();
  const sol = { moves: ['a', 'b', 'c'], step: 3 };
  const stepper = createStepper(view, () => sol);
  const p = stepper.goTo(2); // animating "prev"
  sol.step = 0; // e.g. replay restarted from the beginning
  view.release();
  assert.equal(await p, false);
  assert.equal(sol.step, 0);
});
