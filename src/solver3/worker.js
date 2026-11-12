// Web worker for the 3x3 solver: loads or builds the tables, then answers solve/scramble requests.
import { buildTables, exportTables, importTables } from './tables.js';
import { createSearch } from './search.js';
import { randomState, inverseMoves } from './random-state.js';
import { loadTables, saveTables } from './cache.js';

let search = null;
const plain = (moves) => moves.map(({ face, turns }) => ({ face, turns }));

const init = (async () => {
  let tables = null;
  let cached = false;
  const bytes = await loadTables();
  if (bytes) {
    try {
      tables = importTables(bytes);
      cached = true;
    } catch {
      tables = null; // outdated or damaged cache entry
    }
  }
  if (!tables) {
    tables = buildTables();
    await saveTables(exportTables(tables));
  }
  search = createSearch(tables);
  self.postMessage({ type: 'ready', cached });
})().catch((error) => {
  self.postMessage({ type: 'error', message: String(error?.message ?? error) });
});

self.onmessage = async ({ data }) => {
  await init;
  if (!search) return;
  const { type, id } = data;
  try {
    if (type === 'solve') {
      self.postMessage({ type: 'solution', id, moves: plain(search.solve(data.state)) });
    } else if (type === 'randomScramble') {
      self.postMessage({ type: 'scramble', id, moves: plain(inverseMoves(search.solve(randomState()))) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, message: String(error?.message ?? error) });
  }
};
