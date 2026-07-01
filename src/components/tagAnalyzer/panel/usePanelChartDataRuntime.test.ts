jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
        warning: jest.fn(),
    },
}));

import { Toast } from '@/design-system/components';
import { TimeUnit } from '../domain/time/TimeTypes';
import type { FetchPanelSeriesRowsResult, PanelSeriesFetchResult } from '../fetch/panelData/PanelDataFetchTypes';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import {
    resolvePanelDisplayNotice,
    resolvePanelFetchPlan,
    showSeriesAvailabilityToast,
} from './usePanelChartDataRuntime';

function createRange(startTime: number, endTime: number) {
    return { startTime, endTime };
}

const loadConfig = {
    seriesList: [],
    queryLimit: 100,
    intervalType: undefined,
    isRaw: false,
    useOrderBy: true,
    xAxis: {
        showTickline: false,
        rawDataPixelsPerTick: 0,
        calculatedDataPixelsPerTick: 0,
        calculatedNavigatorPixelsPerTick: 0,
    },
    mainChartSampling: {
        enabled: false,
        sampleCount: 0,
    },
    rawNavigatorSampling: {
        enabled: false,
        sampleCount: 0.01,
    },
};

const requestInterval = {
    IntervalType: TimeUnit.Second,
    IntervalValue: 1,
};

describe('resolvePanelFetchPlan', () => {
    it('reuses main and navigator data when requested ranges are inside cached ranges', () => {
        const fetchPlan = resolvePanelFetchPlan({
            requestPanelRange: createRange(20, 30),
            requestNavigatorRange: createRange(10, 90),
            fullRange: createRange(0, 100),
            loadConfig,
            requestInterval,
            mainReuseKey: 'same-main-config',
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: createRange(0, 100),
                reuseKey: 'same-main-config',
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: createRange(0, 100),
            },
        });

        expect(fetchPlan.main.kind).toBe('reuse');
        expect(fetchPlan.navigator.kind).toBe('reuse');
    });

    it('fetches navigator data when request is outside cache and inside fullRange', () => {
        const fetchPlan = resolvePanelFetchPlan({
            requestPanelRange: createRange(20, 30),
            requestNavigatorRange: createRange(60, 100),
            fullRange: createRange(0, 100),
            loadConfig,
            requestInterval,
            mainReuseKey: 'same-main-config',
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: createRange(0, 100),
                reuseKey: 'same-main-config',
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: createRange(0, 50),
            },
        });

        expect(fetchPlan.navigator.kind).toBe('fetch');
    });

    it('fetches navigator data when request is outside fullRange', () => {
        const fetchPlan = resolvePanelFetchPlan({
            requestPanelRange: createRange(20, 30),
            requestNavigatorRange: createRange(90, 110),
            fullRange: createRange(0, 100),
            loadConfig,
            requestInterval,
            mainReuseKey: 'same-main-config',
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: createRange(0, 100),
                reuseKey: 'same-main-config',
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: createRange(0, 100),
            },
        });

        expect(fetchPlan.navigator).toEqual({
            kind: 'fetch',
            fetchRange: createRange(70, 130),
        });
    });

    it('reuses main data when request is outside fullRange', () => {
        const fetchPlan = resolvePanelFetchPlan({
            requestPanelRange: createRange(90, 110),
            requestNavigatorRange: createRange(0, 100),
            fullRange: createRange(0, 100),
            loadConfig,
            requestInterval,
            mainReuseKey: 'same-main-config',
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: createRange(0, 100),
                reuseKey: 'same-main-config',
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: createRange(0, 100),
            },
        });

        expect(fetchPlan.main.kind).toBe('reuse');
    });

    it('fetches main data when interval or sampling reuse key changes', () => {
        const fetchPlan = resolvePanelFetchPlan({
            requestPanelRange: createRange(20, 30),
            requestNavigatorRange: createRange(0, 100),
            fullRange: createRange(0, 100),
            loadConfig,
            requestInterval,
            mainReuseKey: 'new-main-config',
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: createRange(0, 100),
                reuseKey: 'old-main-config',
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: createRange(0, 100),
            },
        });

        expect(fetchPlan.main.kind).toBe('fetch');
    });
});

