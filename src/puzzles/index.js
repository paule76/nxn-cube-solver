// Registry of supported cube sizes.
import { cube2 } from './cube2.js';
import { cube3 } from './cube3.js';
import { cube4 } from './cube4.js';

export const PUZZLE_IDS = Object.freeze(['2x2', '3x3', '4x4']);
export const PUZZLES = Object.freeze({ '2x2': cube2, '3x3': cube3, '4x4': cube4 });
