import type { HostPanelState, HostRangePolicy, RegisteredHostOverlay } from './hostTypes';

export function chartRangePolicy(state: HostPanelState | undefined, distance: boolean): HostRangePolicy | undefined {
    return distance ? state?.rangePolicies.distance : state?.rangePolicies.time;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Host-owned layers never replace a native chart's graphic/series options. */
export function attachChartOverlays(root: HTMLElement, getOverlays: () => RegisteredHostOverlay[]) {
    let disposed = false;
    let chart: any;
    let chartDom: HTMLElement | undefined;
    let svg: SVGSVGElement | undefined;
    let signature = '';
    let originalPosition: string | undefined;
    const events = ['rendered', 'finished', 'datazoom', 'restore'];
    const removeLayer = () => {
        svg?.remove(); svg = undefined; signature = '';
        if (originalPosition !== undefined && chartDom?.style.position === 'relative') chartDom.style.position = originalPosition;
        originalPosition = undefined;
    };
    const draw = () => {
        if (disposed || !chart || !chartDom || chart.isDisposed?.()) return;
        try {
            const rect = chart.getModel()?.getComponent('grid')?.coordinateSystem?.getRect();
            if (!rect) { removeLayer(); return; }
            const shapes = getOverlays().flatMap((overlay) => {
                const toPixel = (value: string | number | undefined) => value === undefined ? NaN
                    : Number(chart.convertToPixel(overlay.axis === 'x' ? { xAxisIndex: 0 } : { yAxisIndex: 0 }, value));
                const start = toPixel(overlay.kind === 'line' ? overlay.value : overlay.start);
                const end = overlay.kind === 'line' ? start : toPixel(overlay.end);
                if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
                const lower = overlay.axis === 'x' ? rect.x : rect.y;
                const upper = lower + (overlay.axis === 'x' ? rect.width : rect.height);
                if (Math.max(start, end) < lower || Math.min(start, end) > upper) return [];
                return [{ overlay, start: Math.max(lower, Math.min(upper, start)), end: Math.max(lower, Math.min(upper, end)) }];
            });
            const next = JSON.stringify([rect, chart.getWidth(), chart.getHeight(), shapes]);
            if (svg?.isConnected && signature === next) return;
            signature = next;
            if (!svg?.isConnected) {
                if (!window.getComputedStyle(chartDom).position || window.getComputedStyle(chartDom).position === 'static') {
                    originalPosition = chartDom.style.position;
                    chartDom.style.position = 'relative';
                }
                svg = document.createElementNS(SVG_NS, 'svg');
                svg.dataset.neoHostOverlay = 'true';
                Object.assign(svg.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '10' });
                chartDom.appendChild(svg);
            }
            svg.setAttribute('width', String(chart.getWidth()));
            svg.setAttribute('height', String(chart.getHeight()));
            svg.replaceChildren(...shapes.map(({ overlay, start, end }) => {
                const shape = document.createElementNS(SVG_NS, overlay.kind === 'line' ? 'line' : 'rect');
                shape.dataset.owner = overlay.ownerId;
                shape.dataset.overlay = overlay.id;
                const x = overlay.axis === 'x';
                const attributes = overlay.kind === 'line'
                    ? { x1: x ? start : rect.x, x2: x ? start : rect.x + rect.width,
                        y1: x ? rect.y : start, y2: x ? rect.y + rect.height : start,
                        stroke: overlay.color ?? '#009CE0', 'stroke-width': overlay.width ?? 1, 'stroke-dasharray': '5 5' }
                    : { x: x ? Math.min(start, end) : rect.x, y: x ? rect.y : Math.min(start, end),
                        width: x ? Math.abs(end - start) : rect.width, height: x ? rect.height : Math.abs(end - start),
                        fill: overlay.color ?? '#009CE0', 'fill-opacity': 0.2 };
                Object.entries(attributes).forEach(([key, value]) => shape.setAttribute(key, String(value)));
                return shape;
            }));
        } catch { /* A chart may be between dispose and init; the next render retries. */ }
    };
    const sync = () => {
        if (disposed) return;
        const api = typeof echarts === 'undefined' ? undefined : echarts as any;
        let found: any;
        let dom: HTMLElement | undefined;
        for (const element of [root, ...Array.from(root.querySelectorAll<HTMLElement>('div,canvas'))]) {
            try { found = api?.getInstanceByDom?.(element); } catch { found = undefined; }
            if (found && !found.isDisposed?.()) { dom = element; break; }
        }
        if (found !== chart) {
            events.forEach((event) => chart?.off?.(event, draw));
            removeLayer();
            chart = found;
            chartDom = dom;
            events.forEach((event) => chart?.on?.(event, draw));
        }
        draw();
    };
    const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver((records) => {
        if (records.some(({ target }) => target !== svg && !svg?.contains(target))) sync();
    });
    observer?.observe(root, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(sync);
    resize?.observe(root);
    window.addEventListener('resize', sync);
    sync();
    return () => {
        disposed = true;
        observer?.disconnect();
        resize?.disconnect();
        window.removeEventListener('resize', sync);
        events.forEach((event) => chart?.off?.(event, draw));
        removeLayer();
    };
}
