// 4x4 cube model: 8 corners, 24 edge pieces ("wings", two per edge), 24 centre facelets.
// Pieces are derived from the N×N geometry; the colour scheme comes from the DBL corner (like the 2x2).
import { CORNER_FACELETS, CORNER_COLORS, CORNER_NAMES, DEFAULT_SCHEME } from '../cube.js';
import { createGeometry, FACES, FACE_NORMALS } from '../engine/geometry.js';
import { createMoveSet, movesFor } from '../engine/facelets.js';
import { randomScramble } from '../scramble.js';

const N = 4;
const M = N - 1;
const G2 = createGeometry(2);
const G4 = createGeometry(N);
const key = (p, v) => `${p}|${v}`;
const INDEX4 = new Map(G4.stickers.map((s, i) => [key(s.position, s.normal), i]));
const faceOfNormal = (v) => FACES.find((f) => FACE_NORMALS[f].every((x, k) => x === v[k]));

/** Corner facelets in the 2x2 order (URF UFL ULB UBR DFR DLF DBL DRB), clockwise from the U/D sticker. */
export const CORNER_FACELETS4 = Object.freeze(
  CORNER_FACELETS.map((list) =>
    list.map((j) => {
      const s = G2.stickers[j];
      return INDEX4.get(key(s.position.map((x) => x * M), s.normal));
    }),
  ),
);

// --- Edge pieces -------------------------------------------------------------------

const EDGE_ORDER = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const wingSlots = (() => {
  const groups = new Map();
  G4.stickers.forEach((s, i) => {
    const outer = s.position.filter((x) => Math.abs(x) === M).length;
    if (outer !== 2) return; // corners have 3, centres 1
    const k = String(s.position);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const slots = [...groups.values()].map((pair) => {
    const [a, b] = pair.map((i) => G4.stickers[i]);
    // reading order that is kept by every rotation: (n1 × n2) · p > 0
    const ordered = dot(cross(a.normal, b.normal), a.position) > 0 ? pair : [pair[1], pair[0]];
    const faces = ordered.map((i) => faceOfNormal(G4.stickers[i].normal));
    const edge = EDGE_ORDER.find((e) => faces.every((f) => e.includes(f)));
    const along = a.position.findIndex((x) => Math.abs(x) !== M); // free axis
    const part = a.position[along] < 0 ? 1 : 2;
    return { facelets: ordered, faces, name: `${edge}${part}` };
  });
  slots.sort((x, y) => EDGE_ORDER.indexOf(x.name.slice(0, 2)) - EDGE_ORDER.indexOf(y.name.slice(0, 2)) || x.name.localeCompare(y.name));
  return slots;
})();

/** Facelets of each edge-piece slot (fixed reading order). */
export const WING_FACELETS = Object.freeze(wingSlots.map((s) => s.facelets));
/** Slot names, e.g. "UR1", "UR2". */
export const WING_NAMES = Object.freeze(wingSlots.map((s) => s.name));
/** Side letters of each piece in the solved cube (piece k sits in slot k). */
const WING_COLORS = wingSlots.map((s) => s.faces);
const WING_BY_SIDES = new Map(WING_COLORS.map((sides, k) => [sides.join(''), k]));

const used = new Set([...CORNER_FACELETS4.flat(), ...WING_FACELETS.flat()]);
/** The remaining 24 facelets are centres. */
export const CENTER_FACELETS = Object.freeze(G4.stickers.map((_, i) => i).filter((i) => !used.has(i)));
const CENTER_FACE = CENTER_FACELETS.map((i) => FACES[Math.floor(i / 16)]);

export const SOLVED4 = Object.freeze({
  cp: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]),
  co: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
  wp: Object.freeze(Array.from({ length: 24 }, (_, i) => i)),
  centers: Object.freeze([...CENTER_FACE]),
});

export function toFacelets4(state, scheme = DEFAULT_SCHEME) {
  const f = new Array(96);
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 3; k++) f[CORNER_FACELETS4[i][(k + state.co[i]) % 3]] = scheme[CORNER_COLORS[state.cp[i]][k]];
  }
  for (let i = 0; i < 24; i++) {
    WING_FACELETS[i].forEach((j, k) => {
      f[j] = scheme[WING_COLORS[state.wp[i]][k]];
    });
  }
  CENTER_FACELETS.forEach((j, i) => {
    f[j] = scheme[state.centers[i]];
  });
  return f;
}

