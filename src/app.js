import { createNetView } from './views/net-view.js';
import { createCube3dView } from './views/cube3d-view.js';
import { moveToString } from './engine/facelets.js';
import { PUZZLES, PUZZLE_IDS } from './puzzles/index.js';
import { pickSize, sizeFromHash, SIZE_KEY } from './size.js';
import { createStepper } from './stepper.js';
import { stepText, describeMove } from './step-text.js';
import { createPlayer } from './player.js';
import { keyAction } from './keys.js';
import { createConfirm } from './confirm.js';
import { createI18n, detectLang, LANGS } from './i18n.js';
import { formatParseError } from './messages.js';

const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];

const $ = (id) => document.getElementById(id);

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode etc.): the choice just isn't remembered
  }
}

// --- Language ---------------------------------------------------------------

const LANG_KEY = 'cube-solver-lang';
const i18n = createI18n({
  lang: detectLang({
    stored: storageGet(LANG_KEY),
    navigatorLanguages: navigator.languages?.length ? navigator.languages : [navigator.language],
  }),
});
const t = i18n.t;
const colorName = (c) => t(c ? `color.${c}` : 'color.empty');

// --- Puzzle and per-size state ------------------------------------------------

let solverReady = false;
let selected = 'W';
let puzzle = PUZZLES[pickSize({ hash: location.hash, stored: storageGet(SIZE_KEY) })];
/** Input and solution are kept per size, so switching back restores them. */
const sessions = {};
const sessionFor = (p) => (sessions[p.id] ??= { input: p.solvedFacelets(), solution: null });
let input = sessionFor(puzzle).input;
/** @type {null | { facelets: string[], moves: object[], step: number }} */
let solution = null;

// --- Views --------------------------------------------------------------------

let net;
let cube3d;
let views = [];

function buildViews() {
  // The 3D view attaches listeners to its container, so it always gets a fresh element.
  const old = $('cube3d');
  const fresh = old.cloneNode(false);
  old.replaceWith(fresh);
  net = createNetView($('net'), {
    n: puzzle.size,
    onCellClick,
    onCellHover: (index) => cube3d.highlight(index),
    cellLabel: (side, n, color) => t('cell.label', { side: t(`side.${side}`), n, color: colorName(color) }),
    sideName: (side) => t(`side.${side}`),
  });
  cube3d = createCube3dView(fresh, {
    n: puzzle.size,
    onStickerClick: (index) => net.highlight(index),
  });
  fresh.setAttribute('aria-label', t('cube3d.label'));
  views = [net, cube3d];
}

// Fans the view interface out to all views; showMove waits for every view.
const view = {
  render: (facelets) => views.forEach((v) => v.render(facelets)),
  showMove: (move, direction, options) => Promise.all(views.map((v) => v.showMove(move, direction, options))),
  showHint: (move) => views.forEach((v) => v.showHint?.(move)),
};

function displayed() {
  if (!solution) return input;
  return puzzle.applyMoves(solution.facelets, solution.moves.slice(0, solution.step));
}

// --- Messages -------------------------------------------------------------------

/** The message is kept as a function so it can be re-translated when the language changes. */
let message = { text: () => '', kind: '', key: '' };

function setMessage(key, params = {}, kind = '') {
  message = { text: () => (key ? t(key, params) : ''), kind, key };
  renderMessage();
}

function setErrorMessage(result) {
  message = { text: () => formatParseError(result, t), kind: 'error', key: `error.${result.code}` };
  renderMessage();
}

function renderMessage() {
  const el = $('message');
  el.textContent = message.text();
  el.className = `message ${message.kind}`.trim();
}

// --- Input and solving ------------------------------------------------------------

function onCellClick(index) {
  if (scrambling) return;
  resetConfirms();
  if (solution) {
    // Editing during navigation: continue from what is shown, drop the stale solution.
    input = displayed();
    clearSolution();
  }
  input[index] = selected;
  setMessage(null);
  render();
}

function clearSolution() {
  player.pause();
  solution = null;
  $('solution').hidden = true;
}

function solve() {
  if (!solverReady) return;
  player.pause();
  const r = puzzle.parse(input);
  if (!r.ok) {
    clearSolution();
    setErrorMessage(r);
    render();
    return;
  }
  if (puzzle.isSolved(r.state)) {
    clearSolution();
    setMessage('msg.alreadySolved', {}, 'success');
    render();
    return;
  }
  if (!puzzle.solve) {
    clearSolution();
    setMessage('msg.validNoSolver', {}, 'success');
    render();
    return;
  }
  const moves = puzzle.solve(r.state);
  solution = { facelets: [...input], moves, step: 0 };
  if (moves.length === 1) setMessage('msg.foundOne', {}, 'success');
  else setMessage('msg.foundMany', { count: moves.length }, 'success');
  $('solution').hidden = false;
  render();
}

