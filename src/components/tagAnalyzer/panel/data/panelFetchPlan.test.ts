import { TimeUnit, type TimeRangeMs } from '../../domain/time/TimeTypes';
import type { PanelChartDataLoadConfig } from './panelChartLoadConfig';
import { resolvePanelFetchPlan } from './panelFetchPlan';

const CALCULATED_REUSE_KEY = JSON.stringify({
    mode: 'calculated',
    intervalType: TimeUnit.Second,
    intervalValue: 1,
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
});
