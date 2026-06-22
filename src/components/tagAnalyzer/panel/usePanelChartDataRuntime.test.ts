import { TimeUnit } from '../domain/time/model/TimeTypes';
import { resolvePanelFetchPlan } from './usePanelChartDataRuntime';

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

    it('reuses navigator data when request is outside fullRange', () => {
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

        expect(fetchPlan.navigator.kind).toBe('reuse');
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
