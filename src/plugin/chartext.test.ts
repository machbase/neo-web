/**
 * chartext plugin regression tests.
 *  #2 — data-processed must be set ONLY after a successful bootstrap run (so a transient
 *       failure can retry instead of freezing on the error text).
 *  #1 — the previous generation of chart instances must be disposed on content re-injection,
 *       even after their DOM nodes have been detached (leak fix via the per-root registry).
 *
 * echarts is mocked: real echarts.init needs a canvas 2d context that jsdom lacks, and we
 * only care about the dispose / getInstanceByDom bookkeeping here.
 *
 * Chart blocks are built with innerHTML (as the server-rendered markdown HTML is injected in
 * production) so the <script> nodes are INERT — chartext is the only thing that runs them,
 * exactly like the real flow.
 */

const mockInstanceMap = new Map<Element, { dispose: jest.Mock; resize: jest.Mock }>();

jest.mock('echarts', () => ({
    __esModule: true,
    getInstanceByDom: (node: Element) => mockInstanceMap.get(node),
}));

import setChartext, { disposeChartext } from './chartext';

// Mirrors a real server bootstrap script: find its own <script> via window.__chartextCurrentScript,
// then "init" a chart on the sibling .chartext-echarts node.
(window as any).__testBoot = () => {
    const script = (window as any).__chartextCurrentScript as HTMLScriptElement;
    const node = script.previousElementSibling as HTMLElement;
    // dispose() removes the instance from the registry, mirroring echarts: getInstanceByDom
    // returns undefined once an instance is disposed (so a double-dispose is a no-op).
    mockInstanceMap.set(node, { dispose: jest.fn(() => mockInstanceMap.delete(node)), resize: jest.fn() });
};

const makeChartBlock = (root: HTMLElement, bootCode: string) => {
    const wrap = document.createElement('div');
    wrap.className = 'chartext';
    // innerHTML => the <script> is inert (already-started), like production markdown injection
    wrap.innerHTML = `<div class="chartext-echarts"></div><script>${bootCode}</script>`;
    root.appendChild(wrap);
    return {
        wrap,
        chart: wrap.querySelector('.chartext-echarts') as HTMLElement,
        script: wrap.querySelector('script') as HTMLScriptElement,
    };
};

beforeEach(() => {
    mockInstanceMap.clear();
    document.body.innerHTML = '';
    (window as any).__attempt = 0;
});

describe('#2 data-processed ordering', () => {
    test('successful script is marked data-processed', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const { script } = makeChartBlock(root, 'window.__testBoot();');

        setChartext(root);

        expect(script.getAttribute('data-processed')).toBe('true');
    });

    test('throwing script is NOT marked (retryable) and surfaces the error', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const { chart, script } = makeChartBlock(root, 'throw new Error("boom");');

        setChartext(root);

        expect(script.getAttribute('data-processed')).toBeNull();
        expect((chart as any).innerText).toContain('Chart script error');
        expect((chart as any).innerText).toContain('boom');
    });

    test('a script that throws once then succeeds boots on retry', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const code = 'if ((window.__attempt++) === 0) { throw new Error("transient"); } window.__testBoot();';
        const { chart, script } = makeChartBlock(root, code);

        setChartext(root); // 1st: throws -> unmarked
        expect(script.getAttribute('data-processed')).toBeNull();
        expect(mockInstanceMap.get(chart)).toBeUndefined();

        setChartext(root); // 2nd: retry -> boots
        expect(script.getAttribute('data-processed')).toBe('true');
        expect(mockInstanceMap.get(chart)).toBeDefined();
    });
});

describe('#1 previous generation disposed on re-injection', () => {
    test('old (detached) instance is disposed before the new one boots', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);

        // generation 1
        const g1 = makeChartBlock(root, 'window.__testBoot();');
        setChartext(root);
        const inst1 = mockInstanceMap.get(g1.chart)!;
        expect(inst1).toBeDefined();
        expect(inst1.dispose).not.toHaveBeenCalled();

        // simulate ShadowContent / innerHTML re-injection: detach old, inject new
        root.removeChild(g1.wrap); // g1.chart is now DETACHED — a querySelector on root can't find it
        const g2 = makeChartBlock(root, 'window.__testBoot();');

        setChartext(root);

        expect(inst1.dispose).toHaveBeenCalledTimes(1); // old gen disposed via registry
        const inst2 = mockInstanceMap.get(g2.chart)!;
        expect(inst2).toBeDefined();
        expect(inst2.dispose).not.toHaveBeenCalled(); // new gen alive
    });

    test('disposeChartext disposes the tracked instance exactly once on unmount', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const g1 = makeChartBlock(root, 'window.__testBoot();');
        setChartext(root);
        const inst1 = mockInstanceMap.get(g1.chart)!;

        disposeChartext(root);

        expect(inst1.dispose).toHaveBeenCalledTimes(1);
    });
});
