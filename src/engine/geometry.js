// 3D geometry of an n×n×n cube, consistent with the facelet order used everywhere:
// faces U R F D L B, each n×n row by row in net reading order
// (U with B at the top, R/F/L/B with U at the top, D with F at the top, B seen from behind).
// Coordinates: x → right (R), y → up (U), z → front (F); positions run from −(n−1) to n−1 in steps of 2.

export const FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);

export const FACE_NORMALS = Object.freeze({
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
});

export const OPPOSITE_FACE = Object.freeze({ U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' });

// Sticker position for row r, column c on each face (m = n − 1).
const POSITION = {
  U: (m, r, c) => [-m + 2 * c, m, -m + 2 * r],
  R: (m, r, c) => [m, m - 2 * r, m - 2 * c],
  F: (m, r, c) => [-m + 2 * c, m - 2 * r, m],
  D: (m, r, c) => [-m + 2 * c, -m, m - 2 * r],
  L: (m, r, c) => [-m, m - 2 * r, -m + 2 * c],
  B: (m, r, c) => [m - 2 * c, m - 2 * r, -m],
};

/**
 * @param {number} n cube size (2, 3, …)
 * @returns {{ n: number, stickers: {position:number[], normal:number[]}[], cubies: number[][] }}
 */
export function createGeometry(n) {
  const m = n - 1;
  const stickers = FACES.flatMap((face) => {
    const list = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) list.push(Object.freeze({ position: POSITION[face](m, r, c), normal: FACE_NORMALS[face] }));
    }
    return list;
  });
  const coords = Array.from({ length: n }, (_, i) => -m + 2 * i);
  const cubies = coords
    .flatMap((x) => coords.flatMap((y) => coords.map((z) => [x, y, z])))
    .filter((p) => p.some((v) => Math.abs(v) === m)); // outer pieces only
  return Object.freeze({ n, stickers: Object.freeze(stickers), cubies: Object.freeze(cubies) });
}

/** True if the cubie at `position` belongs to the outer `depth` layers of `face` (depth 1: outer layer only). */
export function inLayer(position, face, n, depth = 1) {
  const v = FACE_NORMALS[face];
  return position[0] * v[0] + position[1] * v[1] + position[2] * v[2] >= n - 1 - 2 * (depth - 1);
}

const AXIS_OF = { U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z' };
const SIGN_OF = { U: 1, R: 1, F: 1, D: -1, L: -1, B: -1 };

/** Clockwise (looking at the face) = −90° about the outward normal, expressed about the positive axis. */
export function rotation(move) {
  return { axis: AXIS_OF[move.face], degrees: -90 * move.turns * SIGN_OF[move.face] };
}

/** Right-handed rotation of an integer vector; result rounded to integers. */
export function rotateVec(v, axis, degrees) {
  const a = (degrees * Math.PI) / 180;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  const [x, y, z] = v;
  let r;
  if (axis === 'x') r = [x, c * y - s * z, s * y + c * z];
  else if (axis === 'y') r = [c * x + s * z, y, -s * x + c * z];
  else r = [c * x - s * y, s * x + c * y, z];
  return r.map((k) => k || 0); // normalise -0
}

/** CSS transform for a math-space rotation (CSS has y pointing down). */
export function cssRotate({ axis, degrees }) {
  const sign = axis === 'y' ? 1 : -1;
  return `rotate${axis.toUpperCase()}(${(sign * degrees) || 0}deg)`;
}
