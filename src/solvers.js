// One asynchronous solver interface per cube size for the app.
// 2x2: optimal solver in the page (ready at once). 3x3: Kociemba solver in a web worker, started lazily.
import { PUZZLES } from './puzzles/index.js';
import { createSolverClient } from './solver3/client.js';

const defaultWorker = () => new Worker(new URL('./solver3/worker.js', import.meta.url), { type: 'module' });

function failedClient(error) {
  const rejected = () => Promise.reject(error);
  const ready = Promise.reject(error);
  ready.catch(() => {});
  return { ready, isReady: false, failed: true, solve: rejected, randomScramble: rejected };
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
    solve: async (state) => cube2.solve(state),
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
    solve: (state) => start3().solve(state),
    randomScramble: () => start3().randomScramble(),
  };

  return {
    get: (id) => (id === '3x3' ? solver3 : solver2),
    start(id) {
      if (id === '3x3') start3();
    },
  };
}
