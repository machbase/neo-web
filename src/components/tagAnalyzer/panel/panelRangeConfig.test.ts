import { seriesDataApi } from '../api/seriesDataApi';
import { encodeTazBoard } from '../persistence/tazFormat';
import { loadTazBoard } from '../board/boardDocuments';
import { PanelSeriesCalculationMode, type PanelSeriesDefinition } from '../seriesModel';
import { createNewPanelInfo, type PanelInfo } from './panelModel';
import { createPanelRangeConfig } from './panelRangeConfig';

const TIME_SERIES: PanelSeriesDefinition = {
    key: 'time-series', table: 'TAG', sourceTagName: 'TAG_A', alias: 'Tag A',
    calculationMode: PanelSeriesCalculationMode.Average,
    useSecondaryAxis: false, id: undefined, useRollupTable: false,
    sourceColumns: { name: 'NAME', time: 'TIME', value: 'VALUE', timeType: 6, timeBaseTime: true },
};
const NUMERIC_SERIES: PanelSeriesDefinition = {
    ...TIME_SERIES,
    key: 'numeric-series',
    sourceColumns: { ...TIME_SERIES.sourceColumns, time: 'ODOMETER', timeType: 4 },
};

function encodePanel(panel: PanelInfo) {
    return encodeTazBoard({
        id: 'board', type: 'taz', name: 'board.taz', path: '/', code: '', savedCode: false,
        boardTimeRange: { start: '', end: '' }, boardNumericRange: { start: '', end: '' },
        panels: [panel],
    });
}

afterEach(() => jest.restoreAllMocks());

describe('panel range configuration boundary', () => {
    it.each([
        ['time', TIME_SERIES, { start: 'first+1s', end: 'last-1s' }],
        ['numeric', NUMERIC_SERIES, { start: 'first+10', end: 'last-10' }],
    ] as const)('reconstructs %s configuration from the existing TAZ format', (axisKind, series, rangeInput) => {
        const panel = createNewPanelInfo([series], 'Saved panel', 'Line');
        panel.time = {
            rangeInput,
            navigatorRangeInput: { start: 'first', end: 'last' },
            useLastViewedRange: true,
            lastViewedRange: {
                mainRange: { start: 20_000, end: 30_000 },
                navigatorRange: { start: 10_000, end: 40_000 },
            },
        };

        const encoded = encodePanel(panel);
        const loaded = loadTazBoard(JSON.parse(JSON.stringify(encoded)), 'board', 'board.taz', '/').panels[0];
        const config = createPanelRangeConfig(loaded);

        expect(encoded.version).toBe('2.1.0');
        expect(encoded.panels[0]).not.toHaveProperty('axisKind');
        expect(encoded.panels[0].timeRange).not.toHaveProperty('axisKind');
        expect(config).toMatchObject({
            key: panel.key,
            axisKind,
            rangeInput,
            navigatorRangeInput: panel.time.navigatorRangeInput,
            restoredRange: panel.time.lastViewedRange,
        });
    });

    it('does not restore a saved view when its persisted option is disabled', () => {
        const panel = createNewPanelInfo([TIME_SERIES], 'Panel', 'Line');
        panel.time.lastViewedRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };

        const loaded = loadTazBoard(encodePanel(panel), 'board', 'board.taz', '/').panels[0];

        expect(loaded.time.lastViewedRange).toEqual(panel.time.lastViewedRange);
        expect(createPanelRangeConfig(loaded).restoredRange).toBeUndefined();
    });

    it.each<{ label: string; series: PanelSeriesDefinition[] }>([
        { label: 'empty', series: [] },
        { label: 'mixed', series: [TIME_SERIES, NUMERIC_SERIES] },
    ])('keeps $label series without a fabricated axis', ({ series }) => {
        const panel = createNewPanelInfo(series, 'Panel', 'Line');

        expect(createPanelRangeConfig(panel).axisKind).toBeUndefined();
    });

    it('loads the series captured with each configuration after the panel is replaced', async () => {
        const fetchRange = jest.spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockResolvedValueOnce({ start: 1_000, end: 2_000 })
            .mockResolvedValueOnce({ start: 10, end: 20 });
        const panel = createNewPanelInfo([TIME_SERIES], 'Panel', 'Line');
        const timeSeries = panel.query.tagSet;
        const timeConfig = createPanelRangeConfig(panel);
        panel.query = { ...panel.query, tagSet: [NUMERIC_SERIES] };
        const numericConfig = createPanelRangeConfig(panel);

        await expect(timeConfig.loadFullRange()).resolves.toEqual({ start: 1_000, end: 2_000 });
        await expect(numericConfig.loadFullRange()).resolves.toEqual({ start: 10, end: 20 });
        expect(timeConfig.axisKind).toBe('time');
        expect(numericConfig.axisKind).toBe('numeric');
        expect(fetchRange).toHaveBeenNthCalledWith(1, timeSeries);
        expect(fetchRange).toHaveBeenNthCalledWith(2, [NUMERIC_SERIES]);
    });
});
