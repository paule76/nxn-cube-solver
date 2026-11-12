// Kociemba coordinates of a 3x3 state { cp, co, ep, eo } (corner/edge order as in puzzles/cube3.js).
// Edges 8..11 (FR, FL, BL, BR) are the middle-layer ("slice") edges.

export const N_TWIST = 2187; // 3^7
export const N_FLIP = 2048; // 2^11
export const N_SLICE = 495; // C(12, 4)
export const N_CPERM = 40320; // 8!
export const N_UDEPERM = 40320; // 8!
export const N_SPERM = 24; // 4!

const solved = () => ({
  cp: [0, 1, 2, 3, 4, 5, 6, 7],
  co: [0, 0, 0, 0, 0, 0, 0, 0],
  ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
});

function binom(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

/** Lehmer code of a permutation of 0..n-1. */
function permIndex(p) {
  let idx = 0;
  for (let i = 0; i < p.length; i++) {
    let smaller = 0;
    for (let j = i + 1; j < p.length; j++) if (p[j] < p[i]) smaller++;
    idx = idx * (p.length - i) + smaller;
  }
  return idx;
}

function permFromIndex(idx, n) {
  const digits = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    digits[i] = idx % (n - i);
    idx = Math.floor(idx / (n - i));
  }
  const pool = Array.from({ length: n }, (_, i) => i);
  return digits.map((d) => pool.splice(d, 1)[0]);
}

// --- Phase 1 -------------------------------------------------------------------

export function getTwist(s) {
  let r = 0;
  for (let i = 0; i < 7; i++) r = r * 3 + s.co[i];
  return r;
}

export function setTwist(idx) {
  const s = solved();
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    s.co[i] = idx % 3;
    sum += s.co[i];
    idx = Math.floor(idx / 3);
  }
  s.co[7] = (3 - (sum % 3)) % 3;
  return s;
}

export function getFlip(s) {
  let r = 0;
  for (let i = 0; i < 11; i++) r = r * 2 + s.eo[i];
  return r;
}

export function setFlip(idx) {
  const s = solved();
  let sum = 0;
  for (let i = 10; i >= 0; i--) {
    s.eo[i] = idx % 2;
    sum += s.eo[i];
    idx = Math.floor(idx / 2);
  }
  s.eo[11] = sum % 2;
  return s;
}

/** Unordered positions of the slice edges (Kociemba's UDSlice coordinate). */
export function getSlice(s) {
  let a = 0;
  let x = 0;
  for (let j = 11; j >= 0; j--) {
    if (s.ep[j] >= 8) {
      a += binom(11 - j, x + 1);
      x++;
    }
  }
  return a;
}

export function setSlice(idx) {
  const s = solved();
  const ep = new Array(12).fill(-1);
  let x = 3; // slice edges still to place, minus one
  let a = idx;
  for (let j = 0; j < 12; j++) {
    if (x >= 0 && a - binom(11 - j, x + 1) >= 0) {
      ep[j] = 8 + (3 - x);
      a -= binom(11 - j, x + 1);
      x--;
    }
  }
  let other = 0;
  for (let j = 0; j < 12; j++) if (ep[j] === -1) ep[j] = other++;
  s.ep = ep;
  return s;
}

// --- Phase 2 (meaningful once the cube is in the subgroup) ------------------------

export const getCornerPerm = (s) => permIndex(s.cp);

export function setCornerPerm(idx) {
  const s = solved();
  s.cp = permFromIndex(idx, 8);
  return s;
}

export const getUDEdgePerm = (s) => permIndex(s.ep.slice(0, 8));

export function setUDEdgePerm(idx) {
  const s = solved();
  s.ep = [...permFromIndex(idx, 8), 8, 9, 10, 11];
  return s;
}

export const getSlicePerm = (s) => permIndex(s.ep.slice(8, 12).map((e) => e - 8));

export function setSlicePerm(idx) {
  const s = solved();
  s.ep = [0, 1, 2, 3, 4, 5, 6, 7, ...permFromIndex(idx, 4).map((e) => e + 8)];
  return s;
}
