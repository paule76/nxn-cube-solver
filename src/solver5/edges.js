// 5x5 edge pairing on a cube with solved centres: both wings of each edge are matched to its midge.
// Each step picks the candidate  S · W · F · W⁻¹  that pairs the most wings per move (as on the 4x4):
//   S: setup of 0–2 outer turns (3 only if nothing shorter helps), W: Uw / Uw' / Dw / Dw', F: short outer sequence.
// When nothing helps, one edge has its two wings swapped (edge parity): the parity algorithm fixes it.
import { createMoveSet, parseMoves, moveToString, ALL_MOVES } from '../engine/facelets.js';
import { MIDGE_FACELETS, WING_FACELETS5, WING_NAMES5, X_CENTER_FACELETS, T_CENTER_FACELETS, FIXED_CENTERS } from '../puzzles/cube5.js';
import { EDGE_NAMES } from '../puzzles/cube3.js';

const ENGINE = createMoveSet(5);
const faceOf = (facelet) => Math.floor(facelet / 25);
const byFace = (list) => [...list].sort((a, b) => faceOf(a) - faceOf(b));

// per wing: [its two facelets by face, the midge facelets of its edge by face] flattened (wing a, midge a, wing b, midge b)
const WING_CHECK = Int16Array.from(
  WING_FACELETS5.flatMap((w, k) => {
    const m = byFace(MIDGE_FACELETS[EDGE_NAMES.indexOf(WING_NAMES5[k].slice(0, 2))]);
    const s = byFace(w);
    return [s[0], m[0], s[1], m[1]];
  }),
);

/** Number of wings (0–24) that show the same colours on the same faces as their edge's midge. */
export function pairedWings(f) {
  let n = 0;
  for (let k = 0; k < 96; k += 4) if (f[WING_CHECK[k]] === f[WING_CHECK[k + 1]] && f[WING_CHECK[k + 2]] === f[WING_CHECK[k + 3]]) n++;
  return n;
}

const compose = (a, b) => Int16Array.from(b, (j) => a[j]); // a then b
const identity = Int16Array.from({ length: 150 }, (_, i) => i);
const permOf = (moves) => moves.reduce((p, m) => compose(p, ENGINE.perm(m)), identity);
const inverse = (moves) => [...moves].reverse().map((m) => ({ ...m, turns: m.turns === 2 ? 2 : -m.turns }));
const canonical = (moves) => parseMoves(moves.map(moveToString).join(' '));

