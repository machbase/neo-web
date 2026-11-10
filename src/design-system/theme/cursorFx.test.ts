import { COMET_MAX_BITS, CURSOR_FX_LAYER_ID, CURSOR_FX_POOL, CURSOR_FX_VAR, cometHead, cometWorld, listenForCursorFx, syncCursorFx, themeCursorFx } from './cursorFx';
import { THEME_CHANGE_EVENT } from './theme';

const layer = () => document.getElementById(CURSOR_FX_LAYER_ID);
const move = (aX: number, aY: number) => window.dispatchEvent(new MouseEvent('pointermove', { clientX: aX, clientY: aY }));
const setFx = (aValue: string | null) => (aValue === null ? document.documentElement.style.removeProperty(CURSOR_FX_VAR) : document.documentElement.style.setProperty(CURSOR_FX_VAR, aValue));
let sReduced = false;

beforeEach(() => {
    sReduced = false;
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce') && sReduced, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn() })) as any;
});
afterEach(() => {
    setFx(null);
    syncCursorFx();
});

test('the theme names the effect through --neo-fx-cursor', () => {
    expect(themeCursorFx()).toBe('');
    setFx(' Sandevistan ');
    expect(themeCursorFx()).toBe('sandevistan');
});

test('sandevistan: one layer over the page that takes no pointer events; another theme removes it', () => {
    setFx('sandevistan');
    syncCursorFx();
    syncCursorFx();
    expect(document.querySelectorAll(`#${CURSOR_FX_LAYER_ID}`)).toHaveLength(1);
    expect(layer()?.style.pointerEvents).toBe('none');
    expect(layer()?.getAttribute('aria-hidden')).toBe('true');
    setFx('none');
    syncCursorFx();
    expect(layer()).toBeNull();
});

test('a move places after-images along the path from a fixed set of layers — none is added per move', () => {
    setFx('sandevistan');
    syncCursorFx();
    const sGhosts = Array.from(layer()?.children ?? []) as HTMLElement[];
    expect(sGhosts).toHaveLength(CURSOR_FX_POOL);
    move(100, 100);
    move(160, 100);
    // the first move drops one; 60px more drops five, 12px apart, ending under the pointer (tip at 12, 10)
    expect(sGhosts.slice(0, 6).map((g) => g.style.transform)).toEqual([88, 100, 112, 124, 136, 148].map((x) => `translate(${x}px, 90px)`));
    for (let i = 0; i < 200; i++) move(i % 2 ? 900 : 100, 100 + i);
    expect(layer()?.children).toHaveLength(CURSOR_FX_POOL);
});

test('reduced motion: never on', () => {
    sReduced = true;
    setFx('sandevistan');
    syncCursorFx();
    expect(layer()).toBeNull();
});

/** A repeatable Math.random. */
const seeded = (aSeed: number) => () => {
    aSeed = (aSeed * 1664525 + 1013904223) % 4294967296;
    return aSeed / 4294967296;
};
/** A comet's world run for aSeconds in 60 frames a second. */
const runFor = (aWorld: ReturnType<typeof cometWorld>, aSeconds: number) => {
    for (let i = 0; i < Math.round(aSeconds * 60); i++) aWorld.step(1 / 60);
};

test('comet: one canvas over the page that takes no pointer events — nothing is added per move', () => {
    setFx('comet');
    syncCursorFx();
    expect(document.querySelectorAll(`#${CURSOR_FX_LAYER_ID}`)).toHaveLength(1);
    expect(layer()?.tagName).toBe('CANVAS');
    expect(layer()?.style.pointerEvents).toBe('none');
    expect(layer()?.getAttribute('aria-hidden')).toBe('true');
    const sNodes = document.body.querySelectorAll('*').length;
    for (let i = 0; i < 300; i++) move(i % 2 ? 900 : 100, 100 + i);
    expect(document.body.querySelectorAll('*').length).toBe(sNodes);
});

test('comet: one falls only after the pointer has travelled', () => {
    const sFrames = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    jest.spyOn(performance, 'now').mockReturnValue(1000);
    try {
        setFx('comet');
        syncCursorFx();
        move(100, 100);
        move(110, 100);
        expect(sFrames).not.toHaveBeenCalled();
        move(150, 100);
        expect(sFrames).toHaveBeenCalledTimes(1);
    } finally {
        sFrames.mockRestore();
        (performance.now as jest.Mock).mockRestore();
    }
});

