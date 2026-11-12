// Kociemba two-phase search. Phase 1 brings the cube into the subgroup
// <U, D, L2, R2, F2, B2> (no twist, no flip, slice edges in the middle layer);
// phase 2 solves it within that subgroup. The total length is shortened step by step.
import * as C from './coords.js';
import { PHASE1_MOVES, PHASE2_MOVES, prune } from './tables.js';
import { applyMoves3, isSolved3 } from '../puzzles/cube3.js';
import { ALL_MOVES } from '../engine/facelets.js';

const FACE_ORDER = ['U', 'D', 'L', 'R', 'F', 'B']; // pairs on the same axis are adjacent
const faceIndex = (m) => FACE_ORDER.indexOf(m.face);
const P1_FACE = PHASE1_MOVES.map(faceIndex);
const P2_FACE = PHASE2_MOVES.map(faceIndex);
const P2_SET = new Set(PHASE2_MOVES);
const MAX_PHASE2 = 18;
const MAX_TOTAL = 30;

/** Skip a move on the same face, and the second face of an axis after the first (D after U is fine, U after D not). */
function allowed(face, lastFace) {
  if (lastFace < 0) return true;
  if (face === lastFace) return false;
  return !((face >> 1) === (lastFace >> 1) && face < lastFace);
}

/**
 * Merges consecutive turns of the same face (R R2 → R', R R' → nothing). Needed because the
 * first phase-2 move may turn the same face as the last phase-1 move.
 */
export function simplify(moves) {
  const out = [];
  for (const m of moves) {
    const prev = out[out.length - 1];
    if (prev && prev.face === m.face) {
      const q = (((prev.turns + m.turns) % 4) + 4) % 4; // quarter turns clockwise
      out.pop();
      if (q !== 0) out.push(ALL_MOVES.find((x) => x.face === m.face && x.turns === (q === 3 ? -1 : q)));
    } else {
      out.push(m);
    }
  }
  return out;
}

/**
 * @param {ReturnType<import('./tables.js').buildTables>} T
 */
export function createSearch(T) {
  const NS = C.N_SLICE;
  const NP = C.N_SPERM;
  const h1 = (tw, fl, sl) => Math.max(prune(T.pTwistSlice, tw * NS + sl), prune(T.pFlipSlice, fl * NS + sl));
  const h2 = (cp, ud, sp) => Math.max(prune(T.pCpermSperm, cp * NP + sp), prune(T.pUdepermSperm, ud * NP + sp));

  /**
   * @param {{cp:number[],co:number[],ep:number[],eo:number[]}} state
   * Stops when a solution of at most `maxLength` moves is known and at least `minSearchMs` have
   * passed (so short scrambles get near-optimal answers), or after `timeoutMs` with the best so far.
   * @param {{ maxLength?: number, minSearchMs?: number, timeoutMs?: number, now?: () => number }} [options]
   * @returns {object[]} moves (instances from ALL_MOVES)
   */
  function solve(state, { maxLength = 20, minSearchMs = 100, timeoutMs = 500, now = () => performance.now() } = {}) {
    if (isSolved3(state)) return [];
    const start = now();
    const deadline = start + timeoutMs;
    const goodEnough = () => best.length <= maxLength && now() - start >= minSearchMs;
    let best = null;
    let done = false;
    let nodes = 0;
    const path1 = [];
    const path2 = [];

    const shouldStop = () => {
      if (++nodes % 256 !== 0) return false;
      return now() > deadline || goodEnough();
    };

    function phase2(cp, ud, sp, togo, lastFace) {
      if (togo === 0) return cp === 0 && ud === 0 && sp === 0;
      if (h2(cp, ud, sp) > togo) return false;
      for (let j = 0; j < PHASE2_MOVES.length; j++) {
        const f = P2_FACE[j];
        if (!allowed(f, lastFace)) continue;
        path2.push(PHASE2_MOVES[j]);
        if (phase2(T.cpermMove[cp * 10 + j], T.udepermMove[ud * 10 + j], T.spermMove[sp * 10 + j], togo - 1, f)) return true;
        path2.pop();
      }
      return false;
    }

    function startPhase2() {
      const last = path1[path1.length - 1];
      // A phase-1 path ending in a phase-2 move is redundant: a shorter one exists.
      if (last && P2_SET.has(last)) return;
      const s = applyMoves3(state, path1);
      const cp = C.getCornerPerm(s);
      const ud = C.getUDEdgePerm(s);
      const sp = C.getSlicePerm(s);
      const limit = Math.min(MAX_PHASE2, (best ? best.length - 1 : MAX_TOTAL) - path1.length);
      // The first phase-2 move may turn the same face as the last phase-1 move (merged afterwards).
      for (let d = h2(cp, ud, sp); d <= limit; d++) {
        path2.length = 0;
        if (phase2(cp, ud, sp, d, -1)) {
          const candidate = simplify([...path1, ...path2]);
          if (!best || candidate.length < best.length) best = candidate;
          if (goodEnough()) done = true;
          return;
        }
      }
    }

    function phase1(tw, fl, sl, togo, lastFace) {
      if (done) return;
      if (best && shouldStop()) {
        done = true;
        return;
      }
      if (togo === 0) {
        if (tw === 0 && fl === 0 && sl === 0) startPhase2();
        return;
      }
      if (h1(tw, fl, sl) > togo) return;
      for (let j = 0; j < 18; j++) {
        const f = P1_FACE[j];
        if (!allowed(f, lastFace)) continue;
        path1.push(PHASE1_MOVES[j]);
        phase1(T.twistMove[tw * 18 + j], T.flipMove[fl * 18 + j], T.sliceMove[sl * 18 + j], togo - 1, f);
        path1.pop();
        if (done) return;
      }
    }

    const tw = C.getTwist(state);
    const fl = C.getFlip(state);
    const sl = C.getSlice(state);
    for (let d1 = h1(tw, fl, sl); d1 <= 20 && !done; d1++) {
      if (best && d1 >= best.length) break; // phase 1 alone would already be as long as the best
      phase1(tw, fl, sl, d1, -1);
    }
    return best ?? [];
  }

  return { solve };
}
