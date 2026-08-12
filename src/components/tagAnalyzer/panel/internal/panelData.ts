import { useMemo, useState } from 'react';
import {
    seriesDataApi,
    type PanelDataFetchResult,
    type SeriesRowsQuery,
} from '../../api/seriesDataApi';
import {
    mapFetchResultToChartData,
    type ChartSeriesData,
} from '../../chart/chartData';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../../hooks/useLatestAsyncRequest';
import type { IntervalOption } from '../../range/intervalResolver';
import {
    fitRangeWithinBounds,
    getRangeWidth,
    isRangeWithin,
} from '../../range/rangeArithmetic';
import type {
    AxisKind,
    AxisRange,
    RangeState,
    ResolvedRangeState,
} from '../../range/rangeModel';
import { enforceChartAreaWidth } from '../../range/rangeResolver';
import {
    getPanelSeriesDisplayName,
    getSeriesListAxisKind,
    type PanelSeriesDefinition,
    type RollupTableMap,
} from '../../seriesModel';
import type { PanelInfo } from '../panelModel';
import {
    buildPanelSeriesQuery,
    createSeriesRowsQueryKeys,
} from '../series/panelSeriesRequest';

type PanelDataTarget = 'main' | 'navigator';
type PanelDataNotice = 'noData' | 'partialData';

type PanelDataLoadState =
    | { status: 'idle' | 'loading' | 'ready' }
    | { status: 'failed'; error: string };

type PanelDataLoadMetric = {
    queriedEntries: number | undefined;
    pointCount: number | undefined;
    pixelWidth: number | undefined;
};

export type PanelDataLoadMetrics = Record<
    PanelDataTarget,
    PanelDataLoadMetric
>;

type PanelSeriesRollupStatus = {
    seriesName: string;
    usesRollup: boolean;
};

export type PanelQueryResolution =
    | { kind: 'unresolved' }
    | { kind: 'raw' }
    | { kind: 'time'; interval: IntervalOption }
    | { kind: 'numeric'; bucketWidth: number };

/**
 * `invalid` covers both an empty series list and series with clashing x-axis
 * kinds — `getSeriesListAxisKind` reports neither as a usable axis. Only saved
 * boards can reach it; the panel editor refuses both while you edit.
 */
type PanelDataState =
    | { kind: 'invalid' }
    | {
          kind: 'queryable';
          series: Record<PanelDataTarget, ChartSeriesData[]>;
          range: { render: RangeState | undefined };
          query: {
              axisKind: AxisKind;
              resolution: PanelQueryResolution;
              seriesRollupStatuses: readonly PanelSeriesRollupStatus[];
              metrics: PanelDataLoadMetrics;
          };
          load: {
              notice: PanelDataNotice | undefined;
              requests: Record<PanelDataTarget, PanelDataLoadState>;
          };
      };

type PanelQueryInfo = Pick<PanelInfo, 'query' | 'mode' | 'display'>;

type UsePanelDataParams = {
    panelInfo: PanelQueryInfo;
    isActive: boolean;
    rangeState: ResolvedRangeState | undefined;
    chartAreaWidth: number | undefined;
    rollupTables: RollupTableMap;
    dataRefreshVersion: number;
};

type PanelRequestState =
    | { status: 'idle' | 'loading'; result?: undefined }
    | { status: 'ready'; result: PanelDataFetchResult | undefined }
    | { status: 'failed'; error: string; result?: undefined };

type PanelRequestPlan = {
    familyKey: string;
    requestKey: string;
    pixelWidth: number;
    query: SeriesRowsQuery;
    queryRange: AxisRange;
    requestedRange: AxisRange;
    resolution: PanelQueryResolution;
};

type PanelRequestPlanResult = {
    plan?: PanelRequestPlan;
    error?: string;
};

/** Inputs shared by the main and navigator request plans of one render. */
type PanelRequestPlanContext = {
    panelInfo: PanelQueryInfo;
    chartWidth: number;
    rollupTables: RollupTableMap;
    refreshVersion: number;
    axisKind: AxisKind;
};

/** Everything one chart target contributes to the panel data state. */
type PanelDataTargetState = {
    request: PanelRequestState;
    series: ChartSeriesData[];
    load: PanelDataLoadState;
    metric: PanelDataLoadMetric;
};