const Y = { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D' };
const X2 = { U: 'D', D: 'U', F: 'B', B: 'F', R: 'R', L: 'L' };
const relabel = (moves, map) => moves.map((m) => ({ ...m, face: map[m.face] }));

const FLIPS = ["R U R'", "R U' R'", "R U2 R'", "R' U R", "R' U' R", "R' U2 R", "R U R' F R' F' R", "R F' U R' F"].map(parseMoves);
/** Swaps the two wings of one edge (15 moves, wide turns only; the same sequence as the 4x4 OLL parity). */
export const EDGE_PARITY = Object.freeze(parseMoves("Rw' U2 Lw F2 Lw' F2 Rw2 U2 Rw U2 Rw' U2 F2 Rw2 F2"));

const CENTERS = [...X_CENTER_FACELETS, ...T_CENTER_FACELETS, ...FIXED_CENTERS];
/** True if the permutation keeps every centre on its face. */
const keepsCenters = (perm) => CENTERS.every((j) => faceOf(perm[j]) === faceOf(j));

export function createEdgePairer5() {
  // one ring of wings (Uw / Dw) or both at once (Uw Dw' …), so one step can pair two wings
  const slices = ['Uw', "Uw'", 'Dw', "Dw'", "Uw Dw'", "Uw' Dw", 'Uw Dw', "Uw' Dw'", 'Uw2', 'Dw2'].map(parseMoves);
  const variants = [];
  for (const base of FLIPS) {
    for (const seq of [base, inverse(base)]) {
      let s = seq;
      for (let r = 0; r < 4; r++) {
        variants.push(s, relabel(s, X2));
        s = relabel(s, Y);
      }
    }
  }
  const patterns = [];
  const seen = new Set();
  for (const w of slices) {
    for (const flip of variants) {
      const moves = canonical([...w, ...flip, ...inverse(w)]);
      const perm = permOf(moves);
      const key = perm.join(',');
      if (seen.has(key) || !keepsCenters(perm)) continue;
      seen.add(key);
      patterns.push({ moves, perm });
    }
  }
  const parity = [{ moves: [...EDGE_PARITY], perm: permOf(EDGE_PARITY) }];

  const setups = [{ moves: [], perm: identity }];
  const setups3 = [];
  for (const a of ALL_MOVES) {
    setups.push({ moves: [a], perm: permOf([a]) });
    for (const b of ALL_MOVES) {
      if (b.face === a.face) continue;
      const ab = permOf([a, b]);
      setups.push({ moves: [a, b], perm: ab });
      for (const c of ALL_MOVES) {
        if (c.face === b.face) continue;
        setups3.push({ moves: [a, b, c], perm: compose(ab, ENGINE.perm(c)) });
      }
    }
  }
  for (const p of [...patterns, ...parity]) {
    p.check = Int16Array.from(WING_CHECK, (j) => p.perm[j]);
    // wings whose four checked facelets change: only these can change their paired state
    const touched = [];
    for (let k = 0; k < 96; k += 4) if ([0, 1, 2, 3].some((o) => p.check[k + o] !== WING_CHECK[k + o])) touched.push(k);
    p.touched = Int16Array.from(touched);
    p.touchedMask = touched.reduce((m, k) => m | (1 << (k >> 2)), 0);
  }
  const pairedAt = (g, c, k) => g[c[k]] === g[c[k + 1]] && g[c[k + 2]] === g[c[k + 3]];

  /** Best candidate (most wings gained per move); with `undo`, the setup is undone afterwards (for parity). */
  function bestStep(f, before, candidates, list, undo = false) {
    let best = null;
    const fs = new Array(150);
    for (const s of candidates) {
      for (let j = 0; j < 150; j++) fs[j] = f[s.perm[j]];
      let unpaired = 0;
      for (let k = 0; k < 96; k += 4) if (!pairedAt(fs, WING_CHECK, k)) unpaired |= 1 << (k >> 2);
      for (const p of list) {
        if (!undo && !(p.touchedMask & unpaired)) continue; // cannot gain anything
        let g = fs;
        if (undo) {
          const after = Array.from(p.perm, (j) => fs[j]);
          const back = permOf(inverse(s.moves));
          g = Array.from(back, (j) => after[j]);
          const gain = pairedWings(g) - before;
          if (gain <= 0) continue;
          const len = 2 * s.moves.length + p.moves.length;
          if (!best || len < best.len) best = { len, moves: [...s.moves, ...p.moves, ...inverse(s.moves).map(canonicalMove)], next: g };
          continue;
        }
        const c = p.check;
        const t = p.touched;
        let gain = 0;
        for (let i = 0; i < t.length; i++) {
          const k = t[i];
          if (g[c[k]] === g[c[k + 1]] && g[c[k + 2]] === g[c[k + 3]]) gain++;
          if (!(unpaired & (1 << (k >> 2)))) gain--;
        }
        if (gain <= 0) continue;
        const len = s.moves.length + p.moves.length;
        const score = gain / len;
        if (!best || score > best.score || (score === best.score && len < best.len)) best = { score, len, s, p };
      }
    }
    if (!best || undo) return best;
    const fs2 = Array.from(best.s.perm, (j) => f[j]);
    return { moves: [...best.s.moves, ...best.p.moves], next: Array.from(best.p.perm, (j) => fs2[j]) };
  }

  /** Parity on an unpaired edge (shortest setup ≤ 2 that touches one, undone afterwards). */
  function parityOnUnpaired(f, before) {
    const alg = parity[0];
    for (const s of setups) {
      const fs = Array.from(s.perm, (j) => f[j]);
      const after = Array.from(alg.perm, (j) => fs[j]);
      const g = Array.from(permOf(inverse(s.moves)), (j) => after[j]);
      if (pairedWings(g) >= before - 1) return { moves: [...s.moves, ...alg.moves, ...inverse(s.moves).map(canonicalMove)], next: g };
    }
    return null;
  }

  /**
   * @returns {{ edges: object[], parity: object[] }} pairing moves; parity moves (setup · algorithm · undo) if needed.
   *   Pairing steps after the parity algorithm stay in `parity`, so the moves keep their order in two phases.
   * @throws if the edges cannot be paired (never returns an unpaired cube)
   */
  function pairEdges(start, { maxSteps = 40 } = {}) {
    let f = start;
    const edges = [];
    const parityMoves = [];
    let parityUses = 0;
    for (let step = 0; step < maxSteps && pairedWings(f) < 24; step++) {
      const before = pairedWings(f);
      let best = bestStep(f, before, setups, patterns) ?? bestStep(f, before, setups3, patterns);
      if (best) {
        (parityMoves.length ? parityMoves : edges).push(...best.moves);
      } else {
        // odd wing permutation: the parity algorithm on an unpaired edge, then pairing goes on
        if (++parityUses > 2) break;
        best = bestStep(f, before, setups, parity, true) ?? parityOnUnpaired(f, before);
        if (!best) break;
        parityMoves.push(...best.moves);
      }
      f = best.next;
    }
    const n = pairedWings(f);
    if (n < 24) throw Object.assign(new Error(`edge pairing failed (${n}/24 wings paired)`), { facelets: f });
    return { edges, parity: parityMoves };
  }

  return { pairEdges, patternCount: () => patterns.length };
}

const ALL = [...ALL_MOVES];
const canonicalMove = (m) => ALL.find((x) => x.face === m.face && x.turns === m.turns);