// --- Navigation and autoplay ------------------------------------------------------

const stepper = createStepper(view, () => solution);

async function goTo(step) {
  // No disabling of the nav buttons here: that would drop keyboard focus during the
  // animation. The stepper itself ignores navigation while a move is shown.
  if (stepper.busy) return;
  await stepper.goTo(step);
  render();
}

const atEnd = () => !solution || solution.step >= solution.moves.length;

const player = createPlayer({
  async step() {
    if (atEnd()) return false;
    await goTo(solution.step + 1);
    return !atEnd();
  },
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  onChange: renderPlayButton,
});

function renderPlayButton() {
  $('play').textContent = t(player.playing ? 'play.pause' : 'play.play');
  $('play').setAttribute('aria-pressed', String(player.playing));
}

function togglePlay() {
  if (!solution) return;
  if (!player.playing && atEnd()) {
    solution.step = 0; // replay from the start
    render();
  }
  player.toggle();
}

/** Manual navigation stops autoplay. */
function navigate(action) {
  if (!solution) return;
  if (action === 'toggle') return togglePlay();
  player.pause();
  const target = { first: 0, prev: solution.step - 1, next: solution.step + 1, last: solution.moves.length }[action];
  goTo(target);
}

// --- Rendering --------------------------------------------------------------------

function renderSolution() {
  if (!solution) return;
  const { moves, step } = solution;
  $('moves').replaceChildren(
    ...moves.map((m, i) => {
      const li = document.createElement('li');
      li.textContent = moveToString(m);
      if (i < step) li.className = 'done';
      if (i === step) li.className = 'current';
      li.title = describeMove(m, t);
      return li;
    }),
  );
  $('step-text').textContent = stepText(moves, step, t);
  $('first').disabled = $('prev').disabled = step === 0;
  $('next').disabled = $('last').disabled = step === moves.length;
}

function renderPalette() {
  for (const btn of $('palette').children) {
    const on = btn.dataset.color === selected;
    btn.setAttribute('aria-label', colorName(btn.dataset.color));
    btn.title = colorName(btn.dataset.color);
    btn.setAttribute('aria-checked', String(on));
    btn.tabIndex = on ? 0 : -1;
  }
}

function renderSizeSwitch() {
  for (const btn of document.querySelectorAll('.size-switch .size')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.size === puzzle.id));
  }
}

function render() {
  view.render(displayed());
  view.showHint(solution && solution.step < solution.moves.length ? solution.moves[solution.step] : null);
  renderPalette();
  renderSizeSwitch();
  renderSolution();
}

function buildPalette() {
  const palette = $('palette');
  for (const c of COLORS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.dataset.color = c;
    btn.setAttribute('role', 'radio');
    btn.addEventListener('click', () => {
      selected = c;
      renderPalette();
    });
    palette.append(btn);
  }
  palette.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    selected = COLORS[(COLORS.indexOf(selected) + step + COLORS.length) % COLORS.length];
    renderPalette();
    palette.querySelector(`[data-color="${selected}"]`).focus();
  });
}

// --- Reset, clear, scramble ---------------------------------------------------------

function resetToSolved() {
  input = puzzle.solvedFacelets();
  clearSolution();
  setMessage(null);
  render();
}

function clearInput() {
  input = new Array(6 * puzzle.size * puzzle.size).fill(null);
  clearSolution();
  setMessage(null);
  render();
}

let scrambling = false;

function setInputButtonsDisabled(disabled) {
  for (const id of ['scramble', 'reset', 'clear']) $(id).disabled = disabled;
  for (const btn of document.querySelectorAll('.size-switch .size')) btn.disabled = disabled;
  $('solve').disabled = disabled || !solverReady;
}

async function scramble() {
  const moves = puzzle.scramble();
  const p = puzzle;
  scrambling = true;
  setInputButtonsDisabled(true);
  try {
    clearSolution();
    setMessage('msg.scrambling');
    let facelets = p.solvedFacelets();
    input = facelets;
    render();
    for (const m of moves) {
      await view.showMove(m, 1, { countHalfTurns: false }); // counting only helps when solving
      facelets = p.applyMoves(facelets, [m]);
      input = facelets;
      render();
    }
    setMessage('msg.scrambled', { moves: moves.map(moveToString).join(' ') });
  } finally {
    scrambling = false;
    setInputButtonsDisabled(false);
  }
}

