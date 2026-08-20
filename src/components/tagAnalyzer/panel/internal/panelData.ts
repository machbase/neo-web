import { useMemo, useState } from 'react';
import {
    seriesDataApi,
    type PanelDataFetchResult,
} from '../../api/seriesDataApi';
import {
    filterChartDataByRange,
    mapFetchResultToChartData,
    type ChartSeriesData,
} from '../../chart/chartData';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../../hooks/useLatestAsyncRequest';
import {
    fitRangeWithinBounds,
    isRangeWithin,
} from '../../range/rangeArithmetic';
import type {
    AxisRange,
    RangeState,
    ResolvedRangeState,
} from '../../range/rangeModel';
import { enforceNavigatorTrackWidth } from '../../range/rangeResolver';
import { getNavigatorTrackWidth } from '../../chart/chartGeometry';
import {
    getSeriesListAxisKind,
    type PanelSeriesDefinition,
    type RollupTableMap,
} from '../../seriesModel';
import type { PanelInfo } from '../panelModel';
import {
    resolvePanelSeriesRequest,
    type PanelQueryResolution,
    type PanelSeriesDataRequest,
} from '../series/panelSeriesRequest';

type PanelDataTarget = 'main' | 'navigator';

export type PanelIntervalInfo = Exclude<
    PanelQueryResolution,
    { kind: 'raw' }
>;

export type PanelDataIssue =
    | { kind: 'noData' }
    | { kind: 'partialData' }
    | { kind: 'error'; message: string };

