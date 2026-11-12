// 4x4 centres in three stages, each solved optimally with a breadth-first distance table:
//  M1: U/D-coloured centres onto U or D            (all 36 moves)
//  M2: F/B-coloured centres onto F or B, keep M1   (M2_MOVES)
//  M3: every centre on its own face, keep M1 + M2  (M3_MOVES)
// Outer-layer turns never move centres to another face, so all 18 belong to M2 and M3.
// Centre slots follow CENTER_FACELETS (grouped by face U R F D L B, 4 each); sets of slots are 24-bit masks.
import { createMoveSet, movesFor, ALL_MOVES, WIDE_MOVES } from '../engine/facelets.js';
import { CENTER_FACELETS } from '../puzzles/cube4.js';

const ENGINE = createMoveSet(4);
const pick = (list, face, turns) => list.find((m) => m.face === face && m.turns === turns);
const all3 = (list, face) => [1, 2, -1].map((t) => pick(list, face, t));

export const M1_MOVES = movesFor(4);
export const M2_MOVES = Object.freeze([
  ...ALL_MOVES, ...all3(WIDE_MOVES, 'U'), ...all3(WIDE_MOVES, 'D'),
  ...['R', 'L', 'F', 'B'].map((f) => pick(WIDE_MOVES, f, 2)),
]);
export const M3_MOVES = Object.freeze([
  ...ALL_MOVES, pick(WIDE_MOVES, 'U', 2), pick(WIDE_MOVES, 'D', 2),
  ...['R', 'L', 'F', 'B'].map((f) => pick(WIDE_MOVES, f, 2)),
]);

const SLOT_OF = new Map(CENTER_FACELETS.map((f, s) => [f, s]));
const FACE_OF_SLOT = ['U', 'R', 'F', 'D', 'L', 'B'].flatMap((f) => [f, f, f, f]);
const slotsOf = (...faces) => FACE_OF_SLOT.map((f, s) => (faces.includes(f) ? s : -1)).filter((s) => s >= 0);
const maskOf = (slots) => slots.reduce((m, s) => m | (1 << s), 0);

// Per move: where each slot's content goes, as three 256-entry byte tables.
const MASK_TABLES = new Map();
for (const move of movesFor(4)) {
  const perm = ENGINE.perm(move); // perm[j] = i: new facelet j holds old facelet i
  const dest = new Int16Array(96);
  perm.forEach((from, to) => {
    dest[from] = to;
  });
  const to = CENTER_FACELETS.map((f) => SLOT_OF.get(dest[f]));
  const tables = [0, 1, 2].map((b) => {
    const t = new Uint32Array(256);
    for (let v = 0; v < 256; v++) {
      let out = 0;
      for (let k = 0; k < 8; k++) if (v & (1 << k)) out |= 1 << to[b * 8 + k];
      t[v] = out;
    }
    return t;
  });
  MASK_TABLES.set(move, tables);
}
const moveMask = (mask, move) => {
  const [t0, t1, t2] = MASK_TABLES.get(move);
  return (t0[mask & 255] | t1[(mask >>> 8) & 255] | t2[(mask >>> 16) & 255]) >>> 0;
};

// M3 keys: the U colour among the U/D slots, F colour among F/B slots, R colour among R/L slots (8 bits each).
const GROUPS = [slotsOf('U', 'D'), slotsOf('F', 'B'), slotsOf('R', 'L')];
const compress = (mask, group) => group.reduce((v, s, k) => (mask & (1 << s) ? v | (1 << k) : v), 0);
const expand = (bits, group) => group.reduce((m, s, k) => (bits & (1 << k) ? m | (1 << s) : m), 0);
const m3Key = (masks) => (compress(masks[0], GROUPS[0]) << 16) | (compress(masks[1], GROUPS[1]) << 8) | compress(masks[2], GROUPS[2]);
const m3Masks = (key) => [expand((key >> 16) & 255, GROUPS[0]), expand((key >> 8) & 255, GROUPS[1]), expand(key & 255, GROUPS[2])];

