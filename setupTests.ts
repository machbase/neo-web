import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

if (typeof global.TextEncoder === 'undefined') {
    (global as any).TextEncoder = TextEncoder;
}

// jsdom ships no 2d context, and every component that measures text width hits it — each miss prints
// a "not implemented" stack that buries the real failures. Callers already treat a missing context as
// "cannot measure" and fall back, so hand back the same null quietly instead of installing `canvas`.
HTMLCanvasElement.prototype.getContext = () => null;
