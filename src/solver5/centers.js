// 5x5 centres (x- and t-centres together) in four steps:
//  Z1: U/D-coloured centres onto U or D                         (all 36 moves, IDA*)
//  Z2: F/B-coloured centres onto F or B, keep Z1                 (Z2_MOVES, IDA*)
//  Z3a: U and D centres on their own face, keep Z1 + Z2          (Z3_MOVES, exact table: 4900 states)
//  Z3b: F/B and R/L centres on their own face, keep the rest     (Z3B_MOVES, IDA*)
// IDA* uses max(h_x, h_t) from one distance table per centre kind. A node budget keeps Z1/Z2 fast:
// when it runs out, the x-centres are solved first (optimal) and both kinds afterwards.
// On a 5x5 all turns of one axis commute (U, Uw, Dw, D), so the search keeps them in one fixed order.
import { createMoveSet, movesFor, ALL_MOVES, WIDE_MOVES } from '../engine/facelets.js';
import { X_CENTER_FACELETS, T_CENTER_FACELETS } from '../puzzles/cube5.js';
import { AXIS_VIEWS, SIDE_VIEWS } from './rotate.js';

const ENGINE = createMoveSet(5);
const pick = (list, face, turns) => list.find((m) => m.face === face && m.turns === turns);
const all3 = (list, face) => [1, 2, -1].map((t) => pick(list, face, t));

export const Z1_MOVES = movesFor(5);
export const Z2_MOVES = Object.freeze([
  ...ALL_MOVES, ...all3(WIDE_MOVES, 'U'), ...all3(WIDE_MOVES, 'D'),
  ...['R', 'L', 'F', 'B'].map((f) => pick(WIDE_MOVES, f, 2)),
]);
export const Z3_MOVES = Object.freeze([
  ...ALL_MOVES, pick(WIDE_MOVES, 'U', 2), pick(WIDE_MOVES, 'D', 2),
  ...['R', 'L', 'F', 'B'].map((f) => pick(WIDE_MOVES, f, 2)),
]);
// After Z3a only these turns still move side centres (U/D outer turns move none of them).
export const Z3B_MOVES = Object.freeze([
  ...ALL_MOVES.filter((m) => 'RLFB'.includes(m.face)), pick(WIDE_MOVES, 'U', 2), pick(WIDE_MOVES, 'D', 2),
]);

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const faceOfFacelet = (j) => FACES[Math.floor(j / 25)];
const AXIS = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
// order of the four layers of an axis: U, Uw, Dw, D (likewise F…B, R…L)
const LAYER_RANK = { U: [0, 1], F: [0, 1], R: [0, 1], D: [3, 2], B: [3, 2], L: [3, 2] };
const layerRank = (m) => LAYER_RANK[m.face][(m.depth ?? 1) - 1];

/** canFollow[a * n + b]: move b may follow move a (different axis, or a later layer of the same axis). */
function followTable(moves) {
  const n = moves.length;
  const t = new Uint8Array(n * n);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      const same = AXIS[moves[a].face] === AXIS[moves[b].face];
      t[a * n + b] = !same || layerRank(moves[b]) > layerRank(moves[a]) ? 1 : 0;
    }
  }
  return t;
}

// --- Tables for one centre kind ---------------------------------------------------------

/** Where each slot's content goes, per move. */
function slotMoves(facelets, moves) {
  const slotOf = new Map(facelets.map((f, s) => [f, s]));
  return moves.map((move) => {
    const perm = ENGINE.perm(move); // perm[j] = i: new facelet j holds old facelet i
    const dest = new Int16Array(perm.length);
    perm.forEach((from, to) => {
      dest[from] = to;
    });
    return facelets.map((f) => slotOf.get(dest[f]));
  });
}

