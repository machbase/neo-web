import { TimeUnit } from '../../range/intervalResolver';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import {
    createNewPanelInfo,
    type PanelInfo,
} from '../panelModel';
import { buildMainSeriesRequest } from './panelSeriesRequest';

const TIME_SERIES: PanelSeriesDefinition = {
    key: 'temperature',
    table: 'TAG',
    sourceTagName: 'TEMPERATURE',
    alias: 'Temperature',
    calculationMode: PanelSeriesCalculationMode.Average,
    color: undefined,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: false,
    },
};

function createPanelConfig(
    series: PanelSeriesDefinition = TIME_SERIES,
): Pick<PanelInfo, 'query' | 'mode' | 'display'> {
    const { query, mode, display } = createNewPanelInfo(
        [series],
        'Request test',
        'Line',
    );
    return { query, mode, display };
}

describe('buildMainSeriesRequest', () => {
    it('converts the automatic duration into the configured interval unit', () => {
        const panelInfo = createPanelConfig();
        panelInfo.query.intervalType = TimeUnit.Second;

        const request = buildMainSeriesRequest(
            panelInfo,
            { start: 0, end: 3_600_000 },
            300,
            {},
        );

        expect(request.kind).toBe('calculated');
        if (request.kind !== 'calculated') return;
        expect(request.args[2]).toEqual({
            IntervalType: TimeUnit.Second,
            IntervalValue: 60,
        });
        expect(request.args[3]).toBe(100);
    });

    it('derives a numeric bucket from the width-based row limit', () => {
        const numericSeries: PanelSeriesDefinition = {
            ...TIME_SERIES,
            sourceColumns: {
                ...TIME_SERIES.sourceColumns,
                timeBaseTime: true,
                timeType: 4,
            },
        };

        const request = buildMainSeriesRequest(
            createPanelConfig(numericSeries),
            { start: 0, end: 1_000 },
            300,
            {},
        );

        expect(request.kind).toBe('calculated');
        if (request.kind !== 'calculated') return;
        expect(request.args[3]).toBe(100);
        expect(request.args[5]?.numericBucketWidth).toBe(10);
    });

    it('selects direct and sampled raw requests from the sampling setting', () => {
        const directPanel = createPanelConfig();
        directPanel.mode.isRaw = true;
        const signal = new AbortController().signal;
        const directRequest = buildMainSeriesRequest(
            directPanel,
            { start: 0, end: 100 },
            300,
            {},
            { signal },
        );

        const sampledPanel = createPanelConfig();
        sampledPanel.mode.isRaw = true;
        sampledPanel.display.mainChartSampling = {
            enabled: true,
            sampleCount: 0.05,
        };
        const sampledRequest = buildMainSeriesRequest(
            sampledPanel,
            { start: 0, end: 100 },
            300,
            {},
        );

        expect(directRequest.kind).toBe('raw');
        if (directRequest.kind === 'raw') {
            expect(directRequest.args[3]).toBe(signal);
        }
        expect(sampledRequest.kind).toBe('sampled-raw');
        if (sampledRequest.kind === 'sampled-raw') {
            expect(sampledRequest.args[2]).toBe(0.05);
        }
    });

    it('rejects invalid request geometry before building API arguments', () => {
        const panelInfo = createPanelConfig();

        expect(() =>
            buildMainSeriesRequest(
                panelInfo,
                { start: 10, end: 10 },
                300,
                {},
            ),
        ).toThrow('valid range');
        expect(() =>
            buildMainSeriesRequest(
                panelInfo,
                { start: 0, end: 10 },
                0,
                {},
            ),
        ).toThrow('positive chart width');
    });
});
