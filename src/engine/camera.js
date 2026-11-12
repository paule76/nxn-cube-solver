// Camera angles for the 3D view and which faces they show.
// The view applies `rotateX(x) rotateY(y)` (CSS: y points down, the viewer looks along −z).
import { FACE_NORMALS } from './geometry.js';

export const DEFAULT_CAMERA = Object.freeze({ x: -25, y: -35 });

/** A fixed view per face from which that face is clearly visible. */
export const FACE_VIEWS = Object.freeze({
  U: DEFAULT_CAMERA,
  R: DEFAULT_CAMERA,
  F: DEFAULT_CAMERA,
  D: Object.freeze({ x: 25, y: -35 }),
  L: Object.freeze({ x: -25, y: 35 }),
  B: Object.freeze({ x: -25, y: 145 }),
});

const rad = (d) => (d * Math.PI) / 180;

/** True if the outward normal of `face` points towards the viewer. */
export function isFaceVisible(face, camera) {
  const [nx, ny, nz] = FACE_NORMALS[face];
  const [x, y, z] = [nx, -ny, nz]; // to CSS coordinates
  const a = rad(camera.y);
  const z1 = -Math.sin(a) * x + Math.cos(a) * z; // rotateY
  const b = rad(camera.x);
  const z2 = Math.sin(b) * y + Math.cos(b) * z1; // rotateX
  return z2 > 0.1;
}

/**
 * Where the camera should be for the next move.
 * @param {{x:number,y:number}|null} saved view to return to after hidden moves (null: none)
 * @param {{x:number,y:number}} current current view
 * @param {string|null} nextFace face of the next move, or null if there is none
 * @returns {{ camera: {x:number,y:number}, saved: {x:number,y:number}|null }}
 */
export function nextCameraAction(saved, current, nextFace) {
  if (!nextFace) return { camera: saved ?? current, saved: null };
  if (saved) {
    if (isFaceVisible(nextFace, saved)) return { camera: saved, saved: null };
    return { camera: isFaceVisible(nextFace, current) ? current : FACE_VIEWS[nextFace], saved };
  }
  if (isFaceVisible(nextFace, current)) return { camera: current, saved: null };
  return { camera: FACE_VIEWS[nextFace], saved: current };
}