/** 24-bit slot-mask stepping with three byte tables per move (stage Z1: 735 471 states). */
function maskKind(facelets, moves, goalSides) {
  const to = slotMoves(facelets, moves);
  const tables = to.map((dest) =>
    [0, 1, 2].map((b) => {
      const t = new Uint32Array(256);
      for (let v = 0; v < 256; v++) {
        let out = 0;
        for (let k = 0; k < 8; k++) if (v & (1 << k)) out |= 1 << dest[b * 8 + k];
        t[v] = out;
      }
      return t;
    }),
  );
  const next = (k, i) => {
    const [t0, t1, t2] = tables[i];
    return (t0[k & 255] | t1[(k >>> 8) & 255] | t2[(k >>> 16) & 255]) >>> 0;
  };
  const maskOf = (labels) => labels.reduce((m, side, s) => (goalSides.includes(side) ? m | (1 << s) : m), 0) >>> 0;
  const goal = maskOf(facelets.map(faceOfFacelet));
  const d = new Uint8Array(1 << 24).fill(255);
  d[goal] = 0;
  let frontier = new Int32Array([goal]);
  for (let depth = 1; frontier.length; depth++) {
    let out = new Int32Array(1024);
    let n = 0;
    for (let i = 0; i < frontier.length; i++) {
      for (let m = 0; m < moves.length; m++) {
        const k = next(frontier[i], m);
        if (d[k] === 255) {
          d[k] = depth;
          if (n === out.length) {
            const grown = new Int32Array(n * 2);
            grown.set(out);
            out = grown;
          }
          out[n++] = k;
        }
      }
    }
    frontier = out.subarray(0, n);
  }
  return { next, dist: (k) => d[k], key: maskOf, size: 1 << 24 };
}

/**
 * Indexed tables for a small state space: states are found by breadth-first search over slot labellings
 * from the goal; `abstract(labels)` is the part of a labelling the stage cares about (a number).
 */
function indexedKind(facelets, moves, abstract) {
  const to = slotMoves(facelets, moves);
  const step = (labels, i) => {
    const out = new Array(labels.length);
    for (let s = 0; s < labels.length; s++) out[to[i][s]] = labels[s];
    return out;
  };
  const goal = facelets.map(faceOfFacelet);
  const index = new Map([[abstract(goal), 0]]);
  const reps = [goal];
  const dist = [0];
  for (let q = 0; q < reps.length; q++) {
    for (let i = 0; i < moves.length; i++) {
      const n = step(reps[q], i);
      const k = abstract(n);
      if (!index.has(k)) {
        index.set(k, reps.length);
        reps.push(n);
        dist.push(dist[q] + 1);
      }
    }
  }
  const nMoves = moves.length;
  const trans = new Int32Array(reps.length * nMoves);
  reps.forEach((labels, q) => {
    for (let i = 0; i < nMoves; i++) trans[q * nMoves + i] = index.get(abstract(step(labels, i)));
  });
  const d = Uint8Array.from(dist);
  return {
    next: (k, i) => trans[k * nMoves + i],
    dist: (k) => d[k],
    key: (labels) => {
      const k = index.get(abstract(labels));
      if (k === undefined) throw new Error('centre state not reachable in this stage');
      return k;
    },
    size: reps.length,
  };
}

const memberMask = (labels, sides) => labels.reduce((m, side, s) => (sides.includes(side) ? m | (1 << s) : m), 0) >>> 0;
const restricted = (labels, faces, side) => {
  let m = 0;
  let k = 0;
  labels.forEach((l, s) => {
    if (faces.includes(FACE_OF_SLOT[s])) {
      if (l === side) m |= 1 << k;
      k++;
    }
  });
  return m;
};
const FACE_OF_SLOT = FACES.flatMap((f) => [f, f, f, f]); // slot order: grouped by face, 4 each

// --- Search ---------------------------------------------------------------------------------

