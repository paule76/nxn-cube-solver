// 4x4 edge pairing on a cube with solved centres ("slice – flip – unslice").
// Each step picks the cheapest candidate  S · W · F · W⁻¹  that pairs the most edges per move:
//   S: setup of 0–2 outer turns (3 only if nothing shorter helps), W: Uw / Uw' / Dw / Dw', F: a short outer-turn sequence.
// Every pattern W·F·W⁻¹ is checked once to keep all centres on their faces.
import { createMoveSet, parseMoves, moveToString, ALL_MOVES } from '../engine/facelets.js';
import { WING_FACELETS, WING_NAMES, CENTER_FACELETS } from '../puzzles/cube4.js';

const ENGINE = createMoveSet(4);
const faceOf = (facelet) => Math.floor(facelet / 16);

// Slot pairs per edge: [facelets of part 1, facelets of part 2], each sorted by face.
const EDGE_SLOTS = (() => {
  const byEdge = new Map();
  WING_NAMES.forEach((name, k) => {
    const edge = name.slice(0, 2);
    if (!byEdge.has(edge)) byEdge.set(edge, []);
    byEdge.get(edge).push([...WING_FACELETS[k]].sort((a, b) => faceOf(a) - faceOf(b)));
  });
  return [...byEdge.values()];
})();

/** Number of edges (0–12) whose two pieces show the same colours on the same faces. */
export function pairedCount(f) {
  let n = 0;
  for (const [a, b] of EDGE_SLOTS) if (f[a[0]] === f[b[0]] && f[a[1]] === f[b[1]]) n++;
  return n;
}

const compose = (a, b) => Int16Array.from(b, (j) => a[j]); // a then b
const identity = Int16Array.from({ length: 96 }, (_, i) => i);
const permOf = (moves) => moves.reduce((p, m) => compose(p, ENGINE.perm(m)), identity);
const inverse = (moves) => [...moves].reverse().map((m) => ({ ...m, turns: m.turns === 2 ? 2 : -m.turns }));
const canonical = (moves) => parseMoves(moves.map(moveToString).join(' ')); // shared move objects

// Face relabelling by whole-cube rotations (proper rotations keep the turn direction).
const Y = { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D' };
const X2 = { U: 'D', D: 'U', F: 'B', B: 'F', R: 'R', L: 'L' };
const relabel = (moves, map) => moves.map((m) => ({ ...m, face: map[m.face] }));

const FLIPS = ["R U R'", "R U' R'", "R U2 R'", "R' U R", "R' U' R", "R' U2 R", "R U R' F R' F' R", "R F' U R' F"].map(parseMoves);

/** True if the permutation keeps every centre on its face. */
function keepsCenters(perm) {
  const face = new Map(CENTER_FACELETS.map((f) => [f, faceOf(f)]));
  return CENTER_FACELETS.every((j) => face.get(perm[j]) === faceOf(j));
}

export function createEdgePairer() {
  // patterns W · F · W⁻¹
  const slices = ['Uw', "Uw'", 'Dw', "Dw'"].map(parseMoves);
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
  // setups: 0–2 outer turns (and 3 as a fallback when nothing shorter helps)
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

  // For each pattern: the source facelets of the four edge facelets per edge, flattened (12 × 4).
  const EDGE_FACELETS = EDGE_SLOTS.flatMap(([a, b]) => [a[0], b[0], a[1], b[1]]);
  for (const p of patterns) p.edgeSrc = Int16Array.from(EDGE_FACELETS, (j) => p.perm[j]);

  function bestStep(f, before, candidates) {
    let best = null;
    const fs = new Array(96);
    for (const s of candidates) {
      for (let j = 0; j < 96; j++) fs[j] = f[s.perm[j]];
      for (const p of patterns) {
        const src = p.edgeSrc;
        let n = 0;
        for (let k = 0; k < 48; k += 4) if (fs[src[k]] === fs[src[k + 1]] && fs[src[k + 2]] === fs[src[k + 3]]) n++;
        const gain = n - before;
        if (gain <= 0) continue;
        const len = s.moves.length + p.moves.length;
        const score = gain / len;
        if (!best || score > best.score || (score === best.score && len < best.len)) {
          best = { score, len, setup: s, pattern: p };
        }
      }
    }
    if (!best) return null;
    const fs2 = Array.from(best.setup.perm, (j) => f[j]);
    return { moves: [...best.setup.moves, ...best.pattern.moves], next: Array.from(best.pattern.perm, (j) => fs2[j]) };
  }

  function pairEdges(start, { maxSteps = 30 } = {}) {
    let f = start;
    const out = [];
    for (let step = 0; step < maxSteps && pairedCount(f) < 12; step++) {
      const before = pairedCount(f);
      const best = bestStep(f, before, setups) ?? bestStep(f, before, setups3);
      if (!best) break; // no improving step found
      out.push(...best.moves);
      f = best.next;
    }
    return out;
  }

  return { pairEdges, patternCount: () => patterns.length };
}
