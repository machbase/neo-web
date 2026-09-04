import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

if (typeof global.TextEncoder === 'undefined') {
    (global as any).TextEncoder = TextEncoder;
}

// jsdom exposes no structuredClone, but the panel code deep-copies its shared default options with it
// (that copy is what keeps a saved panel from freezing the module-level defaults), so any test that
// touches a panel type change or the panel validator dies with a ReferenceError. Node has had the real
// thing as a global since 17, so hand jsdom that one rather than a lossy JSON round-trip.
if (typeof (global as any).structuredClone === 'undefined') {
    (global as any).structuredClone = globalThis.structuredClone ?? ((aValue: any) => JSON.parse(JSON.stringify(aValue)));
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
