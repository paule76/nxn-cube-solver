// 5x5 cube model: 8 corners, 12 midges (middle edge pieces, like 3x3 edges), 24 wings (outer edge pieces,
// like the 4x4), 24 x-centres, 24 t-centres and 6 fixed centres that define the colour scheme (like the 3x3).
// Pieces are derived from the N×N geometry.
import { CORNER_FACELETS, CORNER_COLORS, CORNER_NAMES, DEFAULT_SCHEME } from '../cube.js';
import { createGeometry, FACES, FACE_NORMALS } from '../engine/geometry.js';
import { createMoveSet, movesFor } from '../engine/facelets.js';
import { randomScramble } from '../scramble.js';
import { EDGE_FACELETS, EDGE_COLORS, EDGE_NAMES, centersOk, findPiece, inversions } from './cube3.js';

const N = 5;
const M = N - 1;
const G2 = createGeometry(2);
const G3 = createGeometry(3);
const G5 = createGeometry(N);
const key = (p, v) => `${p}|${v}`;
const INDEX5 = new Map(G5.stickers.map((s, i) => [key(s.position, s.normal), i]));
const scaled = (G, factor) => (j) => {
  const s = G.stickers[j];
  return INDEX5.get(key(s.position.map((x) => x * factor), s.normal));
};
const faceOfNormal = (v) => FACES.find((f) => FACE_NORMALS[f].every((x, k) => x === v[k]));

/** Corner facelets in the 2x2 order (URF UFL ULB UBR DFR DLF DBL DRB), clockwise from the U/D sticker. */
export const CORNER_FACELETS5 = Object.freeze(CORNER_FACELETS.map((list) => Object.freeze(list.map(scaled(G2, M)))));
/** Midge facelets in the 3x3 edge order (UR UF UL UB DR DF DL DB FR FL BL BR). */
export const MIDGE_FACELETS = Object.freeze(EDGE_FACELETS.map((list) => Object.freeze(list.map(scaled(G3, M / 2)))));
/** The fixed centre of each face, in FACES order. */
export const FIXED_CENTERS = Object.freeze(FACES.map((_, i) => i * N * N + (N * N - 1) / 2));

// --- Wings (as on the 4x4: fixed reading order, names UR1/UR2 …) -----------------------

const EDGE_ORDER = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const outerCount = (p) => p.filter((x) => Math.abs(x) === M).length;

const wingSlots = (() => {
  const groups = new Map();
  G5.stickers.forEach((s, i) => {
    if (outerCount(s.position) !== 2) return;
    const free = s.position.find((x) => Math.abs(x) !== M);
    if (free === 0) return; // midge
    const k = String(s.position);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const slots = [...groups.values()].map((pair) => {
    const [a, b] = pair.map((i) => G5.stickers[i]);
    // reading order that is kept by every rotation: (n1 × n2) · p > 0
    const ordered = dot(cross(a.normal, b.normal), a.position) > 0 ? pair : [pair[1], pair[0]];
    const faces = ordered.map((i) => faceOfNormal(G5.stickers[i].normal));
    const edge = EDGE_ORDER.find((e) => faces.every((f) => e.includes(f)));
    const along = a.position.findIndex((x) => Math.abs(x) !== M);
    const part = a.position[along] < 0 ? 1 : 2;
    return { facelets: ordered, faces, name: `${edge}${part}` };
  });
  slots.sort((x, y) => EDGE_ORDER.indexOf(x.name.slice(0, 2)) - EDGE_ORDER.indexOf(y.name.slice(0, 2)) || x.name.localeCompare(y.name));
  return slots;
})();

export const WING_FACELETS5 = Object.freeze(wingSlots.map((s) => Object.freeze(s.facelets)));
export const WING_NAMES5 = Object.freeze(wingSlots.map((s) => s.name));
const WING_COLORS = wingSlots.map((s) => s.faces);
const WING_BY_SIDES = new Map(WING_COLORS.map((sides, k) => [sides.join(''), k]));

// --- Centres ------------------------------------------------------------------------

const centreKind = (p) => {
  const inner = p.filter((x) => Math.abs(x) !== M);
  if (inner.every((x) => x === 0)) return 'fixed';
  return inner.some((x) => x === 0) ? 't' : 'x';
};
const centreSlots = (kind) =>
  Object.freeze(G5.stickers.map((s, i) => (outerCount(s.position) === 1 && centreKind(s.position) === kind ? i : -1)).filter((i) => i >= 0));
/** x-centres (diagonal to the fixed centre), grouped by face U R F D L B, 4 each. */
export const X_CENTER_FACELETS = centreSlots('x');
/** t-centres (next to the fixed centre), grouped by face, 4 each. */
export const T_CENTER_FACELETS = centreSlots('t');
const faceOfFacelet = (j) => FACES[Math.floor(j / (N * N))];

export const SOLVED5 = Object.freeze({
  cp: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]),
  co: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
  mp: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  mo: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  wp: Object.freeze(Array.from({ length: 24 }, (_, i) => i)),
  xc: Object.freeze(X_CENTER_FACELETS.map(faceOfFacelet)),
  tc: Object.freeze(T_CENTER_FACELETS.map(faceOfFacelet)),
});

