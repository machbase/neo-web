import { useEffect, useRef, useState } from 'react';

import type { PanelDataFetchResult } from '../api/seriesDataApi';
import {
    getTimeUnitMilliseconds,
    TimeUnit,
    type IntervalOption,
    type AxisRange,
} from '../range/rangeModel';
import {
    clampRangeToBounds,
    createRangeFromCenterAndWidth,
    getRangeCenter,
    getRangeWidth,
    isRangeWithin,
} from '../range/rangeArithmetic';
import { buildRangeRequestKey } from './requestKey';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../hooks/useLatestAsyncRequest';
import { hasFetchLimitReached } from './panelLoadState';

const NAVIGATOR_QUERY_ROW_LIMIT: number = 1000;
const NAVIGATOR_BUCKET_INTERVAL_LIMIT: number =
    NAVIGATOR_QUERY_ROW_LIMIT - 1;
const MINIMUM_NUMERIC_BUCKET_WIDTH: number = 0.01;
const NAVIGATOR_BAND_OVERLAP_RATIO: number = 0.1;
const NAVIGATOR_FETCH_DEBOUNCE_MS: number = 150;
const NAVIGATOR_CACHE_ENTRY_LIMIT: number = 2;

export function getReusablePanelDataRange(
    result: PanelDataFetchResult,
    queryRange: AxisRange,
    rejectLimitedResult: boolean,
): AxisRange | undefined {
    if (
        result.some(({ error }) => error !== undefined) ||
        (rejectLimitedResult && hasFetchLimitReached(result))
    ) {
        return undefined;
    }

    if (
        result.length === 0 ||
        !result.some(({ metadata }) => metadata?.kind === 'raw')
    ) {
        return queryRange;
    }

    let sStart: number = Number.NEGATIVE_INFINITY;
    let sEnd: number = Number.POSITIVE_INFINITY;
    for (const { data } of result) {
        sStart = Math.max(
            sStart,
            Math.min(queryRange.startTime, data[0]?.[0] ?? queryRange.startTime),
        );
        sEnd = Math.min(
            sEnd,
            Math.max(
                queryRange.endTime,
                data[data.length - 1]?.[0] ?? queryRange.endTime,
            ),
        );
    }

    return { startTime: sStart, endTime: sEnd };
}

const SECOND_MS = getTimeUnitMilliseconds(TimeUnit.Second, 1);
const DAY_MS = getTimeUnitMilliseconds(TimeUnit.Day, 1);

type NavigatorTimeBucket = {
    key: string;
    width: number;
    interval: IntervalOption;
};

const NAVIGATOR_TIME_BUCKETS: NavigatorTimeBucket[] = [
    createTimeBucket('1s', TimeUnit.Second, 1),
    createTimeBucket('10s', TimeUnit.Second, 10),
    createTimeBucket('1m', TimeUnit.Minute, 1),
    createTimeBucket('10m', TimeUnit.Minute, 10),
    createTimeBucket('1h', TimeUnit.Hour, 1),
    createTimeBucket('1d', TimeUnit.Day, 1),
    createTimeBucket('1month', TimeUnit.Day, 30),
];

type NavigatorFetchResolution = {
    key: string;
    bucketWidth: number;
    interval: IntervalOption | undefined;
    coreMinimumWidth: number;
    coreMaximumWidth: number;
    reusableMinimumWidth: number;
    reusableMaximumWidth: number;
};

type NavigatorCacheEntry = {
    baseKey: string;
    resolution: NavigatorFetchResolution;
    reusableRange: AxisRange | undefined;
    result: PanelDataFetchResult;
    rowLimit: number;
};

type NavigatorFetchStore = {
    cache: NavigatorCacheEntry[];
    activeResolutionKey: string | undefined;
    status: 'idle' | 'loading' | 'ready' | 'failed';
    error: string | undefined;
};

type NavigatorSeriesFetchState = {
    result: PanelDataFetchResult | undefined;
    status: NavigatorFetchStore['status'];
    error: string | undefined;
    rowLimit: number | undefined;
};

type NavigatorFetchAction =
    | { kind: 'idle' }
    | { kind: 'reuse' }
    | { kind: 'switch'; entry: NavigatorCacheEntry }
    | {
          kind: 'fetch';
          background: boolean;
          delay: number;
          queryRange: AxisRange;
          resolution: NavigatorFetchResolution;
          rowLimit: number;
      };

type UseNavigatorSeriesFetchParams = {
    canFetch: boolean;
    baseKey: string;
    requestedRange: AxisRange;
    queryRange: AxisRange;
    usesNumericRange: boolean;
    rejectLimitedResult: boolean;
    fetchFn: (
        queryRange: AxisRange,
        resolution: NavigatorFetchResolution,
        rowLimit: number,
        signal: AbortSignal,
    ) => Promise<PanelDataFetchResult | undefined>;
};

