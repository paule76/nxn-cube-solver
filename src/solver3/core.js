// Solver core used by the worker: loads or builds the tables, verifies them and every solution,
// and heals a wrong cache entry by rebuilding. Cache access is injected so this runs in Node too.
import * as C from './coords.js';
import { buildTables, exportTables, importTables, PHASE1_MOVES, PHASE2_MOVES } from './tables.js';
import { createSearch } from './search.js';
import { randomState, inverseMoves } from './random-state.js';
import { SOLVED3, applyMove3, applyMoves3, isSolved3 } from '../puzzles/cube3.js';
import { createSolver4 } from '../solver4/reduce.js';

const safely = (fn) => Promise.resolve().then(fn).catch(() => null);

/** Spot-checks the move tables against the cubie model (~1 ms). */
function tablesLookRight(T) {
  for (let k = 0; k < 30; k++) {
    const s1 = applyMoves3(SOLVED3, Array.from({ length: 20 }, () => PHASE1_MOVES[Math.floor(Math.random() * 18)]));
    const s2 = applyMoves3(SOLVED3, Array.from({ length: 20 }, () => PHASE2_MOVES[Math.floor(Math.random() * 10)]));
    for (let j = 0; j < 18; j++) {
      const t = applyMove3(s1, PHASE1_MOVES[j]);
      if (T.twistMove[C.getTwist(s1) * 18 + j] !== C.getTwist(t)) return false;
      if (T.flipMove[C.getFlip(s1) * 18 + j] !== C.getFlip(t)) return false;
      if (T.sliceMove[C.getSlice(s1) * 18 + j] !== C.getSlice(t)) return false;
    }
    for (let j = 0; j < 10; j++) {
      const t = applyMove3(s2, PHASE2_MOVES[j]);
      if (T.cpermMove[C.getCornerPerm(s2) * 10 + j] !== C.getCornerPerm(t)) return false;
      if (T.udepermMove[C.getUDEdgePerm(s2) * 10 + j] !== C.getUDEdgePerm(t)) return false;
      if (T.spermMove[C.getSlicePerm(s2) * 10 + j] !== C.getSlicePerm(t)) return false;
    }
  }
  return true;
}

/**
 * @param {{ load: () => Promise<Uint8Array|null>, save: (b: Uint8Array) => Promise<void>,
 *           clear: () => Promise<void>, build?: () => object }} cache
 */
export function createSolverCore({ load, save, clear, build = buildTables }) {
  let search = null;
  let solver4 = null; // built on first use (~1 s); its 3x3 stage uses the verified 3x3 solver
  let saved = Promise.resolve();

  function rebuild({ dropCache }) {
    const tables = build();
    search = createSearch(tables);
    // Saving happens after the solver is usable; failures only mean "no cache next time".
    saved = (dropCache ? safely(clear) : Promise.resolve()).then(() => safely(() => save(exportTables(tables))));
  }

  /** Solves and verifies; a wrong result means wrong tables: rebuild once and try again. */
  function verifiedSolve(state) {
    let moves = search.solve(state);
    if (isSolved3(applyMoves3(state, moves))) return moves;
    rebuild({ dropCache: true });
    moves = search.solve(state);
    if (isSolved3(applyMoves3(state, moves))) return moves;
    throw new Error('solver produced an invalid solution');
  }

  return {
    /** @returns {Promise<{ cached: boolean }>} */
    async init() {
      const bytes = await safely(load);
      if (bytes) {
        try {
          const tables = importTables(bytes);
          if (tablesLookRight(tables)) {
            search = createSearch(tables);
            return { cached: true };
          }
        } catch {
          // outdated or damaged entry: rebuilt below
        }
      }
      rebuild({ dropCache: !!bytes });
      return { cached: false };
    },
    solve: verifiedSolve,
    /** Builds the 4x4 tables (after init). */
    prepare4() {
      solver4 ??= createSolver4((state) => verifiedSolve(state));
    },
    /** 4x4 in phases; the solver checks the result on the given facelets and throws on any error. */
    solve4(facelets) {
      this.prepare4();
      return solver4.solve(facelets).phases;
    },
    randomScramble: () => inverseMoves(verifiedSolve(randomState())),
    /** Resolves when the last cache write has finished (for tests). */
    get saved() {
      return saved;
    },
  };
}
