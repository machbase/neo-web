import { useMemo, useState } from 'react';
import {
    seriesDataApi,
    type PanelDataFetchResult,
    type PanelSeriesRowsRequest,
} from '../../api/seriesDataApi';
import {
    mapFetchResultToChartData,
    type ChartSeriesData,
} from '../../chart/chartData';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../../hooks/useLatestAsyncRequest';
import {
    getIntervalMs,
    type IntervalOption,
} from '../../range/intervalResolver';
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
import { buildMainSeriesRequest } from '../series/panelSeriesRequest';

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

type PanelDataState =
    | { kind: 'invalid'; reason: 'emptySeries' | 'mixedAxisKinds' }
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
    cacheKey: string;
    key: string;
    pixelWidth: number;
    queryRange: AxisRange;
    request: PanelSeriesRowsRequest;
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
const RESOLUTION_REUSE_RATIO = 1.25;

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

    if (seriesList.length === 0) {
        return { kind: 'invalid', reason: 'emptySeries' };
    }
    if (axisKind === undefined) {
        return { kind: 'invalid', reason: 'mixedAxisKinds' };
    }

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
        requestKey: plan?.key ?? `${target}:idle`,
        delay: target === 'navigator' ? NAVIGATOR_DEBOUNCE_MS : undefined,
        fetch: (signal) =>
            plan
                ? seriesDataApi.fetchSeriesRows(
                      attachSignal(plan.request, signal),
                  )
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
    return record.plan?.key === plan?.key
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
        const request = buildMainSeriesRequest(
            target === 'main' ? panelInfo : createNavigatorPanelInfo(panelInfo),
            queryRange,
            chartWidth,
            rollupTables,
        );
        return {
            plan: {
                ...createRequestKeys(target, request, refreshVersion),
                pixelWidth: chartWidth,
                queryRange,
                request,
                requestedRange,
                resolution: resolveResolution(request, axisKind),
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

function createNavigatorPanelInfo(panelInfo: PanelQueryInfo): PanelQueryInfo {
    const useRawSampling =
        panelInfo.mode.isRaw && panelInfo.display.rawNavigatorSampling.enabled;

    return {
        query: panelInfo.query,
        mode: { ...panelInfo.mode, isRaw: useRawSampling },
        display: {
            ...panelInfo.display,
            pixelsPerTick: {
                ...panelInfo.display.pixelsPerTick,
                calculated: panelInfo.display.pixelsPerTick.calculatedNavigator,
            },
            mainChartSampling: panelInfo.display.rawNavigatorSampling,
        },
    };
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
        cachedPlan.cacheKey !== requestedPlan.cacheKey ||
        !isRangeWithin(requestedPlan.requestedRange, cachedPlan.queryRange) ||
        !canReuseResolution(cachedPlan.resolution, requestedPlan.resolution)
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

function canReuseResolution(
    cached: PanelQueryResolution,
    requested: PanelQueryResolution,
): boolean {
    if (cached.kind !== requested.kind) return false;
    if (cached.kind === 'raw') return true;
    if (cached.kind === 'numeric' && requested.kind === 'numeric') {
        return areNearby(cached.bucketWidth, requested.bucketWidth);
    }
    if (cached.kind !== 'time' || requested.kind !== 'time') return false;

    const cachedMs = getIntervalMs(
        cached.interval.IntervalType,
        cached.interval.IntervalValue,
    );
    const requestedMs = getIntervalMs(
        requested.interval.IntervalType,
        requested.interval.IntervalValue,
    );
    return cachedMs > 0 && requestedMs > 0
        ? areNearby(cachedMs, requestedMs)
        : cached.interval.IntervalType === requested.interval.IntervalType &&
              cached.interval.IntervalValue === requested.interval.IntervalValue;
}

function areNearby(left: number, right: number): boolean {
    return (
        Number.isFinite(left) &&
        Number.isFinite(right) &&
        left > 0 &&
        right > 0 &&
        Math.max(left, right) / Math.min(left, right) <= RESOLUTION_REUSE_RATIO
    );
}

function createRequestKeys(
    target: PanelDataTarget,
    request: PanelSeriesRowsRequest,
    refreshVersion: number,
): Pick<PanelRequestPlan, 'cacheKey' | 'key'> {
    const [seriesList, range] = request.args;
    const includeCalculation = request.kind === 'calculated';
    const seriesKey = seriesList.map((series) => ({
        key: series.key,
        table: series.table,
        sourceTagName: series.sourceTagName,
        sourceColumns: series.sourceColumns,
        ...(includeCalculation
            ? {
                  calculationMode: series.calculationMode,
                  useRollupTable: series.useRollupTable,
              }
            : {}),
    }));
    const [cacheOptions, resolutionOptions]: [unknown, unknown] =
        request.kind === 'raw'
            ? [{ useOrderBy: request.args[2] }, undefined]
            : request.kind === 'sampled-raw'
              ? [
                    {
                        sampleCount: request.args[2],
                        useOrderBy: request.args[3],
                    },
                    undefined,
                ]
              : [
                    { rollupTables: request.args[4] },
                    {
                        interval: request.args[2],
                        rowLimit: request.args[3],
                        numericBucketWidth: request.args[5]?.numericBucketWidth,
                    },
                ];
    const cacheKey = JSON.stringify([
        target,
        refreshVersion,
        request.kind,
        seriesKey,
        cacheOptions,
    ]);

    return {
        cacheKey,
        key: JSON.stringify([cacheKey, range, resolutionOptions]),
    };
}

function resolveResolution(
    request: PanelSeriesRowsRequest,
    axisKind: AxisKind,
): PanelQueryResolution {
    if (request.kind !== 'calculated') return { kind: 'raw' };
    if (axisKind === 'time') {
        return { kind: 'time', interval: request.args[2] };
    }

    const bucketWidth = request.args[5]?.numericBucketWidth;
    return bucketWidth === undefined
        ? { kind: 'unresolved' }
        : { kind: 'numeric', bucketWidth };
}

function attachSignal(
    request: PanelSeriesRowsRequest,
    signal: AbortSignal,
): PanelSeriesRowsRequest {
    if (request.kind === 'raw') {
        const [seriesList, range, useOrderBy] = request.args;
        return { kind: 'raw', args: [seriesList, range, useOrderBy, signal] };
    }
    if (request.kind === 'sampled-raw') {
        const [seriesList, range, sampleCount, useOrderBy] = request.args;
        return {
            kind: 'sampled-raw',
            args: [seriesList, range, sampleCount, useOrderBy, signal],
        };
    }

    const [seriesList, range, interval, rowLimit, rollupTables, options] =
        request.args;
    return {
        kind: 'calculated',
        args: [
            seriesList,
            range,
            interval,
            rowLimit,
            rollupTables,
            { ...options, signal },
        ],
    };
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
