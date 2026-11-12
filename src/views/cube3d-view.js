// 3D view: the cube as CSS-3D cubies (any size n). Implements the view interface
// { render(facelets), showMove(move, direction), showHint(move|null), highlight(index|null) }.
import { createGeometry, FACE_NORMALS, inLayer, rotation, cssRotate } from '../engine/geometry.js';
import { DEFAULT_CAMERA, isFaceVisible, nextCameraAction } from '../engine/camera.js';

const CAMERA_MS = 300;
const DRAG_THRESHOLD = 5; // px before a press counts as camera drag
const DEG_PER_PX = 0.5;

// CSS placement of a cubie face (CSS y points down).
const FACE_TRANSFORMS = {
  U: 'rotateX(90deg)',
  D: 'rotateX(-90deg)',
  F: '',
  B: 'rotateY(180deg)',
  R: 'rotateY(90deg)',
  L: 'rotateY(-90deg)',
};

const sameVec = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const NO_ROTATION = 'rotateX(0deg)';
const TURN_MS = 300;
const HALF_TURN_PAUSE_MS = 400;

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Curved clockwise arrow (≈270°) with an arrow head; mirrored for counter-clockwise.
const ARROW_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g class="arrow-path">
    <path d="M 50 22 A 28 28 0 1 1 22 50" />
    <polygon points="22,34 12,54 32,54" />
  </g>
  <text x="50" y="50" class="arrow-double">2</text>