const INITIAL_NAVIGATOR_FETCH_STORE: NavigatorFetchStore = {
    cache: [],
    activeResolutionKey: undefined,
    status: 'idle',
    error: undefined,
};

export function useNavigatorSeriesFetch({
    canFetch,
    baseKey,
    requestedRange,
    queryRange,
    usesNumericRange,
    rejectLimitedResult,
    fetchFn,
}: UseNavigatorSeriesFetchParams): NavigatorSeriesFetchState {
    const [store, setStore] = useState<NavigatorFetchStore>(
        INITIAL_NAVIGATOR_FETCH_STORE,
    );
    const requestedWidth: number = getRangeWidth(requestedRange);
    const desiredResolution: NavigatorFetchResolution = usesNumericRange
        ? resolveNumericNavigatorResolution(requestedWidth)
        : resolveDatetimeNavigatorResolution(requestedWidth);
    const activeEntry: NavigatorCacheEntry | undefined = store.cache.find(
        (entry) =>
            entry.baseKey === baseKey &&
            entry.resolution.key === store.activeResolutionKey,
    );
    const desiredCacheEntry: NavigatorCacheEntry | undefined =
        findReusableNavigatorEntry(
            store.cache,
            baseKey,
            desiredResolution.key,
            requestedRange,
        );
    const action: NavigatorFetchAction = resolveNavigatorFetchAction({
        canFetch,
        activeEntry,
        desiredCacheEntry,
        desiredResolution,
        requestedRange,
        requestedWidth,
        queryRange,
    });
    const requestKey: string = buildNavigatorRequestKey(baseKey, action);
    const fetchAction = action.kind === 'fetch' ? action : undefined;
    const actionRef = useRef(action);
    actionRef.current = action;

    useEffect(() => {
        const currentAction = actionRef.current;
        if (!canFetch || currentAction.kind === 'idle') {
            setStore(INITIAL_NAVIGATOR_FETCH_STORE);
        } else if (currentAction.kind === 'reuse') {
            setStore((currentStore) =>
                currentStore.status === 'ready' && !currentStore.error
                    ? currentStore
                    : {
                          ...currentStore,
                          status: 'ready',
                          error: undefined,
                      },
            );
        } else if (currentAction.kind === 'switch') {
            const entry: NavigatorCacheEntry = currentAction.entry;
            setStore((currentStore) => ({
                ...currentStore,
                activeResolutionKey: entry.resolution.key,
                status: 'ready',
                error: undefined,
            }));
        }
    }, [canFetch, requestKey]);

    useLatestAsyncRequest({
        enabled: canFetch && fetchAction !== undefined,
        requestKey,
        delay: fetchAction?.delay,
        fetch: async (signal) => {
            if (!fetchAction) {
                throw new Error('Navigator fetch action is unavailable.');
            }
            const result = await fetchFn(
                fetchAction.queryRange,
                fetchAction.resolution,
                fetchAction.rowLimit,
                signal,
            );
            if (!result) {
                throw new Error('Navigator fetch did not return a result.');
            }

            const reusableRange = getReusablePanelDataRange(
                result,
                fetchAction.queryRange,
                rejectLimitedResult,
            );
            return fetchAction.background && !reusableRange
                ? undefined
                : {
                      baseKey,
                      resolution: fetchAction.resolution,
                      reusableRange,
                      result,
                      rowLimit: fetchAction.rowLimit,
                  };
        },
        onStart: () => {
            if (!fetchAction?.background) {
                setStore((currentStore) => ({
                    ...currentStore,
                    status: 'loading',
                    error: undefined,
                }));
            }
        },
        onSuccess: (entry) => {
            if (!entry || !fetchAction) return;
            setStore((currentStore) => ({
                cache: addNavigatorCacheEntry(
                    currentStore,
                    entry,
                    !fetchAction.background,
                ),
                activeResolutionKey: fetchAction.background
                    ? currentStore.activeResolutionKey
                    : entry.resolution.key,
                status: fetchAction.background
                    ? currentStore.status
                    : 'ready',
                error: undefined,
            }));
        },
        onError: (error) => {
            if (fetchAction?.background) return;
            setStore((currentStore) => ({
                ...currentStore,
                activeResolutionKey: undefined,
                status: 'failed',
                error: getAsyncRequestErrorMessage(
                    error,
                    'Failed to load navigator data.',
                ),
            }));
        },
    });

    return {
        result: activeEntry?.result,
        status: !canFetch
            ? 'idle'
            : activeEntry
              ? store.status
              : store.status === 'failed'
                ? 'failed'
                : 'loading',
        error: store.error,
        rowLimit: activeEntry?.rowLimit,
    };
}