export type PanelDataState = {
    main: {
        series: ChartSeriesData[];
        status: PanelRequestState['status'];
        interval: PanelIntervalInfo | undefined;
    };
    navigator: {
        series: ChartSeriesData[];
        status: PanelRequestState['status'];
    };
    rawLimitRange: RangeState | undefined;
    issue: PanelDataIssue | undefined;
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

type PanelRequestOutcome =
    | { result: PanelDataFetchResult | undefined }
    | { error: string };

type RetainedPanelRequest = {
    request?: PanelSeriesDataRequest;
    outcome?: PanelRequestOutcome;
};

type PanelRequestInput =
    | PanelSeriesDataRequest
    | { error: string }
    | undefined;

type PanelDataLane = {
    request?: PanelSeriesDataRequest;
    state: PanelRequestState;
};

type PanelDataStateInput = {
    main: PanelDataLane;
    mainSeries: ChartSeriesData[];
    navigator: PanelDataLane;
    navigatorSeries: ChartSeriesData[];
    renderRange: RangeState | undefined;
    rawLimitRange: RangeState | undefined;
    hasRequestGeometry: boolean;
};

const NAVIGATOR_DEBOUNCE_MS = 100;

export function usePanelData(params: UsePanelDataParams): PanelDataState {
    const [retainedMain, setRetainedMain] = useState<RetainedPanelRequest>({});
    const [retainedNavigator, setRetainedNavigator] =
        useState<RetainedPanelRequest>({});
    const { panelInfo } = params;
    const seriesList = panelInfo.query.tagSet;
    const isRaw = panelInfo.mode.isRaw;
    const axisKind = getSeriesListAxisKind(seriesList);
    const chartWidth = params.chartAreaWidth;
    const mainRange = params.rangeState?.range.mainRange;
    const requestContext: UsePanelDataParams | undefined =
        params.isActive &&
        axisKind !== undefined &&
        chartWidth !== undefined
            ? params
            : undefined;
    const main = resolvePanelDataLane(
        'main',
        requestContext,
        mainRange,
        retainedMain,
    );
    useLatestAsyncRequest(
        createPanelRequestEffect('main', main.request, setRetainedMain),
    );
    const mainSeries = useMemo(
        () => mapPanelSeries(main.state.result, seriesList, isRaw),
        [isRaw, main.state.result, seriesList],
    );
    const rawLimitRange = useMemo(
        () =>
            resolveRawRangeConstraint(
                params.rangeState?.range,
                chartWidth,
                isRaw,
                main.state.result,
            ),
        [chartWidth, isRaw, main.state.result, params.rangeState?.range],
    );
    const renderRange = rawLimitRange ?? params.rangeState?.range;
    const navigator = resolvePanelDataLane(
        'navigator',
        requestContext,
        renderRange?.navigatorRange,
        retainedNavigator,
    );
    useLatestAsyncRequest(
        createPanelRequestEffect(
            'navigator',
            navigator.request,
            setRetainedNavigator,
        ),
    );
    const navigatorSeries = useMemo(
        () => mapPanelSeries(navigator.state.result, seriesList, isRaw),
        [isRaw, navigator.state.result, seriesList],
    );
    const hasRequestGeometry =
        params.rangeState !== undefined && chartWidth !== undefined;
    return createPanelDataState({
        main,
        mainSeries,
        navigator,
        navigatorSeries,
        renderRange,
        rawLimitRange,
        hasRequestGeometry,
    });
}

function createPanelDataState({
    main,
    mainSeries,
    navigator,
    navigatorSeries,
    renderRange,
    rawLimitRange,
    hasRequestGeometry,
}: PanelDataStateInput): PanelDataState {
    return {
        main: {
            series: mainSeries,
            status: hasRequestGeometry ? main.state.status : 'loading',
            interval:
                main.request?.resolution.kind === 'raw'
                    ? undefined
                    : main.request?.resolution,
        },
        navigator: {
            series: navigatorSeries,
            status: hasRequestGeometry ? navigator.state.status : 'loading',
        },
        rawLimitRange,
        issue: resolvePanelDataIssue(
            main.state,
            mainSeries,
            navigator.state,
            navigatorSeries,
            renderRange?.mainRange,
            renderRange?.navigatorRange,
            rawLimitRange !== undefined,
        ),
    };
}

function resolvePanelDataLane(
    target: PanelDataTarget,
    context: UsePanelDataParams | undefined,
    visibleRange: AxisRange | undefined,
    retained: RetainedPanelRequest,
): PanelDataLane {
    const input = resolvePanelDataRequest(context, target, visibleRange);
    const requested = input && !('error' in input) ? input : undefined;
    const request = selectPanelRequest(target, requested, retained);
    return {
        request,
        state: resolvePanelRequestState(input, request, retained),
    };
}

function createPanelRequestEffect(
    target: PanelDataTarget,
    request: PanelSeriesDataRequest | undefined,
    setRetained: (retained: RetainedPanelRequest) => void,
) {
    const retain = (outcome?: PanelRequestOutcome) => {
        if (request) setRetained({ request, outcome });
    };

    return {
        enabled: request !== undefined,
        requestKey: request?.key ?? `${target}:idle`,
        delay: target === 'navigator' ? NAVIGATOR_DEBOUNCE_MS : undefined,
        fetch: (signal: AbortSignal) =>
            seriesDataApi.fetchSeriesRows(request!.fetchQuery, { signal }),
        onStart: () => retain(),
        onSuccess: (result: PanelDataFetchResult | undefined) =>
            retain({ result }),
        onError: (error: unknown) =>
            retain({
                error: getAsyncRequestErrorMessage(
                    error,
                    `Failed to load ${target} panel data.`,
                ),
            }),
    };
}

function resolvePanelRequestState(
    input: PanelRequestInput,
    request: PanelSeriesDataRequest | undefined,
    retained: RetainedPanelRequest,
): PanelRequestState {
    if (!input) return { status: 'idle' };
    if ('error' in input) return { status: 'failed', error: input.error };
    if (retained.request?.key !== request?.key || !retained.outcome) {
        return { status: 'loading' };
    }
    if ('error' in retained.outcome) {
        return { status: 'failed', error: retained.outcome.error };
    }
    const { result } = retained.outcome;
    if (result?.some(({ error }) => error === undefined)) {
        return { status: 'ready', result };
    }
    const messages = new Set(
        result?.flatMap(({ error }) =>
            error?.kind === 'request-failed' ? [error.message] : [],
        ) ?? [],
    );
    return messages.size
        ? { status: 'failed', error: [...messages].join(' ') }
        : { status: 'ready', result };
}

function mapPanelSeries(
    result: PanelDataFetchResult | undefined,
    seriesList: PanelSeriesDefinition[],
    isRaw: boolean,
): ChartSeriesData[] {
    return mapFetchResultToChartData(
        result?.filter(({ error }) => !error),
        seriesList,
        isRaw,
    );
}

function selectPanelRequest(
    target: PanelDataTarget,
    requested: PanelSeriesDataRequest | undefined,
    retained: RetainedPanelRequest,
): PanelSeriesDataRequest | undefined {
    const cached = retained.request;
    if (!requested || !cached) return requested;
    if (
        (target === 'main' && requested.fetchQuery.kind !== 'calculated') ||
        (retained.outcome !== undefined && 'error' in retained.outcome) ||
        cached.familyKey !== requested.familyKey ||
        !isRangeWithin(requested.visibleRange, cached.fetchQuery.range)
    ) {
        return requested;
    }

    const isReusable = retained.outcome === undefined ||
        !retained.outcome.result?.some(
            ({ error, metadata }) =>
                error?.kind === 'request-failed' ||
                metadata?.isLimitReached === true,
        );
    return isReusable ? cached : requested;
}

function resolvePanelDataRequest(
    context: UsePanelDataParams | undefined,
    target: PanelDataTarget,
    visibleRange: AxisRange | undefined,
): PanelSeriesDataRequest | { error: string } | undefined {
    if (!context || !visibleRange || !context.rangeState) return undefined;
    try {
        return resolvePanelSeriesRequest({
            target,
            panelInfo: context.panelInfo,
            rangeState: context.rangeState,
            visibleRange,
            chartWidth: context.chartAreaWidth!,
            rollupTables: context.rollupTables,
            refreshVersion: context.dataRefreshVersion,
        });
    } catch (error) {
        return {
            error: getAsyncRequestErrorMessage(
                error,
                `Invalid ${target} panel data request.`,
            ),
        };
    }
}

function resolveRawRangeConstraint(
    requestedRange: RangeState | undefined,
    chartWidth: number | undefined,
    isRaw: boolean,
    result: PanelDataFetchResult | undefined,
): RangeState | undefined {
    if (!requestedRange || !isRaw || chartWidth === undefined) {
        return undefined;
    }

    const limitedEnd = findRawLimitEnd(result, requestedRange.mainRange);
    if (
        limitedEnd === undefined ||
        limitedEnd <= requestedRange.mainRange.start ||
        limitedEnd >= requestedRange.mainRange.end
    ) {
        return undefined;
    }

    const narrowed = enforceNavigatorTrackWidth(
        {
            mainRange: {
                start: requestedRange.mainRange.start,
                end: limitedEnd,
            },
            navigatorRange: requestedRange.navigatorRange,
        },
        getNavigatorTrackWidth(chartWidth),
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
        const seriesEnd = data[data.length - 1]?.[0];
        if (
            seriesEnd !== undefined &&
            seriesEnd >= requestedRange.start &&
            seriesEnd <= requestedRange.end
        ) {
            limitedEnd = Math.min(limitedEnd ?? seriesEnd, seriesEnd);
        }
    }
    return limitedEnd;
}

function countPoints(series: ChartSeriesData[]): number {
    return series.reduce((count, entry) => count + entry.data.length, 0);
}

function resolvePanelDataIssue(
    main: PanelRequestState,
    mainSeries: ChartSeriesData[],
    navigator: PanelRequestState,
    navigatorSeries: ChartSeriesData[],
    mainRange: AxisRange | undefined,
    navigatorRange: AxisRange | undefined,
    hasHandledRawLimit: boolean,
): PanelDataIssue | undefined {
    if (main.status === 'failed') {
        return { kind: 'error', message: main.error };
    }
    if (main.status !== 'ready' || !mainRange) return undefined;
    if (countPoints(filterChartDataByRange(mainSeries, mainRange)) === 0) {
        return main.result?.some(
            ({ error }) => error?.kind === 'request-failed',
        )
            ? { kind: 'partialData' }
            : { kind: 'noData' };
    }

    return hasPartialResult(main.result, hasHandledRawLimit) ||
        navigator.status === 'failed' ||
        (navigator.status === 'ready' &&
            (!navigatorRange ||
                countPoints(
                    filterChartDataByRange(
                        navigatorSeries,
                        navigatorRange,
                    ),
                ) === 0 ||
                hasPartialResult(navigator.result)))
        ? { kind: 'partialData' }
        : undefined;
}

function hasPartialResult(
    result: PanelDataFetchResult | undefined,
    ignoreHandledRawLimit = false,
): boolean {
    return (
        result?.some(
            ({ error, metadata }) =>
                error !== undefined ||
                (metadata?.isLimitReached === true &&
                    (!ignoreHandledRawLimit || metadata.kind !== 'raw')),
        ) ?? false
    );
}