const IDLE_REQUEST: PanelRequestState = { status: 'idle' };
const NAVIGATOR_PREFETCH_RATIO = 0.5;
const NAVIGATOR_DEBOUNCE_MS = 100;

export function usePanelData(params: UsePanelDataParams): PanelDataState {
    const { panelInfo } = params;
    const seriesList = panelInfo.query.tagSet;
    const isRaw = panelInfo.mode.isRaw;
    const axisKind = getSeriesListAxisKind(seriesList);
    const chartWidth = getUsableChartWidth(params.chartAreaWidth);
    const mainRange = params.rangeState?.range.mainRange;
    const planContext: PanelRequestPlanContext | undefined =
        params.isActive && axisKind !== undefined && chartWidth !== undefined
            ? {
                  panelInfo,
                  chartWidth,
                  rollupTables: params.rollupTables,
                  refreshVersion: params.dataRefreshVersion,
                  axisKind,
              }
            : undefined;
    const mainPlan = planContext && mainRange
        ? createRequestPlan(planContext, 'main', mainRange, mainRange)
        : {};
    const main = usePanelDataTarget('main', mainPlan, seriesList, isRaw);
    const renderRange = useMemo(
        () =>
            resolveRenderRange(
                params.rangeState?.range,
                chartWidth,
                isRaw,
                main.request.result,
            ),
        [chartWidth, isRaw, main.request.result, params.rangeState?.range],
    );
    const navigatorPlan = planContext && renderRange && params.rangeState
        ? createRequestPlan(
              planContext,
              'navigator',
              renderRange.navigatorRange,
              createNavigatorQueryRange(
                  renderRange.navigatorRange,
                  params.rangeState.fullRange,
              ),
          )
        : {};
    const navigator = usePanelDataTarget(
        'navigator',
        navigatorPlan,
        seriesList,
        isRaw,
    );
    const seriesRollupStatuses = useMemo(
        () => (isRaw ? [] : createRollupStatuses(main.request.result, seriesList)),
        [isRaw, main.request.result, seriesList],
    );

    if (axisKind === undefined) return { kind: 'invalid' };

    return {
        kind: 'queryable',
        series: { main: main.series, navigator: navigator.series },
        range: { render: renderRange },
        query: {
            axisKind,
            resolution: mainPlan.plan?.resolution ?? { kind: 'unresolved' },
            seriesRollupStatuses,
            metrics: { main: main.metric, navigator: navigator.metric },
        },
        load: {
            notice: resolveNotice(main, navigator),
            requests: { main: main.load, navigator: navigator.load },
        },
    };
}

function getUsableChartWidth(chartWidth: number | undefined): number | undefined {
    return chartWidth !== undefined && Number.isFinite(chartWidth) && chartWidth > 0
        ? chartWidth
        : undefined;
}

function usePanelDataTarget(
    target: PanelDataTarget,
    { plan, error }: PanelRequestPlanResult,
    seriesList: PanelSeriesDefinition[],
    isRaw: boolean,
): PanelDataTargetState {
    const request = usePanelRequest(target, plan);
    const series = useMemo(
        () =>
            mapFetchResultToChartData(
                request.result?.filter((entry) => entry.error === undefined),
                seriesList,
                isRaw,
            ),
        [isRaw, request.result, seriesList],
    );
    const isReady = request.status === 'ready';

    return {
        request,
        series,
        load: error ? { status: 'failed', error } : resolveLoadState(request),
        metric: {
            queriedEntries: isReady ? countQueriedEntries(request.result) : undefined,
            pointCount: isReady ? countPoints(series) : undefined,
            pixelWidth: plan?.pixelWidth,
        },
    };
}

