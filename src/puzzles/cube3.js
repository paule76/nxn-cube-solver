// 3x3 cube model: corners (cp, co) and edges (ep, eo) in Kociemba order.
// The facelet order (U R F D L B, 9 each) equals Kociemba's U1…B9, 0-based.
import { CORNER_COLORS, CORNER_NAMES, DEFAULT_SCHEME } from '../cube.js';
import { createMoveSet, ALL_MOVES } from '../engine/facelets.js';
import { FACES, OPPOSITE_FACE } from '../engine/geometry.js';
import { randomScramble } from '../scramble.js';

export { DEFAULT_SCHEME };

/** Facelets of each corner position (URF UFL ULB UBR DFR DLF DBL DRB), clockwise from the U/D sticker. */
export const CORNER_FACELETS3 = Object.freeze([
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
]);

/** Facelets of each edge position (UR UF UL UB DR DF DL DB FR FL BL BR). */
export const EDGE_FACELETS = Object.freeze([
  [5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25],
  [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14],
]);

export const EDGE_COLORS = Object.freeze([
  ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'], ['D', 'R'], ['D', 'F'],
  ['D', 'L'], ['D', 'B'], ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R'],
]);

export const EDGE_NAMES = Object.freeze(['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR']);

/** Centre facelet of each face, in FACES order. */
export const CENTERS = Object.freeze(FACES.map((_, i) => i * 9 + 4));

export const SOLVED3 = Object.freeze({
  cp: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]),
  co: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
  ep: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  eo: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
});

const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];
const OPPOSITE_COLOR = { W: 'Y', Y: 'W', G: 'B', B: 'G', R: 'O', O: 'R' };

/** Renders a state to 54 facelet colours. */
export function toFacelets3(state, scheme = DEFAULT_SCHEME) {
  const f = new Array(54);
  FACES.forEach((face, i) => {
    f[CENTERS[i]] = scheme[face];
  });
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 3; k++) {
      f[CORNER_FACELETS3[i][(k + state.co[i]) % 3]] = scheme[CORNER_COLORS[state.cp[i]][k]];
    }
  }
  for (let i = 0; i < 12; i++) {
    for (let k = 0; k < 2; k++) {
      f[EDGE_FACELETS[i][(k + state.eo[i]) % 2]] = scheme[EDGE_COLORS[state.ep[i]][k]];
    }
  }
  return f;
}

const fail = (code, params = {}) => ({ ok: false, code, params });

// Clockwise colour triples (U, R, F order) of the standard scheme's corners.
const STANDARD_TRIPLES = CORNER_COLORS.map((cc) => cc.map((s) => DEFAULT_SCHEME[s]).join(''));
const isRotationOfStandard = (a, b, c) =>
  [a + b + c, b + c + a, c + a + b].some((t) => STANDARD_TRIPLES.includes(t));

function centersOk(scheme) {
  const colors = FACES.map((f) => scheme[f]);
  if (new Set(colors).size !== 6 || colors.some((c) => !OPPOSITE_COLOR[c])) return false;
  if (FACES.some((f) => scheme[OPPOSITE_FACE[f]] !== OPPOSITE_COLOR[scheme[f]])) return false;
  return isRotationOfStandard(scheme.U, scheme.R, scheme.F); // rejects mirrored schemes
}

function findPiece(sides, pieces) {
  const len = sides.length;
  for (let p = 0; p < pieces.length; p++) {
    for (let o = 0; o < len; o++) {
      if (pieces[p].every((s, k) => s === sides[(k + o) % len])) return { piece: p, ori: o };
    }
  }
  return null;
}

const inversions = (perm) => {
  let n = 0;
  for (let i = 0; i < perm.length; i++) for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) n++;
  return n;
};

/**
 * Reads 54 facelet colours into a 3x3 state. The centres define the colour scheme.
 * @returns {{ok:true, state, scheme}|{ok:false, code:string, params:object}}
 */
