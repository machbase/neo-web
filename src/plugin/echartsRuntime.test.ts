/**
 * Runtime-loader invariants. Each test here stands for a way the two-copies bug (#1439) comes
 * back, so they assert mechanism rather than surface behaviour.
 */
import {
    ECHARTS_SRC,
    __setEchartsRuntimeForTest,
    getEcharts,
    loadChartAssets,
    loadEcharts,
} from './echartsRuntime';

type ScriptTag = HTMLScriptElement;

const scriptsFor = (src: string): ScriptTag[] =>
    Array.from(document.querySelectorAll<ScriptTag>('script')).filter((aNode) => aNode.src.endsWith(src));

/** jsdom never fetches, so drive the tag's lifecycle by hand. */
const settleScript = (src: string, outcome: 'load' | 'error', install?: unknown) => {
    const sTags = scriptsFor(src);
    const sTag = sTags[sTags.length - 1];
    if (!sTag) throw new Error(`no <script> was appended for ${src}`);
    if (outcome === 'load') {
        if (install !== undefined) (window as any).echarts = install;
        sTag.onload?.(new Event('load'));
    } else {
        sTag.onerror?.(new Event('error'));
    }
};

/** Sequential loads resume a microtask at a time, so poll rather than guess how many ticks. */
const settleWhenAppended = async (src: string, outcome: 'load' | 'error' = 'load') => {
    for (let i = 0; i < 50; i += 1) {
        if (scriptsFor(src).length) {
            settleScript(src, outcome);
            return;
        }
        await Promise.resolve();
    }
    throw new Error(`no <script> was appended for ${src}`);
};

const registerTheme = jest.fn();
const fakeRuntime = () => ({ registerTheme, getInstanceByDom: jest.fn(), init: jest.fn() });

beforeEach(() => {
    registerTheme.mockClear();
    document.head.innerHTML = '';
    delete (window as any).__chartextScriptPromises;
    __setEchartsRuntimeForTest(undefined);
    delete (window as any).echarts;
});

describe('runtime is executed at most once', () => {
    it('ten concurrent callers append a single <script>', async () => {
        const sCalls = Array.from({ length: 10 }, () => loadEcharts());
        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(1);

        settleScript(ECHARTS_SRC, 'load', fakeRuntime());
        await Promise.all(sCalls);

        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(1);
    });

    it('a URL the chartext bootstrap already claimed is never re-appended', async () => {
        // The server bootstrap registers its in-flight promise under the same key. Re-running the
        // echarts UMD would replace window.echarts wholesale and orphan every existing instance.
        (window as any).__chartextScriptPromises = { [ECHARTS_SRC]: Promise.resolve() };

        await loadChartAssets([ECHARTS_SRC], []);

        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(0);
    });
});

describe('registry is claimed synchronously', () => {
    it('loadEcharts fills the shared registry before it returns', () => {
        void loadEcharts().catch(() => undefined);
        // No await in between — this is what lets setChartext() claim the slot before it runs the
        // bootstrap scripts further down the same function.
        expect((window as any).__chartextScriptPromises[ECHARTS_SRC]).toBeDefined();
    });
});

describe('dependent assets wait for the runtime', () => {
    it('a theme is appended only after window.echarts exists', async () => {
        const sThemeUrl = '/web/echarts/themes/purple-passion.js';
        const sDone = loadChartAssets([ECHARTS_SRC, sThemeUrl], []);

        // A theme UMD captures window.echarts at execution time and gives up silently when it is
        // missing, so it must not be in the document yet.
        expect(scriptsFor(sThemeUrl)).toHaveLength(0);

        settleScript(ECHARTS_SRC, 'load', fakeRuntime());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(getEcharts()).toBeDefined();
        expect(scriptsFor(sThemeUrl)).toHaveLength(1);

        settleScript(sThemeUrl, 'load');
        await sDone;
    });
});

describe('failures are not cached', () => {
    it('a second call retries after a failed load', async () => {
        const sFirst = loadEcharts();
        settleScript(ECHARTS_SRC, 'error');
        await expect(sFirst).rejects.toThrow(/failed to load script/);

        expect((window as any).__chartextScriptPromises[ECHARTS_SRC]).toBeUndefined();

        const sSecond = loadEcharts();
        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(2);
        settleScript(ECHARTS_SRC, 'load', fakeRuntime());
        await expect(sSecond).resolves.toBeDefined();
    });

    it('a load that leaves no global rejects with the reason named', async () => {
        const sCall = loadEcharts();
        settleScript(ECHARTS_SRC, 'load'); // no runtime installed — the AMD-loader case
        await expect(sCall).rejects.toThrow(/window.echarts is undefined/);
    });
});

describe('white theme', () => {
    it('is registered exactly once when the runtime lands', async () => {
        const sCall = loadEcharts();
        settleScript(ECHARTS_SRC, 'load', fakeRuntime());
        await sCall;
        await loadEcharts();

        expect(registerTheme).toHaveBeenCalledTimes(1);
        expect(registerTheme).toHaveBeenCalledWith('white', { backgroundColor: '#ffffff' });
    });

    it('is registered even when something else installed the runtime first', async () => {
        // chartext's `loader: "auto"` CDN fallback can win the install. The server ships no
        // themes/white.js, so without this the bootstrap's init(dom, "white") paints transparent.
        (window as any).echarts = fakeRuntime();

        await loadEcharts();

        expect(registerTheme).toHaveBeenCalledWith('white', { backgroundColor: '#ffffff' });
    });
});

describe('the runtime is fetched only when the payload needs it', () => {
    it('a geomap payload does not pull echarts', async () => {
        // GEOMAP() ships leaflet and proj4 and never calls echarts. Waiting on a 1 MB runtime here
        // would undo the reason there is no boot preload.
        const sDone = loadChartAssets(['/web/geomap/leaflet.js', '/web/geomap/proj4.js'], []);

        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(0);

        await settleWhenAppended('/web/geomap/leaflet.js');
        await settleWhenAppended('/web/geomap/proj4.js');
        await sDone;

        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(0);
    });

    it('a chart payload still pulls it', () => {
        void loadChartAssets([ECHARTS_SRC, '/web/echarts/themes/dark.js'], []);
        expect(scriptsFor(ECHARTS_SRC)).toHaveLength(1);
    });
});

describe('jsCodeAssets are not de-duplicated', () => {
    it('the same code URL runs on every pass', async () => {
        (window as any).echarts = fakeRuntime();
        const sCodeUrl = '/web/api/tql-assets/chart-1.js';

        const sFirst = loadChartAssets([], [sCodeUrl]);
        await Promise.resolve();
        settleScript(sCodeUrl, 'load');
        await sFirst;

        const sSecond = loadChartAssets([], [sCodeUrl]);
        await Promise.resolve();
        settleScript(sCodeUrl, 'load');
        await sSecond;

        // Each pass re-appends; the previous one-shot tag is cleaned up rather than accumulated.
        expect((window as any).__chartextScriptPromises[sCodeUrl]).toBeUndefined();
        expect(scriptsFor(sCodeUrl)).toHaveLength(1);
    });
});
