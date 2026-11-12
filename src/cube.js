// 2x2 cube model: corner permutation (cp) + orientation (co).
// Corner DBL (index 6) never moves; only U, R and F turns are used.

/** Facelet indices of each corner position, clockwise, starting at the U/D sticker. */
export const CORNER_FACELETS = [
  [3, 4, 9],    // 0 URF
  [2, 8, 17],   // 1 UFL
  [0, 16, 21],  // 2 ULB
  [1, 20, 5],   // 3 UBR
  [13, 11, 6],  // 4 DFR
  [12, 19, 10], // 5 DLF
  [14, 23, 18], // 6 DBL
  [15, 7, 22],  // 7 DRB
];

/** Side letters of each corner piece, same order as CORNER_FACELETS. */
export const CORNER_COLORS = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
];

export const DEFAULT_SCHEME = Object.freeze({ U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' });

export const SOLVED = Object.freeze({
  cp: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]),
  co: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
});

const BASE_MOVES = {
  U: { cp: [3, 0, 1, 2, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
  R: { cp: [4, 1, 2, 0, 7, 5, 6, 3], co: [2, 0, 0, 1, 1, 0, 0, 2] },
  F: { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [1, 2, 0, 0, 2, 1, 0, 0] },
};

/** All 9 moves in solver order: U U2 U' R R2 R' F F2 F'. */
export const MOVES = Object.freeze(
  ['U', 'R', 'F'].flatMap((face) => [1, 2, -1].map((turns) => Object.freeze({ face, turns }))),
);

function applyBase(s, m) {
  const cp = new Array(8);
  const co = new Array(8);
  for (let i = 0; i < 8; i++) {
    cp[i] = s.cp[m.cp[i]];
    co[i] = (s.co[m.cp[i]] + m.co[i]) % 3;
  }
  return { cp, co };
}

/** Returns a new state; the input is not modified. */
export function applyMove(state, move) {
  const base = BASE_MOVES[move.face];
  if (!base) throw new Error(`Unbekannter Zug: ${move.face}`);
  const n = ((move.turns % 4) + 4) % 4;
  let s = { cp: [...state.cp], co: [...state.co] };
  for (let i = 0; i < n; i++) s = applyBase(s, base);
  return s;
}

export function applyMoves(state, moves) {
  return moves.reduce(applyMove, { cp: [...state.cp], co: [...state.co] });
}

export function moveToString(move) {
  return move.face + (move.turns === 2 ? '2' : move.turns === -1 ? "'" : '');
}

export function parseMoves(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const m = /^([URF])(2|')?$/.exec(tok);
      if (!m) throw new Error(`Unbekannter Zug: ${tok}`);
      return { face: m[1], turns: m[2] === '2' ? 2 : m[2] === "'" ? -1 : 1 };
    });
}

/** Renders a state to 24 facelet colors (order U R F D L B, 4 each). */
export function toFacelets(state, scheme = DEFAULT_SCHEME) {
  const f = new Array(24);
  for (let i = 0; i < 8; i++) {
    const c = state.cp[i];
    const o = state.co[i];
    for (let k = 0; k < 3; k++) {
      f[CORNER_FACELETS[i][(k + o) % 3]] = scheme[CORNER_COLORS[c][k]];
    }
  }
  return f;
}

export function isSolved(state) {
  return state.cp.every((c, i) => c === i) && state.co.every((o) => o === 0);
}

const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];
const OPPOSITE = { W: 'Y', Y: 'W', G: 'B', B: 'G', R: 'O', O: 'R' };
export const CORNER_NAMES = Object.freeze(['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB']);

const fail = (code, params = {}) => ({ ok: false, code, params });
const cornerError = (pos, colors, sides) => {
  const sameSet = new Set(sides).size === 3 && CORNER_COLORS.some((cc) => sides.every((s) => cc.includes(s)));
  return fail(sameSet ? 'cornerOrder' : 'cornerImpossible', { position: CORNER_NAMES[pos], colors });
};

/**
 * Reads 24 facelet colors (order U R F D L B) into a cube state.
 * The DBL corner defines which color belongs to which side.
 * @returns {{ok:true,state,scheme}|{ok:false,code:string,params:object}} (format with messages.js)
 */
export function parseFacelets(facelets) {
  if (facelets.length !== 24 || facelets.some((c) => !c)) {
    return fail('incomplete');
  }
  for (const color of COLORS) {
    const n = facelets.filter((c) => c === color).length;
    if (n !== 4) return fail('colorCount', { color, count: n, expected: 4 });
  }

  const [d, b, l] = CORNER_FACELETS[6].map((i) => facelets[i]);
  const scheme = { D: d, B: b, L: l, U: OPPOSITE[d], F: OPPOSITE[b], R: OPPOSITE[l] };
  if (new Set(Object.values(scheme)).size !== 6) return cornerError(6, [d, b, l], []);
  const sideOf = Object.fromEntries(Object.entries(scheme).map(([side, color]) => [color, side]));

  const cp = [];
  const co = [];
  for (let i = 0; i < 8; i++) {
    const colors = CORNER_FACELETS[i].map((j) => facelets[j]);
    const sides = colors.map((c) => sideOf[c]);
    let found = false;
    for (let c = 0; c < 8 && !found; c++) {
      for (let o = 0; o < 3 && !found; o++) {
        if ([0, 1, 2].every((k) => CORNER_COLORS[c][k] === sides[(k + o) % 3])) {
          cp.push(c);
          co.push(o);
          found = true;
        }
      }
    }
    if (!found) return cornerError(i, colors, sides);
  }
  if (new Set(cp).size !== 8) return fail('duplicateCorner');
  if (co.reduce((a, x) => a + x, 0) % 3 !== 0) {
    return fail('twistedCorner');
  }
  return { ok: true, state: { cp, co }, scheme };
}
