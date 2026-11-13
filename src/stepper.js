// Step navigation through a solution. Locks while the view shows a move,
// so an animated (e.g. 3D) view cannot be overrun by fast clicks.

/** Quarter-turn duration for single steps (Weiter, Zurück, arrow keys); autoplay and scrambling keep the view default. */
export const STEP_TURN_MS = 430;

/**
 * @param {{ showMove(move, direction: 1|-1, options?: { turnMs?: number }): Promise<void> }} view
 * @param {() => null | { moves: object[], step: number }} getSolution current solution
 */
export function createStepper(view, getSolution) {
  let busy = false;
  return {
    get busy() {
      return busy;
    },
    /**
     * Moves to `step` (clamped). Resolves true if the step changed.
     * `turnMs` is the quarter-turn duration of the animation (view default if omitted).
     */
    async goTo(step, { turnMs } = {}) {
      const sol = getSolution();
      if (busy || !sol) return false;
      const target = Math.max(0, Math.min(sol.moves.length, step));
      if (target === sol.step) return false;
      if (Math.abs(target - sol.step) === 1) {
        const from = sol.step;
        const forward = target > from;
        busy = true;
        try {
          await view.showMove(sol.moves[forward ? sol.step : target], forward ? 1 : -1, { turnMs });
        } finally {
          busy = false;
        }
        if (getSolution() !== sol || sol.step !== from) return false; // changed meanwhile
      }
      sol.step = target;
      return true;
    },
  };
}
