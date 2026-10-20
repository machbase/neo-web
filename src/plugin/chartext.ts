import type { ChartTheme } from '@/type/eChart';
import { ChartThemeBackgroundColor } from '@/utils/constants';
import { getEcharts, loadEcharts } from './echartsRuntime';

type ChartRoot = ShadowRoot | HTMLElement | Document;

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
        // The runtime is the one the server bootstrap init'd with — there is only one now, so a
        // single lookup finds every instance. This used to consult the bundled copy, which could
        // not see instances the server copy had created.
        const instance = getEcharts()?.getInstanceByDom(node);
        if (instance) {
            instance.dispose();
        }
    } catch {
        // instance already disposed or node invalid — ignore
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

// The server bootstrap passes the theme only as a literal inside its script: `echarts.init(__dom, "roma", …)`.
const BOOTSTRAP_THEME = /echarts\.init\(\s*__dom\s*,\s*"([^"]+)"/;
// The bootstrap template itself never writes a background, so this only matches the user's chart code.
const USER_BACKGROUND = /\bbackgroundColor\s*:/;

/**
 * Give the chart node the same per-theme ground the TQL result view paints (ShowVisualization).
 * Light gallery themes (macarons, infographic, roma, shine, westeros…) set no backgroundColor, so
 * their canvas is transparent and the dark markdown surface shows through: white split lines on
 * dark, grey titles and axis labels that disappear. Themes that paint their own background cover
 * this, so it only shows where the theme left the canvas transparent.
 */
const paintThemeGround = (script: HTMLScriptElement, code: string) => {
    const chartNode = script.previousElementSibling as HTMLElement | null;
    if (!chartNode?.classList.contains('chartext-echarts') || chartNode.style.backgroundColor) return;
    // The user's option names its own background (possibly transparent on purpose) — leave the node alone.
    if (USER_BACKGROUND.test(code)) return;
    const theme = BOOTSTRAP_THEME.exec(code)?.[1] as ChartTheme | undefined;
    const ground = theme ? ChartThemeBackgroundColor[theme] : undefined;
    if (ground) chartNode.style.backgroundColor = ground;
};

const executePendingScripts = (root: ChartRoot) => {
    const scripts = root.querySelectorAll<HTMLScriptElement>(
        '.chartext script:not([data-processed])',
    );
    scripts.forEach((script) => {
        const win = window as any;
        const code = script.textContent ?? '';
        paintThemeGround(script, code);
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
    const echarts = getEcharts();
    if (!echarts) return;
    const nodes = (root ?? document).querySelectorAll<HTMLElement>('.chartext-echarts');
    nodes.forEach((node) => {
        const instance = echarts.getInstanceByDom(node);
        if (instance) {
            instance.resize();
        }
    });
};

const setChartext = (root?: ShadowRoot | HTMLElement | null) => {
    // Claim the shared script registry for the echarts runtime BEFORE any bootstrap script runs.
    //
    // This one line is what makes the chartext path correct. `loadEcharts()` appends the tag and
    // registers its promise synchronously, and that promise only resolves after the runtime is
    // confirmed and the "white" theme is registered. The server bootstrap's `__loadScriptOnce()`
    // reads the same registry (`window.__chartextScriptPromises`) and awaits whatever it finds
    // there, so its `echarts.init(dom, "white")` lands after our registration by construction —
    // no reliance on winning a load race, and no second copy of echarts is ever executed.
    // The rejection is swallowed on purpose: if the runtime cannot be fetched the server
    // bootstrap reports it in the chart node itself ("ECharts load error: …"), and leaving this
    // promise unhandled would additionally surface as an unhandledrejection on every render.
    void loadEcharts().catch(() => undefined);

    const target = root ?? document;

    const pendingScripts = target.querySelectorAll<HTMLScriptElement>(
        '.chartext script:not([data-processed])',
    );
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