function createStage(moves, x, t) {
  const n = moves.length;
  const follow = followTable(moves);

  /** (Weighted) IDA* over both tables; returns move indices or null when the node budget runs out. */
  function ida(kx, kt, budget, weight = 1) {
    const path = [];
    let nodes = 0;
    function dfs(kx, kt, g, bound, last) {
      const h = Math.max(x.dist(kx), t.dist(kt));
      if (h === 0) return true;
      if (g + weight * h > bound) return false;
      if (++nodes > budget) throw nodes;
      const row = last * n;
      for (let i = 0; i < n; i++) {
        if (last >= 0 && !follow[row + i]) continue;
        path.push(i);
        if (dfs(x.next(kx, i), t.next(kt, i), g + 1, bound, i)) return true;
        path.pop();
      }
      return false;
    }
    try {
      for (let bound = weight * Math.max(x.dist(kx), t.dist(kt)); bound < 90; bound++) {
        if (dfs(kx, kt, 0, bound, -1)) return path;
      }
    } catch (e) {
      if (typeof e === 'number') return null;
      throw e;
    }
    throw new Error('centre stage: no solution found');
  }

  /** Optimal moves for one kind alone (descent along its table). */
  function descend(kind, k) {
    const out = [];
    for (let d = kind.dist(k); d > 0; d--) {
      const i = moves.findIndex((_, j) => kind.dist(kind.next(k, j)) === d - 1);
      out.push(i);
      k = kind.next(k, i);
    }
    return out;
  }

  return {
    moves,
    h: (kx, kt) => Math.max(x.dist(kx), t.dist(kt)),
    /** Optimal moves, or null if the node budget runs out. */
    optimal: (kx, kt, budget) => ida(kx, kt, budget),
    /** One kind first (optimal, `first` = 'x' or 't'), then both; null if the budget runs out. */
    split(kx, kt, first, budget) {
      const pre = first === 'x' ? descend(x, kx) : descend(t, kt);
      for (const i of pre) {
        kx = x.next(kx, i);
        kt = t.next(kt, i);
      }
      const rest = ida(kx, kt, budget);
      return rest && [...pre, ...rest];
    },
    /** Optimal within the budget; otherwise the first table's part first (optimal), then both. */
    solve(kx, kt, budget) {
      const path = ida(kx, kt, budget);
      if (path) return path;
      const first = descend(x, kx);
      for (const i of first) {
        kx = x.next(kx, i);
        kt = t.next(kt, i);
      }
      return [...first, ...ida(kx, kt, Infinity)];
    },
  };
}

/** Exact table over both kinds together (small stages only): optimal by descent. */
function createExactStage(moves, x, t) {
  const n = moves.length;
  const size = x.size * t.size;
  const d = new Uint8Array(size).fill(255);
  const goal = 0; // index 0 is the goal in indexed tables
  d[goal] = 0;
  let frontier = [goal];
  for (let depth = 1; frontier.length; depth++) {
    const out = [];
    for (const k of frontier) {
      const kx = Math.floor(k / t.size);
      const kt = k % t.size;
      for (let i = 0; i < n; i++) {
        const j = x.next(kx, i) * t.size + t.next(kt, i);
        if (d[j] === 255) {
          d[j] = depth;
          out.push(j);
        }
      }
    }
    frontier = out;
  }
  return {
    moves,
    solve(kx, kt) {
      const out = [];
      let k = kx * t.size + kt;
      if (d[k] === 255) throw new Error('centre stage: state not reachable');
      for (let dk = d[k]; dk > 0; dk--) {
        const i = moves.findIndex((_, j) => d[x.next(Math.floor(k / t.size), j) * t.size + t.next(k % t.size, j)] === dk - 1);
        out.push(i);
        k = x.next(Math.floor(k / t.size), i) * t.size + t.next(k % t.size, i);
      }
      return out;
    },
  };
}

// --- Stages -----------------------------------------------------------------------------------

const STAGES = [
  { name: 'Z1', moves: Z1_MOVES, kind: (fl) => maskKind(fl, Z1_MOVES, ['U', 'D']), search: 'ida' },
  { name: 'Z2', moves: Z2_MOVES, kind: (fl) => indexedKind(fl, Z2_MOVES, (l) => memberMask(l, ['F', 'B'])), search: 'ida' },
  { name: 'Z3a', moves: Z3_MOVES, kind: (fl) => indexedKind(fl, Z3_MOVES, (l) => restricted(l, ['U', 'D'], 'U')), search: 'exact' },
  // Z3b: the F/B part and the R/L part each change only with themselves under Z3B_MOVES, so each gets an
  // exact table over x- and t-centres together (70 × 70 states); IDA* uses the larger of the two.
  { name: 'Z3b', moves: Z3B_MOVES, parts: [['F', 'B'], ['R', 'L']], search: 'ida' },
];

/** Part table over both kinds: labels = x slots then t slots. */
const bothKinds = (moves, faces) =>
  indexedKind([...X_CENTER_FACELETS, ...T_CENTER_FACELETS], moves, (l) =>
    restricted(l.slice(0, 24), faces, faces[0]) * 256 + restricted(l.slice(24), faces, faces[0]),
  );

const labelsOf = (f, facelets, sideOf) => facelets.map((j) => sideOf[f[j]]);
const sideOfScheme = (scheme) => Object.fromEntries(Object.entries(scheme).map(([side, color]) => [color, side]));

