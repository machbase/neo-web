import { TimeUnit, type TimeRangeMs } from '../../domain/time/TimeTypes';
import type { PanelChartDataLoadConfig } from './panelChartLoadConfig';
import {
    buildFetchCacheKey,
    buildMainFetchBaseKey,
    buildNavigatorFetchBaseKey,
    getMainFetchReuseKey,
} from './panelFetchCacheKeys';

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

function calculatedReuseKey(intervalValue: number): string {
    return JSON.stringify({
        mode: 'calculated',
        intervalType: TimeUnit.Second,
        intervalValue,
    });
}

describe('panel fetch cache keys', () => {
    it('changes main cache keys when the resolved interval changes', () => {
        const sOneSecondReuseKey = calculatedReuseKey(1);
        const sSixSecondReuseKey = calculatedReuseKey(6);

        expect(
            buildMainFetchBaseKey(
                LOAD_CONFIG,
                800,
                'series',
                'rollups',
                0,
                sSixSecondReuseKey,
            ),
        ).not.toBe(
            buildMainFetchBaseKey(
                LOAD_CONFIG,
                800,
                'series',
                'rollups',
                0,
                sOneSecondReuseKey,
            ),
        );

        expect(
            buildFetchCacheKey(
                'main',
                LOAD_CONFIG,
                range(0, 1000),
                800,
                'series',
                'rollups',
                0,
                sSixSecondReuseKey,
            ),
        ).not.toBe(
            buildFetchCacheKey(
                'main',
                LOAD_CONFIG,
                range(0, 1000),
                800,
                'series',
                'rollups',
                0,
                sOneSecondReuseKey,
            ),
        );
    });

    it('keys numeric calculated reuse by numeric bucket interval', () => {
        expect(
            getMainFetchReuseKey(
                NUMERIC_LOAD_CONFIG,
                {
                    IntervalType: TimeUnit.Second,
                    IntervalValue: 1,
                },
                50,
            ),
        ).not.toBe(
            getMainFetchReuseKey(
                NUMERIC_LOAD_CONFIG,
                {
                    IntervalType: TimeUnit.Second,
                    IntervalValue: 1,
                },
                100,
            ),
        );
    });

    it('keeps navigator keys stable when only main chart fetch settings change', () => {
        const sMainOnlyConfig: PanelChartDataLoadConfig = {
            ...LOAD_CONFIG,
            queryLimit: LOAD_CONFIG.queryLimit + 500,
            intervalType: TimeUnit.Minute,
            useOrderBy: false,
            xAxis: {
                ...LOAD_CONFIG.xAxis,
                rawDataPixelsPerTick: LOAD_CONFIG.xAxis.rawDataPixelsPerTick + 1,
                calculatedDataPixelsPerTick:
                    LOAD_CONFIG.xAxis.calculatedDataPixelsPerTick + 1,
            },
            mainChartSampling: {
                enabled: true,
                sampleCount: 250,
            },
        };

        expect(
            buildNavigatorFetchBaseKey(
                sMainOnlyConfig,
                800,
                'series',
                'rollups',
                0,
            ),
        ).toBe(
            buildNavigatorFetchBaseKey(
                LOAD_CONFIG,
                800,
                'series',
                'rollups',
                0,
            ),
        );

        expect(
            buildFetchCacheKey(
                'navigator',
                sMainOnlyConfig,
                range(0, 1000),
                800,
                'series',
                'rollups',
                0,
            ),
        ).toBe(
            buildFetchCacheKey(
                'navigator',
                LOAD_CONFIG,
                range(0, 1000),
                800,
                'series',
                'rollups',
                0,
            ),
        );
    });
});
