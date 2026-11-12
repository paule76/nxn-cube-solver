// Registry of supported cube sizes.
import { cube2 } from './cube2.js';
import { cube3 } from './cube3.js';

export const PUZZLE_IDS = Object.freeze(['2x2', '3x3']);
export const PUZZLES = Object.freeze({ '2x2': cube2, '3x3': cube3 });
