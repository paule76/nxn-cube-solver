// Moves on facelet arrays for any cube size, generated from the 3D geometry.
import { FACES, createGeometry, inLayer, rotation, rotateVec } from './geometry.js';

const MOVE_FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const TURNS = [1, 2, -1];

/** All 18 outer-layer moves: U U2 U' D D2 D' L … B'. */
export const ALL_MOVES = Object.freeze(
  MOVE_FACES.flatMap((face) => TURNS.map((turns) => Object.freeze({ face, turns }))),
);

/** The 18 two-layer moves (WCA: Uw Uw2 Uw' … Bw'), for cubes of size 4 and up. */
export const WIDE_MOVES = Object.freeze(
  MOVE_FACES.flatMap((face) => TURNS.map((turns) => Object.freeze({ face, turns, depth: 2 }))),
);

/** Moves available on an n×n×n cube. */
export const movesFor = (n) => (n >= 4 ? Object.freeze([...ALL_MOVES, ...WIDE_MOVES]) : ALL_MOVES);

const depthOf = (move) => move.depth ?? 1;
const findMove = (face, turns, depth) =>
  (depth === 2 ? WIDE_MOVES : ALL_MOVES).find((m) => m.face === face && m.turns === turns);

export function moveToString(move) {
  return move.face + (depthOf(move) === 2 ? 'w' : '') + (move.turns === 2 ? '2' : move.turns === -1 ? "'" : '');
}

/** Parses e.g. "R U2 Fw'" into move objects (shared instances from ALL_MOVES / WIDE_MOVES). */
export function parseMoves(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const m = /^([UDLRFB])(w)?(2|')?$/.exec(tok);
      if (!m) throw new Error(`Unknown move: ${tok}`);
      const turns = m[3] === '2' ? 2 : m[3] === "'" ? -1 : 1;
      return findMove(m[1], turns, m[2] ? 2 : 1);
    });
}

/**
 * @param {number} n
 * @returns {{ n, moves, perm(move): Int16Array, apply(facelets, move): any[], applyAll(facelets, moves): any[] }}
 */
export function createMoveSet(n) {
  const { stickers } = createGeometry(n);
  const key = (p, v) => `${p}|${v}`;
  const index = new Map(stickers.map((s, i) => [key(s.position, s.normal), i]));
  const perms = new Map();

  const moves = movesFor(n);
  for (const move of moves) {
    const { axis, degrees } = rotation(move);
    const perm = new Int16Array(stickers.length);
    stickers.forEach((s, i) => {
      let j = i;
      if (inLayer(s.position, move.face, n, depthOf(move))) {
        j = index.get(key(rotateVec(s.position, axis, degrees), rotateVec(s.normal, axis, degrees)));
      }
      perm[j] = i; // new facelet j comes from old facelet i
    });
    perms.set(move, perm);
  }

  const permOf = (move) => perms.get(findMove(move.face, move.turns, depthOf(move)));
  const apply = (facelets, move) => {
    const perm = permOf(move);
    return Array.from(perm, (from) => facelets[from]);
  };
  return {
    n,
    moves,
    perm: permOf,
    apply,
    applyAll: (facelets, moves) => moves.reduce(apply, [...facelets]),
  };
}

export { FACES };