/** True if the stage goal (0 = Z1 … 3 = Z3b) holds for both centre kinds. */
export function stageReached5(facelets, scheme, stage) {
  const sideOf = sideOfScheme(scheme);
  return [X_CENTER_FACELETS, T_CENTER_FACELETS].every((fl) => {
    const l = labelsOf(facelets, fl, sideOf);
    const ok = (sides) => l.every((side, s) => sides.includes(side) === sides.includes(FACE_OF_SLOT[s]));
    if (stage === 0) return ok(['U', 'D']);
    if (stage === 1) return ok(['U', 'D']) && ok(['F', 'B']);
    if (stage === 2) return ok(['U', 'D']) && ok(['F', 'B']) && ok(['U']);
    return l.every((side, s) => side === FACE_OF_SLOT[s]);
  });
}

export const centersSolved5 = (facelets, scheme) => stageReached5(facelets, scheme, 3);

export function createCenterSolver5({ nodeBudget = 1e5 } = {}) {
  const stages = STAGES.map((def) => {
    if (def.parts) {
      // two parts over both kinds; each key reads the x and t labels together
      const [a, b] = def.parts.map((faces) => bothKinds(def.moves, faces));
      const both = (f, sideOf) => [...labelsOf(f, X_CENTER_FACELETS, sideOf), ...labelsOf(f, T_CENTER_FACELETS, sideOf)];
      return { keys: (f, sideOf) => [a.key(both(f, sideOf)), b.key(both(f, sideOf))], run: createStage(def.moves, a, b) };
    }
    const x = def.kind(X_CENTER_FACELETS);
    const t = def.kind(T_CENTER_FACELETS);
    return {
      keys: (f, sideOf) => [x.key(labelsOf(f, X_CENTER_FACELETS, sideOf)), t.key(labelsOf(f, T_CENTER_FACELETS, sideOf))],
      run: def.search === 'exact' ? createExactStage(def.moves, x, t) : createStage(def.moves, x, t),
    };
  });

  function solveStage(f, scheme, stage) {
    const { keys, run } = stages[stage];
    const [ka, kb] = keys(f, sideOfScheme(scheme));
    return run.solve(ka, kb, nodeBudget).map((i) => run.moves[i]);
  }

  /**
   * Runs `stage` in the cheapest of several views (each a whole-cube rotation): optimal within the node
   * budget if possible, else one centre kind first and then both (budgeted), else x first without limit.
   * @returns {{ view, f, sc, moves }} moves in that view, f after them
   */
  function inBestView(stage, facelets, scheme, views) {
    const S = stages[stage];
    const options = views
      .map((view) => {
        const f = view.facelets(facelets);
        const sc = view.scheme(scheme);
        const [a, b] = S.keys(f, sideOfScheme(sc));
        return { view, f, sc, a, b, h: S.run.h(a, b) };
      })
      .sort((p, q) => p.h - q.h);
    // optimal in some view, else one kind first (x or t, any view), else x first without a budget
    const tries = [
      ...options.map((c) => [c, () => S.run.optimal(c.a, c.b, nodeBudget)]),
      ...options.flatMap((c) => ['x', 't'].map((k) => [c, () => S.run.split(c.a, c.b, k, nodeBudget)])),
      [options[0], () => S.run.solve(options[0].a, options[0].b, 0)],
    ];
    let chosen = null;
    let path = null;
    for (const [c, attempt] of tries) {
      path = attempt();
      if (path) {
        chosen = c;
        break;
      }
    }
    const moves = path.map((i) => S.run.moves[i]);
    return { view: chosen.view, f: ENGINE.applyAll(chosen.f, moves), sc: chosen.sc, moves };
  }

  /**
   * All centre stages: Z1 along the cheapest axis, Z2 with the cheaper side pair; Z3a/Z3b in that view.
   * Moves are translated back to the original holding.
   */
  function solveCenters(facelets, scheme) {
    const one = inBestView(0, facelets, scheme, AXIS_VIEWS);
    const two = inBestView(1, one.f, one.sc, SIDE_VIEWS);
    let f = two.f;
    const rest = [];
    for (let stage = 2; stage < STAGES.length; stage++) {
      const moves = solveStage(f, two.sc, stage);
      f = ENGINE.applyAll(f, moves);
      rest.push(...moves);
    }
    return one.view.movesBack([...one.moves, ...two.view.movesBack([...two.moves, ...rest])]);
  }

  return { solveStage, solveCenters };
}