</svg>`;

/**
 * @param {HTMLElement} container
 * @param {{ n?: number, onStickerClick?(index: number): void }} [options]
 */
export function createCube3dView(container, { n = 2, onStickerClick = () => {} } = {}) {
  const { stickers: STICKERS, cubies: CUBIES } = createGeometry(n);
  const camera = { ...DEFAULT_CAMERA };
  const stickers = new Array(STICKERS.length);
  const cubies = [];

  container.classList.add('cube3d');
  container.style.setProperty('--n', String(n));
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', '3D-Ansicht des Würfels (ziehen zum Drehen)');
  const scene = document.createElement('div');
  scene.className = 'scene';
  const cam = document.createElement('div');
  cam.className = 'camera';
  scene.append(cam);
  container.replaceChildren(scene);

  for (const position of CUBIES) {
    const el = document.createElement('div');
    el.className = 'cubie';
    const translate = `translate3d(calc(${position[0]} * var(--h)), calc(${-position[1]} * var(--h)), calc(${position[2]} * var(--h)))`;
    for (const [face, normal] of Object.entries(FACE_NORMALS)) {
      const f = document.createElement('div');
      f.className = 'cubie-face';
      f.style.transform = `${FACE_TRANSFORMS[face]} translateZ(var(--h))`;
      const index = STICKERS.findIndex((s) => sameVec(s.position, position) && sameVec(s.normal, normal));
      if (index >= 0) {
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.dataset.index = String(index);
        stickers[index] = sticker;
        f.append(sticker);
      }
      el.append(f);
    }
    cubies.push({ el, position, translate });
    cam.append(el);
  }

  function resetCubies() {
    for (const c of cubies) {
      c.el.style.transition = 'none';
      c.el.style.transform = `${NO_ROTATION} ${c.translate}`;
    }
  }

  function applyCamera() {
    cam.style.transform = `rotateX(${camera.x}deg) rotateY(${camera.y}deg)`;
  }

  /** View to return to after the camera turned towards a hidden face (null: none). */
  let savedCamera = null;

  /** Moves the camera (animated unless reduced motion). Returns true if it changed. */
  function moveCamera(target) {
    if (target.x === camera.x && target.y === camera.y) return false;
    cam.style.transition = reducedMotion() ? 'none' : `transform ${CAMERA_MS}ms ease-in-out`;
    Object.assign(camera, target);
    applyCamera();
    return true;
  }

  function followFace(face) {
    const action = nextCameraAction(savedCamera, { ...camera }, face);
    savedCamera = action.saved;
    return moveCamera(action.camera);
  }

  // Camera drag (pointer events). A press only becomes a drag after DRAG_THRESHOLD px,
  // so a plain click still reaches the sticker.
  let press = null;
  let suppressClick = false;
  container.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: { ...camera }, dragging: false };
    suppressClick = false;
  });
  container.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (e.buttons === 0) {
      // Released outside the cube before the drag started (no capture yet).
      endPress(e);
      return;
    }
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      press.dragging = true;
      savedCamera = null; // the user takes over the view
      cam.style.transition = 'none';
      suppressClick = true;
      container.setPointerCapture?.(e.pointerId);
      container.classList.add('dragging');
    }
    if (press.dragging) {
      camera.y = press.cam.y + dx * DEG_PER_PX;
      camera.x = Math.max(-90, Math.min(90, press.cam.x - dy * DEG_PER_PX));
      applyCamera();
    }
  });
  function endPress(e) {
    if (press && e.pointerId === press.id) {
      press = null;
      container.classList.remove('dragging');
    }
  }
  container.addEventListener('pointerup', endPress);
  container.addEventListener('pointercancel', endPress);
  container.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const sticker = e.target.closest?.('.sticker');
    if (sticker) onStickerClick(Number(sticker.dataset.index));
  });

  const hint = document.createElement('div');
  hint.className = 'hint-arrow';
  hint.innerHTML = ARROW_SVG;
  hint.hidden = true;
  cam.append(hint);

  const counter = document.createElement('div');
  counter.className = 'turn-count';
  counter.hidden = true;
  cam.append(counter);

  let gen = 0; // bumped by render() and each showMove; older animations stop

  function showCount(face, n) {
    counter.hidden = !face;
    if (!face) return;
    counter.textContent = String(n);
    counter.style.transform = `${FACE_TRANSFORMS[face]} translateZ(calc(var(--cube) / 2 + 4px))`;
  }

  function setLayer(layer, axis, deg, ms) {
    for (const c of layer) {
      c.el.style.transition = ms ? `transform ${ms}ms ease-in-out` : 'none';
      c.el.style.transform = `${cssRotate({ axis, degrees: deg })} ${c.translate}`;
    }
  }

  /** Transitions the layer to `deg`; resolves on transitionend or after a fallback timeout. */
  async function turnLayer(layer, axis, deg, ms) {
    void cam.offsetWidth; // commit the current transform before transitioning
    const end = new Promise((resolve) => {
      layer[0].el.addEventListener('transitionend', resolve, { once: true });
    });
    setLayer(layer, axis, deg, ms);
    await Promise.race([end, wait(ms + 100)]);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  resetCubies();
  applyCamera();

  return {
    render(facelets) {
      gen++; // cancels a running showMove
      showCount(null);
      resetCubies();
      facelets.forEach((color, i) => {
        stickers[i].dataset.color = color ?? '';
      });
    },
    /**
     * Animates the layer turn; the app renders the resulting state afterwards.
     * Half turns run as two counted quarter turns with a pause in between.
     */
    async showMove(move, direction, { countHalfTurns = true } = {}) {
      const my = ++gen;
      const stale = () => gen !== my;
      hint.hidden = true;
      const { axis, degrees } = rotation(move);
      const layer = cubies.filter((c) => inLayer(c.position, move.face, n));
      const target = degrees * direction;
      setLayer(layer, axis, 0, 0);
      if (!isFaceVisible(move.face, camera) && followFace(move.face) && !reducedMotion()) {
        await wait(CAMERA_MS);
        if (stale()) return;
      }
      if (reducedMotion()) return;
      if (move.turns !== 2 || !countHalfTurns) {
        await turnLayer(layer, axis, target, TURN_MS);
        return;
      }
      try {
        showCount(move.face, 1);
        await turnLayer(layer, axis, target / 2, TURN_MS);
        if (stale()) return;
        await wait(HALF_TURN_PAUSE_MS);
        if (stale()) return;
        showCount(move.face, 2);
        await turnLayer(layer, axis, target, TURN_MS);
      } finally {
        if (!stale()) showCount(null);
      }
    },
    showHint(move) {
      followFace(move ? move.face : null);
      hint.hidden = !move;
      if (!move) return;
      hint.dataset.face = move.face;
      hint.classList.toggle('ccw', move.turns === -1);
      hint.classList.toggle('double', move.turns === 2);
      hint.style.transform = `${FACE_TRANSFORMS[move.face]} translateZ(calc(var(--cube) / 2 + 3px))`;
    },
    highlight(index) {
      stickers.forEach((s, i) => s.classList.toggle('highlighted', i === index));
    },
    resetCamera() {
      savedCamera = null;
      cam.style.transition = 'none';
      Object.assign(camera, DEFAULT_CAMERA);
      applyCamera();
    },
  };
}
