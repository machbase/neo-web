import * as echarts from 'echarts';

type ChartRoot = ShadowRoot | HTMLElement | Document;

const ensureEchartsGlobal = () => {
    const win = window as any;
    if (!win.echarts) {
        win.echarts = echarts;
    }
};

const disposeCharts = (root: ChartRoot) => {
    const nodes = root.querySelectorAll<HTMLElement>('.chartext-echarts');
    nodes.forEach((node) => {
        const elem = node as any;
        if (elem.__chartextResizeHandler) {
            window.removeEventListener('resize', elem.__chartextResizeHandler);
            elem.__chartextResizeHandler = null;
        }

        const instance = echarts.getInstanceByDom(node);
        if (instance) {
            instance.dispose();
        }
    });
};

const executePendingScripts = (root: ChartRoot) => {
    const scripts = root.querySelectorAll<HTMLScriptElement>('.chartext script:not([data-processed])');
    scripts.forEach((script) => {
        const win = window as any;
        const code = script.textContent ?? '';
        script.setAttribute('data-processed', 'true');
        try {
            win.__chartextCurrentScript = script;
            // Execute chart bootstrap script after HTML injection even in Shadow DOM.
            new Function(code)();
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
    const target = root ?? document;

    const pendingScripts = target.querySelectorAll<HTMLScriptElement>('.chartext script:not([data-processed])');
    if (pendingScripts.length === 0) {
        return;
    }

    disposeCharts(target);
    executePendingScripts(target);
};

export default setChartext;