export function parse3(facelets) {
  if (facelets.length !== 54 || facelets.some((c) => !c)) return fail('incomplete');
  for (const color of COLORS) {
    const count = facelets.filter((c) => c === color).length;
    if (count !== 9) return fail('colorCount', { color, count, expected: 9 });
  }
  const scheme = Object.fromEntries(FACES.map((f, i) => [f, facelets[CENTERS[i]]]));
  if (!centersOk(scheme)) return fail('centers');
  const sideOf = Object.fromEntries(Object.entries(scheme).map(([side, color]) => [color, side]));

  const cp = [];
  const co = [];
  for (let i = 0; i < 8; i++) {
    const colors = CORNER_FACELETS3[i].map((j) => facelets[j]);
    const sides = colors.map((c) => sideOf[c]);
    const hit = findPiece(sides, CORNER_COLORS);
    if (!hit) {
      const sameSet = new Set(sides).size === 3 && CORNER_COLORS.some((cc) => sides.every((s) => cc.includes(s)));
      return fail(sameSet ? 'cornerOrder' : 'cornerImpossible', { position: CORNER_NAMES[i], colors });
    }
    cp.push(hit.piece);
    co.push(hit.ori);
  }
  const ep = [];
  const eo = [];
  for (let i = 0; i < 12; i++) {
    const colors = EDGE_FACELETS[i].map((j) => facelets[j]);
    const hit = findPiece(colors.map((c) => sideOf[c]), EDGE_COLORS);
    if (!hit) return fail('edgeImpossible', { position: EDGE_NAMES[i], colors });
    ep.push(hit.piece);
    eo.push(hit.ori);
  }
  if (new Set(cp).size !== 8) return fail('duplicateCorner');
  if (new Set(ep).size !== 12) return fail('duplicateEdge');
  if (co.reduce((a, x) => a + x, 0) % 3 !== 0) return fail('twistedCorner');
  if (eo.reduce((a, x) => a + x, 0) % 2 !== 0) return fail('flippedEdge');
  if (inversions(cp) % 2 !== inversions(ep) % 2) return fail('parity');
  return { ok: true, state: { cp, co, ep, eo }, scheme };
}

export function isSolved3(state) {
  return (
    state.cp.every((c, i) => c === i) && state.co.every((o) => o === 0) &&
    state.ep.every((e, i) => e === i) && state.eo.every((o) => o === 0)
  );
}

// --- Moves on the cubie model (derived from the facelet engine) ---------------

const ENGINE = createMoveSet(3);
const SOLVED_FACELETS = toFacelets3(SOLVED3);
const MOVE_CUBIES = new Map(ALL_MOVES.map((m) => [m, parse3(ENGINE.apply(SOLVED_FACELETS, m)).state]));
const cubieMove = (move) => MOVE_CUBIES.get(ALL_MOVES.find((m) => m.face === move.face && m.turns === move.turns));

/** state · move (Kociemba "replaced-by" composition). */
export function applyMove3(s, move) {
  const m = cubieMove(move);
  return {
    cp: m.cp.map((p) => s.cp[p]),
    co: m.cp.map((p, i) => (s.co[p] + m.co[i]) % 3),
    ep: m.ep.map((p) => s.ep[p]),
    eo: m.ep.map((p, i) => (s.eo[p] + m.eo[i]) % 2),
  };
}

export const applyMoves3 = (state, moves) => moves.reduce(applyMove3, state);

/** Puzzle module for the 3x3 (no solver yet – see sub-project B). */
export const cube3 = Object.freeze({
  id: '3x3',
  size: 3,
  moveFaces: Object.freeze(['U', 'D', 'L', 'R', 'F', 'B']),
  solvedFacelets: () => toFacelets3(SOLVED3),
  parse: parse3,
  isSolved: isSolved3,
  applyMoves: (facelets, moves) => ENGINE.applyAll(facelets, moves),
  scramble: (rng = Math.random) => randomScramble(20, rng, ALL_MOVES),
});
