// Whole-cube rotations for the 5x5 solver: look at the cube along another axis, solve there,
// and translate the moves back (a proper rotation keeps the turn direction).
import { createGeometry, rotateVec, FACES, FACE_NORMALS } from '../engine/geometry.js';
import { movesFor } from '../engine/facelets.js';

const MOVES5 = movesFor(5);
const key = (p, v) => `${p}|${v}`;
const faceOfNormal = (v) => FACES.find((f) => FACE_NORMALS[f].every((x, k) => x === v[k]));

function makeRotation(n, axis, degrees) {
  const G = createGeometry(n);
  const index = new Map(G.stickers.map((s, i) => [key(s.position, s.normal), i]));
  const perm = new Int16Array(G.stickers.length); // rotated[k] = original[perm[k]]
  G.stickers.forEach((s, j) => {
    perm[index.get(key(rotateVec(s.position, axis, degrees), rotateVec(s.normal, axis, degrees)))] = j;
  });
  // the original face whose normal ends up as the rotated frame's face
  const toOriginal = Object.fromEntries(FACES.map((f) => [faceOfNormal(rotateVec(FACE_NORMALS[f], axis, degrees)), f]));
  return {
    facelets: (f) => Array.from(perm, (j) => f[j]),
    scheme: (scheme) => Object.fromEntries(FACES.map((f) => [f, scheme[toOriginal[f]]])),
    movesBack: (moves) =>
      moves.map((m) => MOVES5.find((x) => x.face === toOriginal[m.face] && x.turns === m.turns && (x.depth ?? 1) === (m.depth ?? 1))),
  };
}

/** Identity, R/L axis seen as U/D, F/B axis seen as U/D. */
export const AXIS_VIEWS = Object.freeze([makeRotation(5, 'x', 0), makeRotation(5, 'z', 90), makeRotation(5, 'x', 90)]);
/** Identity and a quarter turn about U/D (R/L seen as F/B), keeping the U/D axis. */
export const SIDE_VIEWS = Object.freeze([makeRotation(5, 'y', 0), makeRotation(5, 'y', 90)]);