function usePanelRequest(
    target: PanelDataTarget,
    requestedPlan: PanelRequestPlan | undefined,
): PanelRequestState {
    const [record, setRecord] = useState<{
        plan: PanelRequestPlan | undefined;
        state: PanelRequestState;
    }>({ plan: undefined, state: IDLE_REQUEST });
    const plan =
        target === 'navigator' &&
        requestedPlan &&
        record.plan &&
        canReuseNavigatorPlan(record.plan, record.state, requestedPlan)
            ? record.plan
            : requestedPlan;

    useLatestAsyncRequest({
        enabled: plan !== undefined,
        requestKey: plan?.requestKey ?? `${target}:idle`,
        delay: target === 'navigator' ? NAVIGATOR_DEBOUNCE_MS : undefined,
        fetch: (signal) =>
            plan
                ? seriesDataApi.fetchSeriesRows(plan.query, { signal })
                : Promise.resolve(undefined),
        onStart: () => {
            if (plan) setRecord({ plan, state: { status: 'loading' } });
        },
        onSuccess: (result) => {
            if (plan) {
                setRecord({ plan, state: { status: 'ready', result } });
            }
        },
        onError: (error) => {
            if (!plan) return;
            setRecord({
                plan,
                state: {
                    status: 'failed',
                    error: getAsyncRequestErrorMessage(
                        error,
                        `Failed to load ${target} panel data.`,
                    ),
                },
            });
        },
    });

    if (!requestedPlan) return IDLE_REQUEST;
    return record.plan?.requestKey === plan?.requestKey
        ? record.state
        : { status: 'loading' };
}

function createRequestPlan(
    context: PanelRequestPlanContext,
    target: PanelDataTarget,
    requestedRange: AxisRange,
    queryRange: AxisRange,
): PanelRequestPlanResult {
    const { panelInfo, chartWidth, rollupTables, refreshVersion, axisKind } =
        context;
    try {
        const query = buildPanelSeriesQuery(
            target,
            panelInfo,
            queryRange,
            chartWidth,
            rollupTables,
        );
        const { familyKey, exactKey } = createSeriesRowsQueryKeys(query);
        return {
            plan: {
                familyKey: JSON.stringify([
                    target,
                    refreshVersion,
                    familyKey,
                ]),
                requestKey: JSON.stringify([
                    target,
                    refreshVersion,
                    exactKey,
                ]),
                pixelWidth: chartWidth,
                query,
                queryRange,
                requestedRange,
                resolution: resolveResolution(query, axisKind),
            },
        };
    } catch (error) {
        return {
            error: getAsyncRequestErrorMessage(
                error,
                `Invalid ${target} panel data request.`,
            ),
        };
    }
}

function createNavigatorQueryRange(
    visibleRange: AxisRange,
    fullRange: AxisRange,
): AxisRange {
    const padding = getRangeWidth(visibleRange) * NAVIGATOR_PREFETCH_RATIO;
    return fitRangeWithinBounds(
        {
            start: visibleRange.start - padding,
            end: visibleRange.end + padding,
        },
        fullRange,
    );
}

function canReuseNavigatorPlan(
    cachedPlan: PanelRequestPlan,
    cachedState: PanelRequestState,
    requestedPlan: PanelRequestPlan,
): boolean {
    if (
        (cachedState.status !== 'loading' && cachedState.status !== 'ready') ||
        cachedPlan.familyKey !== requestedPlan.familyKey ||
        !isRangeWithin(requestedPlan.requestedRange, cachedPlan.queryRange) ||
        !isSameResolution(cachedPlan.resolution, requestedPlan.resolution)
    ) {
        return false;
    }

    return cachedState.status === 'loading' ||
        !cachedState.result?.some(
            ({ error, metadata }) =>
                error?.kind === 'request-failed' ||
                metadata?.isLimitReached === true,
        );
}

function isSameResolution(
    cached: PanelQueryResolution,
    requested: PanelQueryResolution,
): boolean {
    if (cached.kind !== requested.kind) return false;
    if (cached.kind === 'raw') return true;
    if (cached.kind === 'numeric' && requested.kind === 'numeric') {
        return cached.bucketWidth === requested.bucketWidth;
    }
    if (cached.kind !== 'time' || requested.kind !== 'time') return false;

    return cached.interval.IntervalType === requested.interval.IntervalType &&
        cached.interval.IntervalValue === requested.interval.IntervalValue;
}

function resolveResolution(
    query: SeriesRowsQuery,
    axisKind: AxisKind,
): PanelQueryResolution {
    if (query.kind !== 'calculated') return { kind: 'raw' };
    if (axisKind === 'time') {
        return { kind: 'time', interval: query.interval };
    }

    const bucketWidth = query.numericBucketWidth;
    return bucketWidth === undefined
        ? { kind: 'unresolved' }
        : { kind: 'numeric', bucketWidth };
}

