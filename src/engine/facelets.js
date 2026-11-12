// Moves on facelet arrays for any cube size, generated from the 3D geometry.
import { FACES, createGeometry, inLayer, rotation, rotateVec } from './geometry.js';

const MOVE_FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const TURNS = [1, 2, -1];

/** All 18 outer-layer moves: U U2 U' D D2 D' L … B'. */
export const ALL_MOVES = Object.freeze(
  MOVE_FACES.flatMap((face) => TURNS.map((turns) => Object.freeze({ face, turns }))),
);

export function moveToString(move) {
  return move.face + (move.turns === 2 ? '2' : move.turns === -1 ? "'" : '');
}

/** Parses e.g. "R U2 F'" into move objects (shared instances from ALL_MOVES). */
export function parseMoves(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const m = /^([UDLRFB])(2|')?$/.exec(tok);
      if (!m) throw new Error(`Unknown move: ${tok}`);
      const turns = m[2] === '2' ? 2 : m[2] === "'" ? -1 : 1;
      return ALL_MOVES.find((x) => x.face === m[1] && x.turns === turns);
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

  for (const move of ALL_MOVES) {
    const { axis, degrees } = rotation(move);
    const perm = new Int16Array(stickers.length);
    stickers.forEach((s, i) => {
      let j = i;
      if (inLayer(s.position, move.face, n)) {
        j = index.get(key(rotateVec(s.position, axis, degrees), rotateVec(s.normal, axis, degrees)));
      }
      perm[j] = i; // new facelet j comes from old facelet i
    });
    perms.set(move, perm);
  }

  const permOf = (move) => perms.get(ALL_MOVES.find((m) => m.face === move.face && m.turns === move.turns));
  const apply = (facelets, move) => {
    const perm = permOf(move);
    return Array.from(perm, (from) => facelets[from]);
  };
  return {
    n,
    moves: ALL_MOVES,
    perm: permOf,
    apply,
    applyAll: (facelets, moves) => moves.reduce(apply, [...facelets]),
  };
}

export { FACES };
