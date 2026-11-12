// 2x2 view of the N×N geometry (kept so existing imports stay valid).
import { createGeometry, inLayer as inLayerN, FACE_NORMALS, rotation, rotateVec, cssRotate } from './engine/geometry.js';

const G2 = createGeometry(2);

/** @type {{position:number[], normal:number[]}[]} index = facelet index */
export const STICKERS = G2.stickers;
export const CUBIES = G2.cubies;

/** True if the cubie at `position` belongs to the layer of `face` (2x2). */
export const inLayer = (position, face) => inLayerN(position, face, 2);

export { FACE_NORMALS, rotation, rotateVec, cssRotate };