function createRollupStatuses(
    result: PanelDataFetchResult | undefined,
    seriesList: PanelSeriesDefinition[],
): PanelSeriesRollupStatus[] {
    if (!result) return [];
    const resultByKey = new Map(
        result.map((seriesResult) => [seriesResult.seriesKey, seriesResult]),
    );

    return seriesList.flatMap((series) => {
        const seriesResult = resultByKey.get(series.key);
        const metadata = seriesResult?.metadata;
        return !seriesResult?.error && metadata?.kind === 'calculated'
            ? [
                  {
                      seriesName: getPanelSeriesDisplayName(series),
                      usesRollup: metadata.usesRollup,
                  },
              ]
            : [];
    });
}

function resolveRenderRange(
    requestedRange: RangeState | undefined,
    chartWidth: number | undefined,
    isRaw: boolean,
    result: PanelDataFetchResult | undefined,
): RangeState | undefined {
    if (!requestedRange || !isRaw || chartWidth === undefined) {
        return requestedRange;
    }

    const limitedEnd = findRawLimitEnd(result, requestedRange.mainRange);
    if (
        limitedEnd === undefined ||
        limitedEnd <= requestedRange.mainRange.start ||
        limitedEnd >= requestedRange.mainRange.end
    ) {
        return requestedRange;
    }

    const narrowed = enforceChartAreaWidth(
        {
            mainRange: {
                start: requestedRange.mainRange.start,
                end: limitedEnd,
            },
            navigatorRange: requestedRange.navigatorRange,
        },
        chartWidth,
        'main',
    );
    return {
        ...narrowed,
        navigatorRange: fitRangeWithinBounds(
            narrowed.navigatorRange,
            requestedRange.navigatorRange,
        ),
    };
}

/**
 * Earliest end-of-data across the series that hit the raw row limit, so the
 * rendered range never claims to show data the query truncated away.
 */
function findRawLimitEnd(
    result: PanelDataFetchResult | undefined,
    requestedRange: AxisRange,
): number | undefined {
    let limitedEnd: number | undefined;

    for (const { metadata, data } of result ?? []) {
        if (metadata?.kind !== 'raw' || !metadata.isLimitReached) continue;

        const seriesEnd = data.reduce<number | undefined>(
            (latest, [timestamp]) =>
                timestamp >= requestedRange.start &&
                timestamp <= requestedRange.end
                    ? Math.max(latest ?? timestamp, timestamp)
                    : latest,
            undefined,
        );
        if (seriesEnd !== undefined) {
            limitedEnd = Math.min(limitedEnd ?? seriesEnd, seriesEnd);
        }
    }
    return limitedEnd;
}

function resolveLoadState(request: PanelRequestState): PanelDataLoadState {
    if (request.status !== 'ready') return request;
    const failure = getCompleteFailure(request.result);
    return failure ? { status: 'failed', error: failure } : { status: 'ready' };
}

function getCompleteFailure(
    result: PanelDataFetchResult | undefined,
): string | undefined {
    if (result?.some(({ error }) => error === undefined)) return undefined;
    const messages = new Set(
        result?.flatMap(({ error }) =>
            error?.kind === 'request-failed' ? [error.message] : [],
        ) ?? [],
    );
    return messages.size > 0 ? [...messages].join(' ') : undefined;
}

function countQueriedEntries(
    result: PanelDataFetchResult | undefined,
): number {
    return (result ?? []).reduce(
        (count, { data, metadata }) =>
            count + data.length + (metadata?.isLimitReached ? 1 : 0),
        0,
    );
}

function countPoints(series: ChartSeriesData[]): number {
    return series.reduce((count, { data }) => count + data.length, 0);
}

function resolveNotice(
    main: PanelDataTargetState,
    navigator: PanelDataTargetState,
): PanelDataNotice | undefined {
    if (main.load.status !== 'ready') return undefined;
    if (countPoints(main.series) === 0) return 'noData';

    return hasPartialResult(main.request.result) ||
        navigator.load.status === 'failed' ||
        (navigator.load.status === 'ready' &&
            (countPoints(navigator.series) === 0 ||
                hasPartialResult(navigator.request.result)))
        ? 'partialData'
        : undefined;
}

function hasPartialResult(
    result: PanelDataFetchResult | undefined,
): boolean {
    return (
        result?.some(
            ({ error, metadata }) =>
                error !== undefined || metadata?.isLimitReached === true,
        ) ?? false
    );
}