/** Breadth-first distances from `goal` (moves are closed under inverse, so distance to goal = from goal). */
function bfs(goal, moves, step, store) {
  store.set(goal, 0);
  let frontier = [goal];
  let depth = 0;
  while (frontier.length) {
    const next = [];
    depth++;
    for (const key of frontier) {
      for (const m of moves) {
        const k = step(key, m);
        if (store.get(k) === undefined) {
          store.set(k, depth);
          next.push(k);
        }
      }
    }
    frontier = next;
  }
  return depth - 1;
}

/** Dense distance store for 24-bit keys (M1). */
function denseStore() {
  const data = new Uint8Array(1 << 24).fill(255);
  let size = 0;
  return {
    get: (k) => (data[k] === 255 ? undefined : data[k]),
    set: (k, v) => {
      if (data[k] === 255) size++;
      data[k] = v;
    },
    get size() {
      return size;
    },
  };
}

function sideMask(facelets, sideOf, sides) {
  let m = 0;
  CENTER_FACELETS.forEach((f, s) => {
    if (sides.includes(sideOf[facelets[f]])) m |= 1 << s;
  });
  return m >>> 0;
}

const sideOfScheme = (scheme) => Object.fromEntries(Object.entries(scheme).map(([side, color]) => [color, side]));

const STAGE_KEY = {
  1: (f, so) => sideMask(f, so, ['U', 'D']),
  2: (f, so) => sideMask(f, so, ['F', 'B']),
  3: (f, so) => m3Key([sideMask(f, so, ['U']), sideMask(f, so, ['F']), sideMask(f, so, ['R'])]),
};
const GOAL = {
  1: maskOf(slotsOf('U', 'D')),
  2: maskOf(slotsOf('F', 'B')),
  3: m3Key([maskOf(slotsOf('U')), maskOf(slotsOf('F')), maskOf(slotsOf('R'))]),
};

export function stageReached(facelets, scheme, stage) {
  return STAGE_KEY[stage](facelets, sideOfScheme(scheme)) === GOAL[stage];
}

export const centersSolved = (facelets, scheme) => stageReached(facelets, scheme, 3);

export function createCenterSolver() {
  const d1 = denseStore();
  const d2 = new Map();
  const d3 = new Map();
  const max1 = bfs(GOAL[1], M1_MOVES, moveMask, d1);
  const max2 = bfs(GOAL[2], M2_MOVES, moveMask, d2);
  const max3 = bfs(GOAL[3], M3_MOVES, (key, m) => m3Key(m3Masks(key).map((mask) => moveMask(mask, m))), d3);
  const stages = {
    1: { dist: d1, moves: M1_MOVES, step: moveMask },
    2: { dist: d2, moves: M2_MOVES, step: moveMask },
    3: { dist: d3, moves: M3_MOVES, step: (key, m) => m3Key(m3Masks(key).map((mask) => moveMask(mask, m))) },
  };

  /** Optimal moves for one stage (greedy descent along the distance table). */
  function solveStage(facelets, scheme, stage) {
    const { dist, moves, step } = stages[stage];
    let key = STAGE_KEY[stage](facelets, sideOfScheme(scheme));
    let d = dist.get(key);
    if (d === undefined) throw new Error(`centre stage ${stage}: state not reachable`);
    const out = [];
    while (d > 0) {
      const m = moves.find((mv) => dist.get(step(key, mv)) === d - 1);
      out.push(m);
      key = step(key, m);
      d--;
    }
    return out;
  }

  return {
    solveStage,
    solveCenters(facelets, scheme) {
      let f = facelets;
      const out = [];
      for (const stage of [1, 2, 3]) {
        const moves = solveStage(f, scheme, stage);
        f = ENGINE.applyAll(f, moves);
        out.push(...moves);
      }
      return out;
    },
    stats: () => ({
      m1: { states: d1.size, maxDepth: max1 },
      m2: { states: d2.size, maxDepth: max2 },
      m3: { states: d3.size, maxDepth: max3 },
    }),
  };
}