test('comet: the head falls down and to the left, shedding glitter all the way down — about 110 bits a second, one in five a sparkle', () => {
    const sWorld = cometWorld(['#fff'], seeded(7));
    sWorld.spawn(500, 100);
    const [sComet] = sWorld.comets;
    const sStart = cometHead(sComet);
    runFor(sWorld, 0.5);
    const sNow = cometHead(sComet);
    expect(sNow.x).toBeLessThan(sStart.x);
    expect(sNow.y).toBeGreaterThan(sStart.y + 50);
    expect(sWorld.bits.length).toBeGreaterThan(45);
    expect(sWorld.bits.length).toBeLessThan(65);
    // over many comets, the share of sparkles
    const sMany = cometWorld(['#fff'], seeded(11));
    for (let i = 0; i < 20; i++) sMany.spawn(500, 100 + i);
    runFor(sMany, 0.3);
    const sShare = sMany.bits.filter((b) => b.sparkle).length / sMany.bits.length;
    expect(sShare).toBeGreaterThan(0.15);
    expect(sShare).toBeLessThan(0.3);
    // it stops shedding near the end of its fall, and is gone when its fall is over
    runFor(sWorld, 0.5);
    expect(sWorld.comets).toHaveLength(0);
});

test('comet: every bit goes its own way — drifting back, spreading off the line of the fall and sinking — a loose cloud, not a dotted line', () => {
    const sWorld = cometWorld(['#fff'], seeded(3));
    sWorld.spawn(500, 100);
    const [sComet] = sWorld.comets;
    const { dx, dy } = sComet;
    runFor(sWorld, 0.4);
    const sTracked = sWorld.bits.slice(0, 10).map((b) => ({ b, vy: b.vy }));
    runFor(sWorld, 0.2);
    // sinking: each bit falls faster than it did
    for (const t of sTracked) if (t.b.age < t.b.life) expect(t.b.vy).toBeGreaterThan(t.vy);
    // spread: how far the bits sit off the comet's line, across it — not all on it
    const sOff = sWorld.bits.map((b) => (b.x - sComet.x) * -dy + (b.y - sComet.y) * dx);
    const sMean = sOff.reduce((a, v) => a + v, 0) / sOff.length;
    const sSpread = Math.sqrt(sOff.reduce((a, v) => a + (v - sMean) ** 2, 0) / sOff.length);
    expect(sSpread).toBeGreaterThan(2);
    // each its own way: the bits do not share a velocity (a pinch of specks moving as one would)
    const sVx = sWorld.bits.map((b) => b.vx);
    const sVxMean = sVx.reduce((a, v) => a + v, 0) / sVx.length;
    expect(Math.sqrt(sVx.reduce((a, v) => a + (v - sVxMean) ** 2, 0) / sVx.length)).toBeGreaterThan(6);
    // drifting back: the bits' own motion has them move against the fall at first
    const sFresh = cometWorld(['#fff'], seeded(5));
    sFresh.spawn(500, 100);
    runFor(sFresh, 0.1);
    const sBack = sFresh.bits.reduce((a, b) => a + (b.vx * dx + (b.vy - b.sink * b.age) * dy), 0) / sFresh.bits.length;
    expect(sBack).toBeLessThan(-10);
});

test('comet: never more bits than the cap, however much the pointer moves', () => {
    const sWorld = cometWorld(['#fff'], seeded(9));
    for (let i = 0; i < 200; i++) sWorld.spawn(10 * i, 100);
    runFor(sWorld, 0.5);
    expect(sWorld.bits.length).toBeLessThanOrEqual(COMET_MAX_BITS);
});

test('switching effects replaces the layer: sandevistan → comet → off', () => {
    setFx('sandevistan');
    syncCursorFx();
    expect(layer()?.children).toHaveLength(CURSOR_FX_POOL);
    setFx('comet');
    syncCursorFx();
    expect(document.querySelectorAll(`#${CURSOR_FX_LAYER_ID}`)).toHaveLength(1);
    expect(layer()?.tagName).toBe('CANVAS');
    setFx('none');
    syncCursorFx();
    expect(layer()).toBeNull();
});

test('comet under reduced motion: never on', () => {
    sReduced = true;
    setFx('comet');
    syncCursorFx();
    expect(layer()).toBeNull();
});

test('an unknown effect name is no effect', () => {
    setFx('confetti');
    syncCursorFx();
    expect(layer()).toBeNull();
    // nor a name that only an object's prototype has
    setFx('constructor');
    syncCursorFx();
    expect(layer()).toBeNull();
});

test('follows theme changes once listening', () => {
    const sStop = listenForCursorFx();
    expect(layer()).toBeNull();
    setFx('sandevistan');
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: null }));
    expect(layer()).not.toBeNull();
    sStop();
    expect(layer()).toBeNull();
});
