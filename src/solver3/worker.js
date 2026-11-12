// Web worker for the 3x3 solver: loads or builds the tables, then answers solve/scramble requests.
import { createSolverCore } from './core.js';
import { loadTables, saveTables, clearTables } from './cache.js';

const core = createSolverCore({ load: loadTables, save: saveTables, clear: clearTables });
const plain = (moves) => moves.map(({ face, turns }) => ({ face, turns }));

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
    } else if (type === 'randomScramble') {
      self.postMessage({ type: 'scramble', id, moves: plain(core.randomScramble()) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, message: String(error?.message ?? error) });
  }
};
