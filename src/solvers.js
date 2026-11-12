// One asynchronous solver interface per cube size for the app.
// 2x2: optimal solver in the page (ready at once). 3x3, 4x4 and 5x5: one web worker, started lazily.
// solve(state, facelets) answers in phases: [{ phase, moves }], empty phases left out.
import { PUZZLES } from './puzzles/index.js';
import { createSolverClient } from './solver3/client.js';

const defaultWorker = () => new Worker(new URL('./solver3/worker.js', import.meta.url), { type: 'module' });

const asPhases = (moves) => (moves.length ? [{ phase: 'solve', moves }] : []);

function failedClient(error) {
  const rejected = () => Promise.reject(error);
  const ready = Promise.reject(error);
  ready.catch(() => {});
  return { ready, isReady: false, failed: true, solve: rejected, solveBig: rejected, randomScramble: rejected, prepareBig: rejected, isReadyBig: () => false };
}

/**
 * @param {{ createWorker?: () => Worker }} [options]
 * @returns {{ get(id: string): object, start(id: string): void }}
 */
export function createSolvers({ createWorker = defaultWorker } = {}) {
  const cube2 = PUZZLES['2x2'];
  const solver2 = {
    isReady: true,
    failed: false,
    whenReady: () => Promise.resolve(),
    solve: async (state) => asPhases(cube2.solve(state)),
  };

  let client = null;
  function start3() {
    if (client) return client;
    try {
      client = createSolverClient(createWorker());
    } catch (error) {
      client = failedClient(error);
    }
    return client;
  }
  const solver3 = {
    get isReady() {
      return !!client?.isReady;
    },
    get failed() {
      return !!client?.failed;
    },
    get cached() {
      return client?.cached ?? null;
    },
    whenReady: () => start3().ready,
    solve: (state) => start3().solve(state).then(asPhases),
    randomScramble: () => start3().randomScramble(),
  };

  /** 4x4 / 5x5: tables are built in the worker per size; answers come in phases. */
  const bigSolver = (n) => ({
    get isReady() {
      return !!client?.isReady && !!client?.isReadyBig(n);
    },
    get failed() {
      return !!client?.failed;
    },
    get cached() {
      return client?.cached ?? null;
    },
    whenReady: () => start3().ready.then(() => client.prepareBig(n)),
    // the worker answers in order, so the preparation always runs before this request
    solve: (state, facelets) => {
      const c = start3();
      c.prepareBig(n);
      return c.solveBig(n, facelets);
    },
  });
  const solver4 = bigSolver(4);
  const solver5 = bigSolver(5);

  const byId = { '2x2': solver2, '3x3': solver3, '4x4': solver4, '5x5': solver5 };
  return {
    /** @returns {object|undefined} the solver for this size, or undefined if there is none yet */
    get: (id) => byId[id],
    start(id) {
      if (id === '3x3') start3();
      if (id === '4x4') start3().prepareBig(4);
      if (id === '5x5') start3().prepareBig(5);
    },
  };
}