const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];
const OPPOSITE_COLOR = { W: 'Y', Y: 'W', G: 'B', B: 'G', R: 'O', O: 'R' };
const fail = (code, params = {}) => ({ ok: false, code, params });
const cornerError = (pos, colors, sides) => {
  const sameSet = new Set(sides).size === 3 && CORNER_COLORS.some((cc) => sides.every((s) => cc.includes(s)));
  return fail(sameSet ? 'cornerOrder' : 'cornerImpossible', { position: CORNER_NAMES[pos], colors });
};

/** @returns {{ok:true, state, scheme}|{ok:false, code:string, params:object}} */
export function parse4(facelets) {
  if (facelets.length !== 96 || facelets.some((c) => !c)) return fail('incomplete');
  for (const color of COLORS) {
    const count = facelets.filter((c) => c === color).length;
    if (count !== 16) return fail('colorCount', { color, count, expected: 16 });
  }
  const [d, b, l] = CORNER_FACELETS4[6].map((i) => facelets[i]); // DBL: D, B, L stickers
  const scheme = { D: d, B: b, L: l, U: OPPOSITE_COLOR[d], F: OPPOSITE_COLOR[b], R: OPPOSITE_COLOR[l] };
  if (new Set(Object.values(scheme)).size !== 6) return cornerError(6, [d, b, l], []);
  const sideOf = Object.fromEntries(Object.entries(scheme).map(([side, color]) => [color, side]));

  const cp = [];
  const co = [];
  for (let i = 0; i < 8; i++) {
    const colors = CORNER_FACELETS4[i].map((j) => facelets[j]);
    const sides = colors.map((c) => sideOf[c]);
    let hit = null;
    for (let c = 0; c < 8 && !hit; c++) {
      for (let o = 0; o < 3 && !hit; o++) {
        if ([0, 1, 2].every((k) => CORNER_COLORS[c][k] === sides[(k + o) % 3])) hit = [c, o];
      }
    }
    if (!hit) return cornerError(i, colors, sides);
    cp.push(hit[0]);
    co.push(hit[1]);
  }
  const wp = [];
  for (let i = 0; i < 24; i++) {
    const colors = WING_FACELETS[i].map((j) => facelets[j]);
    const piece = WING_BY_SIDES.get(colors.map((c) => sideOf[c]).join(''));
    if (piece === undefined) return fail('edgeImpossible', { position: WING_NAMES[i], colors });
    wp.push(piece);
  }
  if (new Set(cp).size !== 8) return fail('duplicateCorner');
  // swapped stickers of a piece read as its partner piece, so mirrored input shows up here
  if (new Set(wp).size !== 24) return fail('duplicateEdge4');
  if (co.reduce((a, x) => a + x, 0) % 3 !== 0) return fail('twistedCorner');
  const centers = CENTER_FACELETS.map((j) => sideOf[facelets[j]]);
  return { ok: true, state: { cp, co, wp, centers }, scheme };
}

export function isSolved4(s) {
  return (
    s.cp.every((c, i) => c === i) && s.co.every((o) => o === 0) &&
    s.wp.every((w, i) => w === i) && s.centers.every((f, i) => f === CENTER_FACE[i])
  );
}

const ENGINE = createMoveSet(N);
const MOVES4 = movesFor(N);

/** Puzzle module for the 4x4 (no solver yet – see sub-project D2). */
export const cube4 = Object.freeze({
  id: '4x4',
  size: N,
  moveFaces: Object.freeze(['U', 'D', 'L', 'R', 'F', 'B']),
  solvedFacelets: () => toFacelets4(SOLVED4),
  parse: parse4,
  isSolved: isSolved4,
  applyMoves: (facelets, moves) => ENGINE.applyAll(facelets, moves),
  scramble: (rng = Math.random) => randomScramble(40, rng, MOVES4),
});
