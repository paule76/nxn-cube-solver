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

/** Text for `step` moves done: announces the next move to do, or that the cube is solved. */
export function stepText(moves, step, t) {
  if (step >= moves.length) return t('step.done');
  return t('step.next', { n: step + 1, total: moves.length, move: describeMove(moves[step], t) });
}
