import * as echarts from 'echarts';

type ChartRoot = ShadowRoot | HTMLElement | Document;

const ensureEchartsGlobal = () => {
    const win = window as any;
    if (!win.echarts) {
        win.echarts = echarts;
    }
};

// Per-root registry of chart container nodes we have booted. echarts keeps every instance in
// an internal registry keyed by the DOM node. When ShadowContent wipes the shadow (or the
// public mirror replaces innerHTML) the previous-generation `.chartext-echarts` nodes are
// DETACHED, so a querySelector on the now-fresh root can no longer reach them to dispose —
// the old echarts instances and their window 'resize' listeners would leak on every content
// change. Holding the node refs here lets us dispose the previous generation even after it
// has been detached. Keyed by root, so different panels/shadow-roots never dispose each other.
const bootedNodes = new WeakMap<ChartRoot, Set<HTMLElement>>();

const trackedFor = (root: ChartRoot): Set<HTMLElement> => {
    let set = bootedNodes.get(root);
    if (!set) {
        set = new Set<HTMLElement>();
        bootedNodes.set(root, set);
    }
    return set;
};

const disposeNode = (node: HTMLElement) => {
    const elem = node as any;
    if (elem.__chartextResizeHandler) {
        window.removeEventListener('resize', elem.__chartextResizeHandler);
        elem.__chartextResizeHandler = null;
    }
    try {
        const instance = echarts.getInstanceByDom(node);
        if (instance) {
            instance.dispose();
        }
    } catch {
        // instance already disposed or node invalid — ignore
    }
};

// "white" is NOT a built-in ECharts theme and the server ships no /web/echarts/themes/white.js, so
// the server bootstrap's `echarts.init(dom, "white")` silently falls back to the default theme —
// which has a TRANSPARENT background and dark ink, so on a dark markdown/dashboard surface the chart
// is invisible (dark-on-black). We register a real "white" theme (white background, default dark
// ink) on the SAME runtime echarts the bootstrap uses, BEFORE it runs, so init(dom, "white") paints
// white from the start — no post-init setOption, no timing poll, no white hairline (issue #1435).
// Opaque-theme charts (dark, purple-passion, chalk, … which DO ship a theme asset) are unaffected.
let lastEcWithWhiteTheme: any = null;
const ensureWhiteTheme = () => {
    // Use the runtime global echarts the bootstrap init's with — it may be a DIFFERENT instance than
    // this module's bundled import (e.g. /web/echarts/echarts.min.js claims window.echarts first when
    // a standard chart shares the dashboard). registerTheme must land on that instance.
    const ec: any = (window as any).echarts ?? echarts;
    if (!ec || ec === lastEcWithWhiteTheme || typeof ec.registerTheme !== 'function') return;
    try {
        ec.registerTheme('white', { backgroundColor: '#ffffff' });
        lastEcWithWhiteTheme = ec;
    } catch {
        // ignore — registration is best-effort
    }
};

const disposeCharts = (root: ChartRoot) => {
    // Dispose the previous generation held in the registry first — these nodes may already be
    // detached, in which case the querySelector below would miss them.
    const tracked = bootedNodes.get(root);
    if (tracked) {
        tracked.forEach(disposeNode);
        tracked.clear();
    }
    // Also dispose any chart nodes still live in the DOM (belt & suspenders).
    root.querySelectorAll<HTMLElement>('.chartext-echarts').forEach(disposeNode);
};

const executePendingScripts = (root: ChartRoot) => {
    const scripts = root.querySelectorAll<HTMLScriptElement>('.chartext script:not([data-processed])');
    scripts.forEach((script) => {
        const win = window as any;
        const code = script.textContent ?? '';
        try {
            win.__chartextCurrentScript = script;
            // Execute chart bootstrap script after HTML injection even in Shadow DOM.
            new Function(code)();
            // Mark processed only AFTER a successful run so a transient failure (e.g. DOM not
            // ready, temporary reference error) can retry on the next setChartext pass instead
            // of being permanently skipped and frozen on the error text.
            script.setAttribute('data-processed', 'true');
        } catch (err: any) {
            const chartNode = script.previousElementSibling as HTMLElement | null;
            if (chartNode) {
                chartNode.innerText = `Chart script error: ${err?.message ?? String(err)}`;
            }
        } finally {
            win.__chartextCurrentScript = null;
        }
    });
};

export const disposeChartext = (root?: ShadowRoot | HTMLElement | null) => {
    disposeCharts(root ?? document);
};

export const resizeChartext = (root?: ShadowRoot | HTMLElement | null) => {
    const nodes = (root ?? document).querySelectorAll<HTMLElement>('.chartext-echarts');
    nodes.forEach((node) => {
        const instance = echarts.getInstanceByDom(node);
        if (instance) {
            instance.resize();
        }
    });
};

const setChartext = (root?: ShadowRoot | HTMLElement | null) => {
    ensureEchartsGlobal();
    // Register the "white" theme on the runtime echarts BEFORE any bootstrap script runs, so a
    // `echarts.init(dom, "white")` gets a real white background instead of the transparent default.
    ensureWhiteTheme();
    const target = root ?? document;

    const pendingScripts = target.querySelectorAll<HTMLScriptElement>('.chartext script:not([data-processed])');
    if (pendingScripts.length === 0) {
        return;
    }

    // Dispose the previous generation (tracked, possibly detached) before booting the new one.
    disposeCharts(target);
    executePendingScripts(target);

    // Track the freshly-booted chart nodes so the next setChartext / disposeChartext can clean
    // them up even after a content re-injection detaches them.
    const tracked = trackedFor(target);
    target.querySelectorAll<HTMLElement>('.chartext-echarts').forEach((node) => tracked.add(node));
};

export default setChartext;
