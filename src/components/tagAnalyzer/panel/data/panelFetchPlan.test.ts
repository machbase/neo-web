import { TimeUnit, type TimeRangeMs } from '../../domain/time/TimeTypes';
import type { PanelChartDataLoadConfig } from './panelChartLoadConfig';
import { resolvePanelFetchPlan } from './panelFetchPlan';

const CALCULATED_REUSE_KEY = JSON.stringify({
    mode: 'calculated',
    intervalType: TimeUnit.Second,
    intervalValue: 1,
});
const CALCULATED_REUSE_KEY_6_SECONDS = JSON.stringify({
    mode: 'calculated',
    intervalType: TimeUnit.Second,
    intervalValue: 6,
});
const NUMERIC_REUSE_KEY = JSON.stringify({
    mode: 'numeric-calculated',
    numericInterval: 1,
});

const LOAD_CONFIG: PanelChartDataLoadConfig = {
    seriesList: [],
    queryLimit: 1000,
    intervalType: undefined,
    isRaw: false,
    useOrderBy: true,
    xAxis: {
        showTickline: false,
        rawDataPixelsPerTick: 1,
        calculatedDataPixelsPerTick: 1,
        calculatedNavigatorPixelsPerTick: 1,
    },
    mainChartSampling: {
        enabled: false,
        sampleCount: 0,
    },
    rawNavigatorSampling: {
        enabled: false,
        sampleCount: 0,
    },
};

const NUMERIC_LOAD_CONFIG: PanelChartDataLoadConfig = {
    ...LOAD_CONFIG,
    seriesList: [
        {
            key: 'SYS.DISTANCE_SENSOR:SENSOR_02',
            table: 'SYS.DISTANCE_SENSOR',
            sourceTagName: 'SENSOR_02',
            alias: 'SENSOR_02',
            calculationMode: 'avg',
            useSecondaryAxis: false,
            id: 'SENSOR_02',
            useRollupTable: false,
            sourceColumns: {
                name: 'NAME',
                time: 'ODOMETER_M',
                value: 'VALUE',
                timeBaseTime: true,
                timeType: 20,
            },
        },
    ],
};

function range(startTime: number, endTime: number): TimeRangeMs {
    return { startTime, endTime };
}

describe('resolvePanelFetchPlan', () => {
    it('fetches newly visible in-bounds main data when the requested range passes the data end', () => {
        const plan = resolvePanelFetchPlan({
            requestPanelRange: range(20, 120),
            requestNavigatorRange: range(20, 120),
            fullRange: range(0, 100),
            loadConfig: LOAD_CONFIG,
            requestInterval: {
                IntervalType: TimeUnit.Second,
                IntervalValue: 1,
            },
            mainReuseKey: CALCULATED_REUSE_KEY,
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: range(40, 100),
                reuseKey: CALCULATED_REUSE_KEY,
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: range(0, 100),
            },
        });

        expect(plan.main).toEqual({
            kind: 'fetch',
            fetchRange: range(20, 100),
        });
    });

    it('reuses main data when the in-bounds portion is already cached', () => {
        const plan = resolvePanelFetchPlan({
            requestPanelRange: range(20, 120),
            requestNavigatorRange: range(20, 120),
            fullRange: range(0, 100),
            loadConfig: LOAD_CONFIG,
            requestInterval: {
                IntervalType: TimeUnit.Second,
                IntervalValue: 1,
            },
            mainReuseKey: CALCULATED_REUSE_KEY,
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: range(20, 100),
                reuseKey: CALCULATED_REUSE_KEY,
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: range(0, 100),
            },
        });

        expect(plan.main).toEqual({
            kind: 'reuse',
            fetchedRange: range(20, 100),
        });
    });

    it('refetches main data when the resolved interval changes', () => {
        const plan = resolvePanelFetchPlan({
            requestPanelRange: range(20, 120),
            requestNavigatorRange: range(20, 120),
            fullRange: range(0, 100),
            loadConfig: LOAD_CONFIG,
            requestInterval: {
                IntervalType: TimeUnit.Second,
                IntervalValue: 6,
            },
            mainReuseKey: CALCULATED_REUSE_KEY_6_SECONDS,
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: range(20, 100),
                reuseKey: CALCULATED_REUSE_KEY,
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: range(0, 100),
            },
        });

        expect(plan.main).toEqual({
            kind: 'fetch',
            fetchRange: range(20, 100),
        });
    });

    it('clips navigator prefetch to the panel data range', () => {
        const plan = resolvePanelFetchPlan({
            requestPanelRange: range(20, 120),
            requestNavigatorRange: range(20, 120),
            fullRange: range(0, 100),
            loadConfig: LOAD_CONFIG,
            requestInterval: {
                IntervalType: TimeUnit.Second,
                IntervalValue: 1,
            },
            mainReuseKey: CALCULATED_REUSE_KEY,
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: range(20, 100),
                reuseKey: CALCULATED_REUSE_KEY,
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: undefined,
            },
        });

        expect(plan.navigator).toEqual({
            kind: 'fetch',
            fetchRange: range(0, 100),
        });
    });

    it('prefetches one visible numeric calculated range on each side', () => {
        const plan = resolvePanelFetchPlan({
            requestPanelRange: range(400, 600),
            requestNavigatorRange: range(0, 1000),
            fullRange: range(0, 1000),
            loadConfig: NUMERIC_LOAD_CONFIG,
            requestInterval: {
                IntervalType: TimeUnit.Second,
                IntervalValue: 1,
            },
            mainReuseKey: NUMERIC_REUSE_KEY,
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: undefined,
                reuseKey: undefined,
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: undefined,
            },
        });

        expect(plan.main).toEqual({
            kind: 'fetch',
            fetchRange: range(200, 800),
        });
    });

    it('reuses prefetched numeric calculated data when the visible range is cached', () => {
        const plan = resolvePanelFetchPlan({
            requestPanelRange: range(450, 550),
            requestNavigatorRange: range(0, 1000),
            fullRange: range(0, 1000),
            loadConfig: NUMERIC_LOAD_CONFIG,
            requestInterval: {
                IntervalType: TimeUnit.Second,
                IntervalValue: 1,
            },
            mainReuseKey: NUMERIC_REUSE_KEY,
            mainCacheState: {
                baseKey: 'main',
                fetchedRange: range(0, 1000),
                reuseKey: NUMERIC_REUSE_KEY,
            },
            navigatorCacheState: {
                baseKey: 'navigator',
                fetchedRange: undefined,
            },
        });

        expect(plan.main).toEqual({
            kind: 'reuse',
            fetchedRange: range(0, 1000),
        });
    });
});