export function toFacelets5(state, scheme = DEFAULT_SCHEME) {
  const f = new Array(6 * N * N);
  FACES.forEach((face, i) => {
    f[FIXED_CENTERS[i]] = scheme[face];
  });
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 3; k++) f[CORNER_FACELETS5[i][(k + state.co[i]) % 3]] = scheme[CORNER_COLORS[state.cp[i]][k]];
  }
  for (let i = 0; i < 12; i++) {
    for (let k = 0; k < 2; k++) f[MIDGE_FACELETS[i][(k + state.mo[i]) % 2]] = scheme[EDGE_COLORS[state.mp[i]][k]];
  }
  for (let i = 0; i < 24; i++) {
    WING_FACELETS5[i].forEach((j, k) => {
      f[j] = scheme[WING_COLORS[state.wp[i]][k]];
    });
  }
  X_CENTER_FACELETS.forEach((j, i) => {
    f[j] = scheme[state.xc[i]];
  });
  T_CENTER_FACELETS.forEach((j, i) => {
    f[j] = scheme[state.tc[i]];
  });
  return f;
}

const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];
const fail = (code, params = {}) => ({ ok: false, code, params });

/**
 * Reads 150 facelet colours into a 5x5 state. The fixed centres define the colour scheme.
 * @returns {{ok:true, state, scheme}|{ok:false, code:string, params:object}}
 */
export function parse5(facelets) {
  if (facelets.length !== 6 * N * N || facelets.some((c) => !c)) return fail('incomplete');
  for (const color of COLORS) {
    const count = facelets.filter((c) => c === color).length;
    if (count !== N * N) return fail('colorCount', { color, count, expected: N * N });
  }
  const scheme = Object.fromEntries(FACES.map((f, i) => [f, facelets[FIXED_CENTERS[i]]]));
  if (!centersOk(scheme)) return fail('centers');
  const sideOf = Object.fromEntries(Object.entries(scheme).map(([side, color]) => [color, side]));

  const cp = [];
  const co = [];
  for (let i = 0; i < 8; i++) {
    const colors = CORNER_FACELETS5[i].map((j) => facelets[j]);
    const sides = colors.map((c) => sideOf[c]);
    const hit = findPiece(sides, CORNER_COLORS);
    if (!hit) {
      const sameSet = new Set(sides).size === 3 && CORNER_COLORS.some((cc) => sides.every((s) => cc.includes(s)));
      return fail(sameSet ? 'cornerOrder' : 'cornerImpossible', { position: CORNER_NAMES[i], colors });
    }
    cp.push(hit.piece);
    co.push(hit.ori);
  }
  const mp = [];
  const mo = [];
  for (let i = 0; i < 12; i++) {
    const colors = MIDGE_FACELETS[i].map((j) => facelets[j]);
    const hit = findPiece(colors.map((c) => sideOf[c]), EDGE_COLORS);
    if (!hit) return fail('edgeImpossible', { position: EDGE_NAMES[i], colors, midge: true });
    mp.push(hit.piece);
    mo.push(hit.ori);
  }
  const wp = [];
  for (let i = 0; i < 24; i++) {
    const colors = WING_FACELETS5[i].map((j) => facelets[j]);
    const piece = WING_BY_SIDES.get(colors.map((c) => sideOf[c]).join(''));
    if (piece === undefined) return fail('edgeImpossible', { position: WING_NAMES5[i], colors });
    wp.push(piece);
  }
  if (new Set(cp).size !== 8) return fail('duplicateCorner');
  if (new Set(mp).size !== 12) return fail('duplicateEdge');
  // swapped stickers of a wing read as its partner piece, so mirrored input shows up here
  if (new Set(wp).size !== 24) return fail('duplicateEdge4');
  const xc = X_CENTER_FACELETS.map((j) => sideOf[facelets[j]]);
  const tc = T_CENTER_FACELETS.map((j) => sideOf[facelets[j]]);
  for (const [kind, list] of [['x', xc], ['t', tc]]) {
    for (const face of FACES) {
      const count = list.filter((s) => s === face).length;
      if (count !== 4) return fail('centerCount', { color: scheme[face], kind, count });
    }
  }
  if (co.reduce((a, x) => a + x, 0) % 3 !== 0) return fail('twistedCorner');
  if (mo.reduce((a, x) => a + x, 0) % 2 !== 0) return fail('flippedEdge');
  if (inversions(cp) % 2 !== inversions(mp) % 2) return fail('parity');
  return { ok: true, state: { cp, co, mp, mo, wp, xc, tc }, scheme };
}

export function isSolved5(s) {
  const home = (list, solved) => list.every((x, i) => x === solved[i]);
  return (
    home(s.cp, SOLVED5.cp) && s.co.every((o) => o === 0) && home(s.mp, SOLVED5.mp) && s.mo.every((o) => o === 0) &&
    home(s.wp, SOLVED5.wp) && home(s.xc, SOLVED5.xc) && home(s.tc, SOLVED5.tc)
  );
}

const ENGINE = createMoveSet(N);
const MOVES5 = movesFor(N);

/** Puzzle module for the 5x5 (no solver yet – see sub-project E2). */
export const cube5 = Object.freeze({
  id: '5x5',
  size: N,
  moveFaces: Object.freeze(['U', 'D', 'L', 'R', 'F', 'B']),
  solvedFacelets: () => toFacelets5(SOLVED5),
  parse: parse5,
  isSolved: isSolved5,
  applyMoves: (facelets, moves) => ENGINE.applyAll(facelets, moves),
  scramble: (rng = Math.random) => randomScramble(60, rng, MOVES5),
});