function resolveNumericNavigatorResolution(
    rangeWidth: number,
): NavigatorFetchResolution {
    const safeWidth: number = Number.isFinite(rangeWidth) && rangeWidth > 0
        ? rangeWidth
        : 1;
    const exponent: number = Math.ceil(
        Math.log10(safeWidth / NAVIGATOR_BUCKET_INTERVAL_LIMIT),
    );
    const bucketWidth: number = Math.max(
        MINIMUM_NUMERIC_BUCKET_WIDTH,
        Number((10 ** exponent).toPrecision(12)),
    );

    return createNavigatorResolution(
        `numeric:${bucketWidth}`,
        bucketWidth,
        (bucketWidth / 10) * NAVIGATOR_BUCKET_INTERVAL_LIMIT,
        undefined,
    );
}

function resolveDatetimeNavigatorResolution(
    rangeWidth: number,
): NavigatorFetchResolution {
    const safeWidth: number = Number.isFinite(rangeWidth) && rangeWidth > 0
        ? rangeWidth
        : SECOND_MS;
    const requestedBucketWidth: number =
        safeWidth / NAVIGATOR_BUCKET_INTERVAL_LIMIT;
    const matchedBucketIndex: number = NAVIGATOR_TIME_BUCKETS.findIndex(
        (bucket) => bucket.width >= requestedBucketWidth,
    );
    if (matchedBucketIndex < 0) {
        const intervalValue: number = Math.ceil(
            requestedBucketWidth / DAY_MS,
        );
        const bucket: NavigatorTimeBucket = createTimeBucket(
            `${intervalValue}d`,
            TimeUnit.Day,
            intervalValue,
        );
        const largestConfiguredBucket: NavigatorTimeBucket =
            NAVIGATOR_TIME_BUCKETS[NAVIGATOR_TIME_BUCKETS.length - 1];

        return createNavigatorResolution(
            `datetime:${bucket.key}`,
            bucket.width,
            Math.max(
                largestConfiguredBucket.width,
                bucket.width - DAY_MS,
            ) * NAVIGATOR_BUCKET_INTERVAL_LIMIT,
            bucket.interval,
        );
    }

    const bucket: NavigatorTimeBucket =
        NAVIGATOR_TIME_BUCKETS[matchedBucketIndex];
    const previousBucketWidth: number =
        matchedBucketIndex === 0
            ? 0
            : NAVIGATOR_TIME_BUCKETS[matchedBucketIndex - 1].width;

    return createNavigatorResolution(
        `datetime:${bucket.key}`,
        bucket.width,
        previousBucketWidth * NAVIGATOR_BUCKET_INTERVAL_LIMIT,
        bucket.interval,
    );
}

function createNavigatorResolution(
    key: string,
    bucketWidth: number,
    coreMinimumWidth: number,
    interval: IntervalOption | undefined,
): NavigatorFetchResolution {
    const coreMaximumWidth: number =
        bucketWidth * NAVIGATOR_BUCKET_INTERVAL_LIMIT;

    return {
        key,
        bucketWidth,
        interval,
        coreMinimumWidth,
        coreMaximumWidth,
        reusableMinimumWidth: Math.max(
            0,
            coreMinimumWidth * (1 - NAVIGATOR_BAND_OVERLAP_RATIO),
        ),
        reusableMaximumWidth:
            coreMaximumWidth * (1 + NAVIGATOR_BAND_OVERLAP_RATIO),
    };
}

function createTimeBucket(
    key: string,
    intervalType: TimeUnit.Second | TimeUnit.Minute | TimeUnit.Hour | TimeUnit.Day,
    intervalValue: number,
): NavigatorTimeBucket {
    return {
        key,
        width: getTimeUnitMilliseconds(intervalType, intervalValue),
        interval: {
            IntervalType: intervalType,
            IntervalValue: intervalValue,
        },
    };
}

