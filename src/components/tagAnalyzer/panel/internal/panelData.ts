import type { RangeState, ResolvedRangeState } from '../rangeControl/rangeControlModel';
import { useMemo, useState } from 'react';
import {
    seriesDataApi,
    type PanelDataFetchResult,
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
    fitRangeWithinBounds,
    isRangeWithin,
} from '../../rangeExpression/rangeArithmetic';
import type {
    AxisRange,
} from '../../rangeExpression/rangeModel';
import { enforceNavigatorTrackWidth } from '../rangeControl/rangeTransitions';
import {
    getSeriesListAxisKind,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import type { RollupTableMap } from '../../api/rollupMetadata';
import type { PanelInfo } from '../panelModel';
import {
    resolvePanelSeriesRequest,
    type PanelQueryResolution,
    type PanelSeriesDataRequest,
} from '../series/panelSeriesRequest';

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

export function usePanelData(params: UsePanelDataParams): PanelDataState {
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
    const main = usePanelDataLane(
        'main',
        requestContext,
        mainRange,
    );
    const mainSeries = useMemo(
        () => mapPanelSeries(main.state.result, seriesList, isRaw),
        [isRaw, main.state.result, seriesList],
    );
    const rawLimitRange = useMemo(
        () =>
            resolveRawRangeConstraint(
                params.rangeState?.range,
                params.navigatorTrackWidth,
                isRaw,
                main.state.result,
            ),
        [params.navigatorTrackWidth, isRaw, main.state.result, params.rangeState?.range],
    );
    const renderRange = rawLimitRange ?? params.rangeState?.range;
    const navigator = usePanelDataLane(
        'navigator',
        requestContext,
        renderRange?.navigatorRange,
    );
    const navigatorSeries = useMemo(
        () => mapPanelSeries(navigator.state.result, seriesList, isRaw),
        [isRaw, navigator.state.result, seriesList],
    );
    const hasRequestGeometry =
        params.rangeState !== undefined && chartWidth !== undefined;
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

// -------------------- Local --------------------

type PanelDataTarget = 'main' | 'navigator';

type PanelQueryInfo = Pick<PanelInfo, 'query' | 'mode' | 'display'>;

type UsePanelDataParams = {
    panelInfo: PanelQueryInfo;
    isActive: boolean;
    rangeState: ResolvedRangeState | undefined;
    chartAreaWidth: number | undefined;
    navigatorTrackWidth: number | undefined;
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

const NAVIGATOR_DEBOUNCE_MS = 100;

function usePanelDataLane(
    target: PanelDataTarget,
    context: UsePanelDataParams | undefined,
    visibleRange: AxisRange | undefined,
): PanelDataLane {
    const [retained, setRetained] = useState<RetainedPanelRequest>({});
    const input = resolvePanelDataRequest(context, target, visibleRange);
    const requested = input && !('error' in input) ? input : undefined;
    const request = selectPanelRequest(target, requested, retained);
    const retain = (outcome?: PanelRequestOutcome) => {
        if (request) setRetained({ request, outcome });
    };

    useLatestAsyncRequest({
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
    });
    return {
        request,
        state: resolvePanelRequestState(input, request, retained),
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
    navigatorTrackWidth: number | undefined,
    isRaw: boolean,
    result: PanelDataFetchResult | undefined,
): RangeState | undefined {
    if (!requestedRange || !isRaw || navigatorTrackWidth === undefined) {
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
        navigatorTrackWidth,
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

function hasVisiblePoints(series: ChartSeriesData[], range: AxisRange): boolean {
    return series.some(({ data }) =>
        data.some(([timestamp]) => timestamp >= range.start && timestamp <= range.end),
    );
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
    if (!hasVisiblePoints(mainSeries, mainRange)) {
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
                !hasVisiblePoints(navigatorSeries, navigatorRange) ||
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
