// Web worker for the 3x3 solver: loads or builds the tables, then answers solve/scramble requests.
import { createSolverCore } from './core.js';
import { loadTables, saveTables, clearTables } from './cache.js';

const core = createSolverCore({ load: loadTables, save: saveTables, clear: clearTables });
const plain = (moves) => moves.map(({ face, turns }) => ({ face, turns }));
const plain4 = (moves) => moves.map(({ face, turns, depth }) => ({ face, turns, depth: depth ?? 1 }));

const init = core
  .init()
  .then(({ cached }) => {
    self.postMessage({ type: 'ready', cached });
    return true;
  })
  .catch((error) => {
    self.postMessage({ type: 'error', message: String(error?.message ?? error) });
    return false;
  });

self.onmessage = async ({ data }) => {
  if (!(await init)) return;
  const { type, id } = data;
  try {
    if (type === 'solve') {
      self.postMessage({ type: 'solution', id, moves: plain(core.solve(data.state)) });
    } else if (type === 'prepare4') {
      // own error type: a failed 4x4 build must not take the 2x2/3x3 solvers down with it
      try {
        core.prepare4();
        self.postMessage({ type: 'ready4' });
      } catch (error) {
        self.postMessage({ type: 'error4', message: String(error?.message ?? error) });
      }
    } else if (type === 'solve4') {
      const phases = core.solve4(data.facelets).map(({ phase, moves }) => ({ phase, moves: plain4(moves) }));
      self.postMessage({ type: 'solution4', id, phases });
    } else if (type === 'randomScramble') {
      self.postMessage({ type: 'scramble', id, moves: plain(core.randomScramble()) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, message: String(error?.message ?? error) });
  }
};
