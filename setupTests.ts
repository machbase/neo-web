import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

if (typeof global.TextEncoder === 'undefined') {
    (global as any).TextEncoder = TextEncoder;
}

// jsdom ships no 2d context, and every component that measures text width hits it — each miss prints
// a "not implemented" stack that buries the real failures. Callers already treat a missing context as
// "cannot measure" and fall back, so hand back the same null quietly instead of installing `canvas`.
HTMLCanvasElement.prototype.getContext = () => null;

// jsdom has no ResizeObserver, and `split-pane-react` constructs one on mount — so ANY test that
// renders a component behind a <SplitPane> (bridge / timer / shell / key detail pages all are) dies
// with a ReferenceError before it can assert anything. A no-op observer is enough: these tests
// assert behaviour, never pane geometry.
if (typeof (global as any).ResizeObserver === 'undefined') {
    (global as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
