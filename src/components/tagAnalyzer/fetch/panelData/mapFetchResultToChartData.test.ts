import type {
    FetchPanelSeriesRowsResult,
} from './PanelDataFetchTypes';
import { TimeUnit } from '../../domain/time/TimeTypes';
import { mapFetchResultToChartData } from './mapFetchResultToChartData';

function createResult(): FetchPanelSeriesRowsResult {
    return {
        seriesFetchResults: [
            {
                seriesConfig: {
                    key: 'series-vibration',
                    table: 'SYS.SENSOR_TABLE',
                    sourceTagName: 'Sensor_03',
                    alias: '',
                    calculationMode: 'avg',
                    useSecondaryAxis: false,
                    id: undefined,
                    useRollupTable: false,
                    sourceColumns: {
                        name: 'NAME',
                        time: 'TIME',
                        value: 'VIBRATION',
                    },
                },
                fetchResult: {
                    data: {
                        column: ['TIME', 'VALUE'],
                        rows: [[1, 10]],
                    },
                },
                usesRollup: false,
            },
            {
                seriesConfig: {
                    key: 'series-height',
                    table: 'SYS.SENSOR_TABLE',
                    sourceTagName: 'Sensor_03',
                    alias: '',
                    calculationMode: 'avg',
                    useSecondaryAxis: false,
                    id: undefined,
                    useRollupTable: false,
                    sourceColumns: {
                        name: 'NAME',
                        time: 'TIME',
                        value: 'HEIGHT',
                    },
                },
                fetchResult: {
                    data: {
                        column: ['TIME', 'VALUE'],
                        rows: [[1, 20]],
                    },
                },
                usesRollup: false,
            },
        ],
        interval: {
            IntervalType: TimeUnit.Second,
            IntervalValue: 1,
        },
        count: 1,
        isRaw: false,
    };
}

describe('mapFetchResultToChartData', () => {
    it('uses alias-style default names for display and source-based ECharts identity', () => {
        const sChartData = mapFetchResultToChartData(createResult());

        expect(sChartData.map((series) => series.name)).toEqual([
            'Sensor_03 / VIBRATION (SYS.SENSOR_TABLE)',
            'Sensor_03 / HEIGHT (SYS.SENSOR_TABLE)',
        ]);
        expect(sChartData.map((series) => series.echartsName)).toEqual([
            'SYS.SENSOR_TABLE / Sensor_03 / VIBRATION (avg)',
            'SYS.SENSOR_TABLE / Sensor_03 / HEIGHT (avg)',
        ]);
    });

    it('shows custom aliases without changing source-based ECharts names', () => {
        const sResult = createResult();
        sResult.seriesFetchResults[0].seriesConfig.alias = 'Vibration';

        const sChartData = mapFetchResultToChartData(sResult);

        expect(sChartData[0].name).toBe('Vibration');
        expect(sChartData[0].echartsName).toBe(
            'SYS.SENSOR_TABLE / Sensor_03 / VIBRATION (avg)',
        );
    });
});
