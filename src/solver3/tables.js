// Move tables and pruning tables for the two-phase solver. Built from the tested cubie model.
import * as C from './coords.js';
import { applyMove3 } from '../puzzles/cube3.js';
import { ALL_MOVES } from '../engine/facelets.js';

export const PHASE1_MOVES = ALL_MOVES;
/** Moves that keep the cube in the phase-2 subgroup: U, D (all) and half turns of L, R, F, B. */
export const PHASE2_MOVES = Object.freeze(ALL_MOVES.filter((m) => m.face === 'U' || m.face === 'D' || m.turns === 2));

export const TABLES_VERSION = 1;
const MAGIC = [0x43, 0x33, 0x54, TABLES_VERSION]; // "C3T" + version

function moveTable(n, set, get, moves) {
  const table = new Uint16Array(n * moves.length);
  for (let i = 0; i < n; i++) {
    const s = set(i);
    for (let j = 0; j < moves.length; j++) table[i * moves.length + j] = get(applyMove3(s, moves[j]));
  }
  return table;
}

/**
 * Breadth-first search over a pair of coordinates (a, b); depth packed 4 bits per entry.
 * @returns {Uint8Array} packed table, 15 = unset
 */
function pruningTable(nA, nB, moveA, moveB, nMoves) {
  const size = nA * nB;
  const depth = new Uint8Array(size).fill(15);
  const queue = new Uint32Array(size);
  let head = 0;
  let tail = 0;
  depth[0] = 0;
  queue[tail++] = 0;
  while (head < tail) {
    const idx = queue[head++];
    const a = Math.floor(idx / nB);
    const b = idx % nB;
    const d = depth[idx] + 1;
    for (let m = 0; m < nMoves; m++) {
      const next = moveA[a * nMoves + m] * nB + moveB[b * nMoves + m];
      if (depth[next] === 15) {
        depth[next] = d;
        queue[tail++] = next;
      }
    }
  }
  const packed = new Uint8Array(Math.ceil(size / 2)).fill(0xff);
  for (let i = 0; i < size; i++) {
    const byte = i >> 1;
    packed[byte] = i & 1 ? (packed[byte] & 0x0f) | (depth[i] << 4) : (packed[byte] & 0xf0) | depth[i];
  }
  return packed;
}

/** Depth stored for `index` in a packed pruning table. */
export function prune(table, index) {
  const byte = table[index >> 1];
  return index & 1 ? byte >> 4 : byte & 0x0f;
}

export function buildTables() {
  const twistMove = moveTable(C.N_TWIST, C.setTwist, C.getTwist, PHASE1_MOVES);
  const flipMove = moveTable(C.N_FLIP, C.setFlip, C.getFlip, PHASE1_MOVES);
  const sliceMove = moveTable(C.N_SLICE, C.setSlice, C.getSlice, PHASE1_MOVES);
  const cpermMove = moveTable(C.N_CPERM, C.setCornerPerm, C.getCornerPerm, PHASE2_MOVES);
  const udepermMove = moveTable(C.N_UDEPERM, C.setUDEdgePerm, C.getUDEdgePerm, PHASE2_MOVES);
  const spermMove = moveTable(C.N_SPERM, C.setSlicePerm, C.getSlicePerm, PHASE2_MOVES);
  return {
    twistMove,
    flipMove,
    sliceMove,
    cpermMove,
    udepermMove,
    spermMove,
    pTwistSlice: pruningTable(C.N_TWIST, C.N_SLICE, twistMove, sliceMove, 18),
    pFlipSlice: pruningTable(C.N_FLIP, C.N_SLICE, flipMove, sliceMove, 18),
    pCpermSperm: pruningTable(C.N_CPERM, C.N_SPERM, cpermMove, spermMove, 10),
    pUdepermSperm: pruningTable(C.N_UDEPERM, C.N_SPERM, udepermMove, spermMove, 10),
  };
}

const LAYOUT = [
  ['twistMove', Uint16Array, C.N_TWIST * 18],
  ['flipMove', Uint16Array, C.N_FLIP * 18],
  ['sliceMove', Uint16Array, C.N_SLICE * 18],
  ['cpermMove', Uint16Array, C.N_CPERM * 10],
  ['udepermMove', Uint16Array, C.N_UDEPERM * 10],
  ['spermMove', Uint16Array, C.N_SPERM * 10],
  ['pTwistSlice', Uint8Array, Math.ceil((C.N_TWIST * C.N_SLICE) / 2)],
  ['pFlipSlice', Uint8Array, Math.ceil((C.N_FLIP * C.N_SLICE) / 2)],
  ['pCpermSperm', Uint8Array, Math.ceil((C.N_CPERM * C.N_SPERM) / 2)],
  ['pUdepermSperm', Uint8Array, Math.ceil((C.N_UDEPERM * C.N_SPERM) / 2)],
];

const byteLength = (Type, n) => n * Type.BYTES_PER_ELEMENT;
const EXPECTED_BYTES = MAGIC.length + LAYOUT.reduce((sum, [, Type, n]) => sum + byteLength(Type, n), 0);

/** Serialises all tables into one byte array (for the browser cache). */
export function exportTables(tables) {
  const out = new Uint8Array(EXPECTED_BYTES);
  out.set(MAGIC, 0);
  let offset = MAGIC.length;
  for (const [key, Type, n] of LAYOUT) {
    const bytes = new Uint8Array(tables[key].buffer, tables[key].byteOffset, byteLength(Type, n));
    out.set(bytes, offset);
    offset += bytes.length;
  }
  return out;
}

/** Inverse of exportTables; throws if the data has the wrong size or version. */
export function importTables(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== EXPECTED_BYTES) throw new Error('tables: wrong size');
  if (MAGIC.some((b, i) => bytes[i] !== b)) throw new Error('tables: wrong version');
  const tables = {};
  let offset = MAGIC.length;
  for (const [key, Type, n] of LAYOUT) {
    const len = byteLength(Type, n);
    tables[key] = new Type(bytes.slice(offset, offset + len).buffer); // copy keeps alignment
    offset += len;
  }
  return tables;
}
