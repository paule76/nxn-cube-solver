// Page side of the 3x3 solver worker: turns messages into promises.
import { ALL_MOVES, movesFor } from '../engine/facelets.js';

const MOVES_N = movesFor(4); // outer and two-layer turns (same objects for n = 4 and 5)
const toMoves = (list) => list.map((m) => ALL_MOVES.find((x) => x.face === m.face && x.turns === m.turns));
const toMovesN = (list) =>
  list.map((m) => MOVES_N.find((x) => x.face === m.face && x.turns === m.turns && (x.depth ?? 1) === (m.depth ?? 1)));

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
  // 4x4/5x5 table preparation per size n: { promise, ready, resolve, reject }
  const big = new Map();

  function fail(message) {
    if (failed) return;
    failed = true;
    const error = new Error(message);
    rejectReady(error);
    for (const b of big.values()) b.reject(error);
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
      case 'readyBig': {
        const b = big.get(data.n);
        if (b) {
          b.ready = true;
          b.resolve();
        }
        break;
      }
      case 'solutionBig': {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          p.resolve(data.phases.map(({ phase, moves }) => ({ phase, moves: toMovesN(moves) })));
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
      case 'errorBig': {
        // only this size's preparation failed: reject it and allow a new attempt later
        const b = big.get(data.n);
        big.delete(data.n);
        b?.reject(new Error(data.message ?? `${data.n}x${data.n} solver error`));
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
    /** True once the tables for size n (4 or 5) are built. */
    isReadyBig: (n) => !!big.get(n)?.ready,
    /** Asks the worker to build the tables for size n (once); resolves when they are ready. */
    prepareBig(n) {
      if (!big.has(n)) {
        const b = { ready: false };
        b.promise = new Promise((resolve, reject) => {
          b.resolve = resolve;
          b.reject = reject;
        });
        b.promise.catch(() => {});
        big.set(n, b);
        if (failed) b.reject(new Error('solver failed'));
        else worker.postMessage({ type: 'prepareBig', n });
      }
      return big.get(n).promise;
    },
    solve: (state) => request('solve', { state }),
    solveBig: (n, facelets) => request('solveBig', { n, facelets }),
    randomScramble: () => request('randomScramble', {}),
  };
}
