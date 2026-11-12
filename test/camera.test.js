import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CAMERA, FACE_VIEWS, isFaceVisible, nextCameraAction } from '../src/engine/camera.js';

test('default camera shows U, R, F and hides D, L, B', () => {
  assert.deepEqual(DEFAULT_CAMERA, { x: -25, y: -35 });
  for (const f of ['U', 'R', 'F']) assert.ok(isFaceVisible(f, DEFAULT_CAMERA), f);
  for (const f of ['D', 'L', 'B']) assert.ok(!isFaceVisible(f, DEFAULT_CAMERA), f);
});

test('each face is visible from its own view', () => {
  for (const f of ['U', 'R', 'F', 'D', 'L', 'B']) assert.ok(isFaceVisible(f, FACE_VIEWS[f]), f);
  assert.ok(!isFaceVisible('F', FACE_VIEWS.B));
});

test('nextCameraAction', () => {
  const D = DEFAULT_CAMERA;
  // visible, nothing saved -> no change
  assert.deepEqual(nextCameraAction(null, D, 'R'), { camera: D, saved: null });
  // hidden -> rotate to the face view and remember where we were
  assert.deepEqual(nextCameraAction(null, D, 'B'), { camera: FACE_VIEWS.B, saved: D });
  // after a hidden move, next face visible from the remembered view -> go back
  assert.deepEqual(nextCameraAction(D, FACE_VIEWS.B, 'U'), { camera: D, saved: null });
  // next face hidden in the remembered view too -> stay away from it
  assert.deepEqual(nextCameraAction(D, FACE_VIEWS.B, 'B'), { camera: FACE_VIEWS.B, saved: D });
  assert.deepEqual(nextCameraAction(D, FACE_VIEWS.B, 'D'), { camera: FACE_VIEWS.D, saved: D });
  // no next move -> back to the remembered view (or stay)
  assert.deepEqual(nextCameraAction(D, FACE_VIEWS.L, null), { camera: D, saved: null });
  assert.deepEqual(nextCameraAction(null, D, null), { camera: D, saved: null });
  // a user-chosen view that already shows the face is kept
  const custom = { x: -25, y: 145 };
  assert.deepEqual(nextCameraAction(null, custom, 'B'), { camera: custom, saved: null });
});
