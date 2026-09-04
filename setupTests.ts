import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';
import { deserialize as v8Deserialize, serialize as v8Serialize } from 'node:v8';

if (typeof global.TextEncoder === 'undefined') {
    (global as any).TextEncoder = TextEncoder;
}

// jsdom exposes no structuredClone, but the panel code deep-copies its shared default options with it
// (that copy is what keeps a saved panel from freezing the module-level defaults), so any test that
// touches a panel type change or the panel validator dies with a ReferenceError. Node's own global is
// outside the jsdom sandbox and unreachable from here, so stand in with v8's serializer: it implements
// the same structured-clone semantics, where a JSON round-trip would quietly turn Dates into strings
// and drop keys whose value is undefined - and DefaultChartOption carries four such keys.
//
// The clone comes back built in the Node realm, so `cloned instanceof Date` is false across the jsdom
// boundary even though it is a real Date. Assert on the value, or on Array.isArray, which is
// realm-safe; the panel code this exists for clones plain objects and arrays only.
if (typeof (global as any).structuredClone === 'undefined') {
    (global as any).structuredClone = (aValue: any) => v8Deserialize(v8Serialize(aValue));
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
