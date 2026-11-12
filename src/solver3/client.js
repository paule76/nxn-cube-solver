// Page side of the 3x3 solver worker: turns messages into promises.
import { ALL_MOVES } from '../engine/facelets.js';

const toMoves = (list) => list.map((m) => ALL_MOVES.find((x) => x.face === m.face && x.turns === m.turns));

/**
 * @param {{ postMessage(msg: object): void, onmessage?: Function, onerror?: Function }} worker
 */
export function createSolverClient(worker) {
  let nextId = 1;
  let isReady = false;
  let failed = false;
  const pending = new Map();
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {}); // handled by callers that await it

  function fail(message) {
    if (failed) return;
    failed = true;
    const error = new Error(message);
    rejectReady(error);
    for (const p of pending.values()) p.reject(error);
    pending.clear();
  }

  worker.onmessage = ({ data }) => {
    switch (data?.type) {
      case 'ready':
        isReady = true;
        resolveReady({ cached: !!data.cached });
        break;
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
    solve: (state) => request('solve', { state }),
    randomScramble: () => request('randomScramble', {}),
  };
}
