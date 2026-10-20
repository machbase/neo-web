import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { EChartsType } from 'echarts';
import { useEcharts, type EChartsRuntime } from '@/plugin/echartsRuntime';

type EChartsInitOpts = Parameters<EChartsRuntime['init']>[2];
type EChartEventHandler = (...args: never[]) => void;

export type EChartProps = {
    option: unknown;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    onEvents?: Record<string, EChartEventHandler>;
    onChartReady?: (chart: EChartsType) => void;
    /** Read once, when the instance is created. Changing it afterwards does nothing. */
    opts?: EChartsInitOpts;
    style?: CSSProperties;
    className?: string;
    /** Forwarded to the host element. JSX accepts any data-* prop on a component without a type error, so it must be listed to reach the DOM. */
    'data-testid'?: string;
};

/**
 * React binding for the app's single ECharts runtime.
 *
 * This replaces `echarts-for-react`. Two reasons it is worth owning:
 *
 * 1. That package declares `echarts` as a peer dependency, so npm installs the library into
 *    production even though the runtime actually comes from /web/echarts/echarts.min.js and the
 *    bundle contains no copy of it. Dropping the package is what makes `echarts` genuinely
 *    build-time only.
 * 2. Its update path disposes and recreates the whole chart whenever the `onEvents` object is not
 *    deeply equal to the previous one (`lib/core.js` componentDidUpdate). Handlers are closures, so
 *    a caller that builds its handler map during render — which is what useChartInteraction does —
 *    hands it a new object every time. Here the handlers live behind a ref and are bound once, so a
 *    re-render costs nothing and the instance the caller captured in onChartReady stays valid.
 *
 * Deliberately not supported, because nothing here needs it: changing `theme`/`opts` after mount,
 * `showLoading`, `replaceMerge`.
 */
export function EChart({
    option,
    notMerge,
    lazyUpdate,
    onEvents,
    onChartReady,
    opts,
    style,
    className,
    'data-testid': testId,
}: EChartProps) {
    const { echarts } = useEcharts();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [chart, setChart] = useState<EChartsType | null>(null);

    // Latest-value refs: these must not re-create the instance or re-bind listeners. Written in a
    // layout effect rather than during render — a render React throws away must not leave a
    // mutation behind. Same shape as the repo's useStableCallback.
    const optsRef = useRef(opts);
    const onEventsRef = useRef(onEvents);
    const onChartReadyRef = useRef(onChartReady);
    useLayoutEffect(() => {
        onEventsRef.current = onEvents;
        onChartReadyRef.current = onChartReady;
    });

    // Create and tear down the instance, and keep it sized to its container.
    useEffect(() => {
        const sHost = hostRef.current;
        if (!sHost || !echarts) return undefined;

        let sDisposed = false;
        let sInstance: EChartsType | null = null;

        const create = () => {
            if (sDisposed || sInstance) return;
            // ECharts warns and renders nothing when the container has no size yet — a panel on a
            // hidden tab, or a modal mid-open. Wait for the observer to report a real one instead.
            if (!sHost.clientWidth || !sHost.clientHeight) return;
            sInstance = echarts.init(sHost, undefined, optsRef.current);
            setChart(sInstance);
        };

        create();

        // echarts-for-react used `size-sensor` for this. A ResizeObserver is the platform version
        // of the same thing, and the tag analyzer relies on it entirely: it never calls resize().
        const sObserver =
            typeof ResizeObserver === 'undefined'
                ? undefined
                : new ResizeObserver(() => {
                      if (!sInstance) {
                          create();
                          return;
                      }
                      sInstance.resize();
                  });
        sObserver?.observe(sHost);

        const sOnWindowResize = () => sInstance?.resize();
        if (!sObserver) window.addEventListener('resize', sOnWindowResize);

        return () => {
            sDisposed = true;
            sObserver?.disconnect();
            if (!sObserver) window.removeEventListener('resize', sOnWindowResize);
            sInstance?.dispose();
            sInstance = null;
            setChart(null);
        };
    }, [echarts]);

    // Write the option. Runs again whenever the caller hands over a new one.
    useEffect(() => {
        if (!chart) return;
        chart.setOption(option as never, { notMerge, lazyUpdate });
    }, [chart, option, notMerge, lazyUpdate]);

    // Bind once per instance and per set of event names. The handler itself is read from the ref at
    // dispatch time, so re-renders never re-bind and never recreate the chart.
    const sEventNames = Object.keys(onEvents ?? {}).sort().join('|');
    useEffect(() => {
        if (!chart || !sEventNames) return undefined;
        const sNames = sEventNames.split('|');
        const sBound = sNames.map((aName) => {
            const handler = (...args: never[]) => onEventsRef.current?.[aName]?.(...args);
            chart.on(aName, handler as never);
            return { name: aName, handler };
        });
        return () => {
            sBound.forEach(({ name, handler }) => {
                try {
                    chart.off(name, handler as never);
                } catch {
                    // already disposed — nothing to detach from
                }
            });
        };
    }, [chart, sEventNames]);

    // After the option is written and the events are bound, hand the instance to the caller. The
    // tag analyzer captures it here and drives the chart imperatively from then on.
    useEffect(() => {
        if (!chart) return;
        onChartReadyRef.current?.(chart);
    }, [chart]);

    if (!echarts) return null;
    return <div ref={hostRef} className={className} style={style} data-testid={testId} />;
}

export default EChart;