function resolveNavigatorFetchAction({
    canFetch,
    activeEntry,
    desiredCacheEntry,
    desiredResolution,
    requestedRange,
    requestedWidth,
    queryRange,
}: {
    canFetch: boolean;
    activeEntry: NavigatorCacheEntry | undefined;
    desiredCacheEntry: NavigatorCacheEntry | undefined;
    desiredResolution: NavigatorFetchResolution;
    requestedRange: AxisRange;
    requestedWidth: number;
    queryRange: AxisRange;
}): NavigatorFetchAction {
    if (!canFetch) return { kind: 'idle' };

    if (
        !activeEntry ||
        !activeEntry.reusableRange ||
        !isRangeWithin(
            requestedRange,
            activeEntry.reusableRange,
        )
    ) {
        return desiredCacheEntry
            ? { kind: 'switch', entry: desiredCacheEntry }
            : createNavigatorFetchAction(
                  desiredResolution,
                  requestedRange,
                  queryRange,
                  false,
                  0,
              );
    }

    if (desiredResolution.key === activeEntry.resolution.key) {
        return { kind: 'reuse' };
    }

    if (isWidthWithinCore(requestedWidth, activeEntry.resolution)) {
        return { kind: 'reuse' };
    }

    if (isWidthWithinReusableBand(requestedWidth, activeEntry.resolution)) {
        return desiredCacheEntry
            ? { kind: 'reuse' }
            : createNavigatorFetchAction(
                  desiredResolution,
                  requestedRange,
                  queryRange,
                  true,
                  NAVIGATOR_FETCH_DEBOUNCE_MS,
              );
    }

    return desiredCacheEntry
        ? { kind: 'switch', entry: desiredCacheEntry }
        : createNavigatorFetchAction(
              desiredResolution,
              requestedRange,
              queryRange,
              false,
              NAVIGATOR_FETCH_DEBOUNCE_MS,
          );
}

function createNavigatorFetchAction(
    resolution: NavigatorFetchResolution,
    requestedRange: AxisRange,
    queryRange: AxisRange,
    background: boolean,
    delay: number,
): NavigatorFetchAction {
    const sMaximumQueryWidth =
        resolution.bucketWidth * NAVIGATOR_BUCKET_INTERVAL_LIMIT;
    const sBoundedQueryRange = getRangeWidth(queryRange) <= sMaximumQueryWidth
        ? queryRange
        : clampRangeToBounds(
              createRangeFromCenterAndWidth(
                  getRangeCenter(requestedRange),
                  sMaximumQueryWidth,
              ),
              queryRange,
          );

    return {
        kind: 'fetch',
        background,
        delay,
        queryRange: sBoundedQueryRange,
        resolution,
        rowLimit: NAVIGATOR_QUERY_ROW_LIMIT,
    };
}

function findReusableNavigatorEntry(
    cache: NavigatorCacheEntry[],
    baseKey: string,
    resolutionKey: string,
    requestedRange: AxisRange,
): NavigatorCacheEntry | undefined {
    return cache.find(
        (entry) =>
            entry.baseKey === baseKey &&
            entry.resolution.key === resolutionKey &&
            entry.reusableRange !== undefined &&
            isRangeWithin(requestedRange, entry.reusableRange),
    );
}

function addNavigatorCacheEntry(
    store: NavigatorFetchStore,
    entry: NavigatorCacheEntry,
    activateEntry: boolean,
): NavigatorCacheEntry[] {
    const activeEntry: NavigatorCacheEntry | undefined = store.cache.find(
        (cacheEntry) =>
            cacheEntry.baseKey === entry.baseKey &&
            cacheEntry.resolution.key === store.activeResolutionKey,
    );
    const remainingEntries: NavigatorCacheEntry[] = store.cache.filter(
        (cacheEntry) =>
            cacheEntry.baseKey === entry.baseKey &&
            cacheEntry.resolution.key !== entry.resolution.key &&
            cacheEntry.resolution.key !== activeEntry?.resolution.key,
    );
    const orderedEntries: NavigatorCacheEntry[] =
        !activateEntry && activeEntry &&
        activeEntry.resolution.key !== entry.resolution.key
            ? [activeEntry, entry, ...remainingEntries]
            : [entry, ...remainingEntries];

    return orderedEntries.slice(0, NAVIGATOR_CACHE_ENTRY_LIMIT);
}

function isWidthWithinCore(
    width: number,
    resolution: NavigatorFetchResolution,
): boolean {
    return width >= resolution.coreMinimumWidth &&
        width <= resolution.coreMaximumWidth;
}

function isWidthWithinReusableBand(
    width: number,
    resolution: NavigatorFetchResolution,
): boolean {
    return width >= resolution.reusableMinimumWidth &&
        width <= resolution.reusableMaximumWidth;
}

function buildNavigatorRequestKey(
    baseKey: string,
    action: NavigatorFetchAction,
): string {
    if (action.kind === 'fetch') {
        return buildRangeRequestKey(baseKey, action.queryRange, {
            action: action.kind,
            background: action.background,
            resolution: action.resolution.key,
        });
    }

    if (action.kind === 'switch') {
        return `${baseKey}:switch:${action.entry.resolution.key}`;
    }

    return `${baseKey}:${action.kind}`;
}
