// Puzzle module for the 2x2: wraps the cubie model (cube.js) and the optimal solver (solver.js).
import { SOLVED, toFacelets, parseFacelets, isSolved } from '../cube.js';
import { createSolver } from '../solver.js';
import { createMoveSet } from '../engine/facelets.js';
import { randomScramble } from '../scramble.js';

const ENGINE = createMoveSet(2);
let solver = null;
const getSolver = () => (solver ??= createSolver()); // ~0.4 s table build, done once

export const cube2 = Object.freeze({
  id: '2x2',
  size: 2,
  moveFaces: Object.freeze(['U', 'R', 'F']),
  solvedFacelets: () => toFacelets(SOLVED),
  parse: parseFacelets,
  isSolved,
  applyMoves: (facelets, moves) => ENGINE.applyAll(facelets, moves),
  scramble: (rng = Math.random) => randomScramble(12, rng),
  /** Builds the solver tables ahead of time (optional). */
  prepare: () => {
    getSolver();
  },
  solve: (state) => getSolver().solve(state),
});