// --- Confirmation before overwriting the input --------------------------------------

const isEmpty = () => input.every((c) => !c);
const isSolvedInput = () => {
  const r = puzzle.parse(input);
  return r.ok && puzzle.isSolved(r.state);
};
const NEEDS_CONFIRM = {
  clear: () => !isEmpty(),
  reset: () => !isEmpty() && !isSolvedInput(),
  scramble: () => !isEmpty() && !isSolvedInput(),
};
const ACTIONS = { clear: clearInput, reset: resetToSolved, scramble };
const confirms = {};

for (const id of Object.keys(ACTIONS)) {
  const button = $(id);
  confirms[id] = createConfirm({
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle),
    onArm: () => {
      button.textContent = t(`confirm.${id}`);
      button.classList.add('danger');
      setMessage('confirm.hint');
    },
    onDisarm: () => {
      button.textContent = t(`button.${id}`);
      button.classList.remove('danger');
      if (message.key === 'confirm.hint') setMessage(null);
    },
  });
  button.addEventListener('click', () => {
    if (scrambling) return;
    resetConfirms(id);
    if (NEEDS_CONFIRM[id]() && !confirms[id].press()) return;
    confirms[id].reset();
    ACTIONS[id]();
  });
}

function resetConfirms(except) {
  for (const [id, c] of Object.entries(confirms)) if (id !== except) c.reset();
}

// --- Size switch ------------------------------------------------------------------

function switchSize(id, { push }) {
  if (!PUZZLE_IDS.includes(id) || id === puzzle.id || scrambling) return;
  player.pause();
  resetConfirms();
  view.render(displayed()); // cancels a running animation in the old views
  Object.assign(sessionFor(puzzle), { input, solution });
  puzzle = PUZZLES[id];
  ({ input, solution } = sessionFor(puzzle));
  storageSet(SIZE_KEY, id);
  if (push) history.pushState(null, '', `#${id}`);
  buildViews();
  $('solution').hidden = !solution;
  if (message.key !== 'msg.init') setMessage(null);
  render();
}

for (const btn of document.querySelectorAll('.size-switch .size')) {
  btn.addEventListener('click', () => switchSize(btn.dataset.size, { push: true }));
}
window.addEventListener('hashchange', () => {
  const id = sizeFromHash(location.hash);
  if (id) switchSize(id, { push: false });
});

// --- Remaining controls -------------------------------------------------------------

buildPalette();
$('solve').addEventListener('click', () => {
  resetConfirms();
  solve();
});
$('reset-camera').addEventListener('click', () => cube3d.resetCamera());
for (const action of ['first', 'prev', 'next', 'last']) {
  $(action).addEventListener('click', () => navigate(action));
}
$('play').addEventListener('click', togglePlay);
$('tempo').addEventListener('change', (e) => player.setTempo(e.target.value));
document.addEventListener('keydown', (e) => {
  if (!solution || scrambling) return;
  const action = keyAction(e);
  if (!action) return;
  e.preventDefault();
  navigate(action);
});

// --- Static texts and language switch ---------------------------------------------

function applyLanguage() {
  document.documentElement.lang = i18n.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  // Only our own dictionary text goes through innerHTML (it contains <strong>), never user input.
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  }
  $('meta-description').setAttribute('content', t('meta.description'));
  $('cube3d').setAttribute('aria-label', t('cube3d.label'));
  for (const btn of document.querySelectorAll('.lang-switch .lang')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === i18n.lang));
  }
  resetConfirms();
  renderPlayButton();
  renderMessage();
  // Texts only: a full render() would cancel a running 3D animation.
  net.render(displayed());
  renderPalette();
  renderSolution();
}

for (const btn of document.querySelectorAll('.lang-switch .lang')) {
  btn.addEventListener('click', () => {
    if (!LANGS.includes(btn.dataset.lang)) return;
    i18n.setLang(btn.dataset.lang);
    storageSet(LANG_KEY, i18n.lang);
    applyLanguage();
  });
}

// --- Start --------------------------------------------------------------------------

history.replaceState(null, '', `#${puzzle.id}`);
buildViews();
setMessage('msg.init');
applyLanguage();
render();

// Let the page paint before the ~0.5 s table build of the 2x2 solver.
setTimeout(() => {
  for (const p of Object.values(PUZZLES)) p.prepare?.();
  solverReady = true;
  $('solve').disabled = scrambling;
  if (message.key === 'msg.init') setMessage('msg.ready');
}, 0);
