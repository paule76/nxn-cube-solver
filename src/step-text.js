import { moveToString } from './engine/facelets.js';

const TURN_KEY = { 1: 'move.turn.cw', [-1]: 'move.turn.ccw', 2: 'move.turn.half' };

/** e.g. "F' – vordere Seite gegen den Uhrzeigersinn" */
export function describeMove(m, t) {
  return t('move.describe', {
    notation: moveToString(m),
    face: t((m.depth ?? 1) === 2 ? `move.faceWide.${m.face}` : `move.face.${m.face}`),
    turn: t(TURN_KEY[m.turns]),
  });
}

/**
 * Text for `step` moves done: announces the next move to do, or that the cube is solved.
 * @param {string} [phase] phase of the next move ('centers' | 'edges' | 'parity' | 'solve3'), shown in front
 */
export function stepText(moves, step, t, phase) {
  if (step >= moves.length) return t('step.done');
  const params = { n: step + 1, total: moves.length, move: describeMove(moves[step], t) };
  return phase ? t('step.nextInPhase', { ...params, phase: t(`phase.${phase}`) }) : t('step.next', params);
}

/** Phases with a heading in the move list (2x2/3x3 answer in one unnamed phase 'solve'). */
export const NAMED_PHASES = Object.freeze(['centers', 'edges', 'parity', 'solve3']);

/** [{ phase, moves }] -> flat moves plus [{ phase, start }] for the named phases. */
export function flattenPhases(phases) {
  const moves = [];
  const marks = [];
  for (const { phase, moves: list } of phases) {
    if (NAMED_PHASES.includes(phase)) marks.push({ phase, start: moves.length });
    moves.push(...list);
  }
  return { moves, marks };
}

/** Phase of move `step`, or undefined. */
export function phaseAt(marks, step) {
  let found;
  for (const m of marks) if (m.start <= step) found = m.phase;
  return found;
}