function createSeries(key: string): PanelSeriesDefinition {
    return {
        key,
        table: 'tag_table',
        sourceTagName: key,
        alias: key,
        calculationMode: 'max',
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        sourceColumns: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
        },
    };
}

function createSeriesFetchResult(
    key: string,
    errorMessage?: string,
    rows: PanelSeriesFetchResult['fetchResult']['data']['rows'] = [[1000, 1]],
    errorKind: 'request-failed' | 'no-data' = 'request-failed',
): PanelSeriesFetchResult {
    return {
        seriesConfig: createSeries(key),
        fetchResult: {
            data: {
                column: ['TIME', 'VALUE'],
                rows,
            },
        },
        ...(errorMessage
            ? { error: { kind: errorKind, message: errorMessage } }
            : {}),
    };
}
function createFetchResult(
    seriesFetchResults: PanelSeriesFetchResult[],
): FetchPanelSeriesRowsResult {
    return {
        seriesFetchResults,
        interval: requestInterval,
        count: 100,
        isRaw: false,
    };
}

describe('resolvePanelDisplayNotice', () => {
    it('returns a partial notice when some series are unavailable', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1'),
            createSeriesFetchResult('series-2', 'missing table'),
        ]);

        expect(resolvePanelDisplayNotice(result)).toBe('Some series unavailable');
    });

    it('returns Some series unavailable when all series request fail', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1', 'missing table'),
            createSeriesFetchResult('series-2', 'missing table'),
        ]);

        expect(resolvePanelDisplayNotice(result)).toBe('Some series unavailable');
    });

    it('returns No Data when all series are marked as no-data', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1', 'no data', [], 'no-data'),
            createSeriesFetchResult('series-2', 'no data', [], 'no-data'),
        ]);

        expect(resolvePanelDisplayNotice(result)).toBe('No Data');
    });
    it('returns no notice when the selected range has no rows', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1', undefined, []),
            createSeriesFetchResult('series-2', undefined, []),
        ]);

        expect(resolvePanelDisplayNotice(result)).toBeUndefined();
    });

    it('returns no notice when only some loaded series have rows', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1'),
            createSeriesFetchResult('series-2', undefined, []),
        ]);

        expect(resolvePanelDisplayNotice(result)).toBeUndefined();
    });

    it('returns no notice when all series loaded', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1'),
            createSeriesFetchResult('series-2'),
        ]);

        expect(resolvePanelDisplayNotice(result)).toBeUndefined();
    });
});

describe('showSeriesAvailabilityToast', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows an unavailable toast for request-failed series', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1', 'missing table'),
            createSeriesFetchResult('series-2', 'missing table'),
        ]);

        showSeriesAvailabilityToast(result);

        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(Toast.error).toHaveBeenCalledWith('Some series could not be loaded.');
    });

    it('shows no-data toast when all series are marked as no-data', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1', 'no data', [], 'no-data'),
            createSeriesFetchResult('series-2', 'no data', [], 'no-data'),
        ]);

        showSeriesAvailabilityToast(result);

        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(Toast.error).toHaveBeenCalledWith('No series data could be loaded.');
    });

    it('does not show a toast when every series loaded', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1'),
            createSeriesFetchResult('series-2'),
        ]);

        showSeriesAvailabilityToast(result);

        expect(Toast.error).not.toHaveBeenCalled();
    });
    it('does not show a toast for empty successful rows', () => {
        const result = createFetchResult([
            createSeriesFetchResult('series-1', undefined, []),
            createSeriesFetchResult('series-2', undefined, []),
        ]);

        showSeriesAvailabilityToast(result);

        expect(Toast.error).not.toHaveBeenCalled();
    });
});
