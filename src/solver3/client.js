// Page side of the 3x3 solver worker: turns messages into promises.
import { ALL_MOVES, movesFor } from '../engine/facelets.js';

const MOVES4 = movesFor(4);
const toMoves = (list) => list.map((m) => ALL_MOVES.find((x) => x.face === m.face && x.turns === m.turns));
const toMoves4 = (list) =>
  list.map((m) => MOVES4.find((x) => x.face === m.face && x.turns === m.turns && (x.depth ?? 1) === (m.depth ?? 1)));

/**
 * @param {{ postMessage(msg: object): void, onmessage?: Function, onerror?: Function }} worker
 */
export function createSolverClient(worker) {
  let nextId = 1;
  let isReady = false;
  let failed = false;
  let cached = null; // true: tables came from the browser cache
  const pending = new Map();
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {}); // handled by callers that await it
  let isReady4 = false;
  let ready4 = null; // created by prepare4()
  let resolveReady4;
  let rejectReady4;

  function fail(message) {
    if (failed) return;
    failed = true;
    const error = new Error(message);
    rejectReady(error);
    rejectReady4?.(error);
    for (const p of pending.values()) p.reject(error);
    pending.clear();
  }

  worker.onmessage = ({ data }) => {
    switch (data?.type) {
      case 'ready':
        isReady = true;
        cached = !!data.cached;
        resolveReady({ cached: !!data.cached });
        break;
      case 'ready4':
        isReady4 = true;
        resolveReady4?.();
        break;
      case 'solution4': {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          p.resolve(data.phases.map(({ phase, moves }) => ({ phase, moves: toMoves4(moves) })));
        }
        break;
      }
      case 'solution':
      case 'scramble': {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          p.resolve(toMoves(data.moves));
        }
        break;
      }
      case 'error':
        if (data.id !== undefined && pending.has(data.id)) {
          pending.get(data.id).reject(new Error(data.message));
          pending.delete(data.id);
        } else {
          fail(data.message ?? 'solver error');
        }
        break;
      default:
        break;
    }
  };
  worker.onerror = (e) => {
    e?.preventDefault?.();
    fail(e?.message || 'solver worker failed');
  };

  function request(type, payload) {
    if (failed) return Promise.reject(new Error('solver failed'));
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ type, id, ...payload });
    });
  }

  return {
    ready,
    get isReady() {
      return isReady;
    },
    get failed() {
      return failed;
    },
    get cached() {
      return cached;
    },
    get isReady4() {
      return isReady4;
    },
    /** Asks the worker to build the 4x4 tables (once); resolves when they are ready. */
    prepare4() {
      if (!ready4) {
        ready4 = new Promise((resolve, reject) => {
          resolveReady4 = resolve;
          rejectReady4 = reject;
        });
        ready4.catch(() => {});
        if (failed) rejectReady4(new Error('solver failed'));
        else worker.postMessage({ type: 'prepare4' });
      }
      return ready4;
    },
    get ready4() {
      return this.prepare4();
    },
    solve: (state) => request('solve', { state }),
    solve4: (facelets) => request('solve4', { facelets }),
    randomScramble: () => request('randomScramble', {}),
  };
}
