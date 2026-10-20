import { createNewPanelInfo, type PanelInfo } from '../panel/panelModel';
import { PanelSeriesCalculationMode, type PanelSeriesDefinition } from '../seriesModel';
import { loadTazBoard as loadBoardDocument, saveTazBoard as saveBoardDocument } from '../board/boardDocuments';
import { isTazBoardSaved, loadTazBoard, saveTazBoard } from './tazDocumentService';
import { tazFileApi } from './tazFileApi';
import { encodeTazBoard } from './tazFormat';
import * as tazFormat from './tazFormat';

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
const LEGACY_NUMERIC_RANGE = {
    start: { kind: 'numeric_data_start', value: -12 },
    end: { kind: 'numeric_data_end', value: -5 },
};

function createV200NumericPanel() {
    const axis = {
        valueRange: { min: undefined, max: undefined },
        rawDataValueRange: { min: undefined, max: undefined },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    };
    return {
        meta: { panelKey: 'numeric-panel', chartTitle: 'Distance' },
        data: { seriesList: [{
            seriesKey: NUMERIC_SERIES.key,
            tableName: NUMERIC_SERIES.table,
            sourceTagName: NUMERIC_SERIES.sourceTagName,
            alias: NUMERIC_SERIES.alias,
            calculationMode: 'avg',
            sourceColumns: {
                nameColumn: 'NAME', timeColumn: 'ODOMETER', valueColumn: 'VALUE',
                timeType: 4, timeBaseTime: true,
            },
        }] },
        toolbar: { isRaw: false },
        time: { rangeConfig: LEGACY_NUMERIC_RANGE },
        axes: { xAxis: {}, leftYAxis: axis, rightYAxis: axis },
        display: { chartType: 'Line' },
    };
}

function createV204NumericPanel() {
    const axis = {
        zero_base: false, show_tickline: true,
        value_range: { min: undefined, max: undefined },
        raw_data_value_range: { min: undefined, max: undefined },
        upper_control_limit: { enabled: false, value: 0 },
        lower_control_limit: { enabled: false, value: 0 },
    };
    return {
        general: {
            chart_title: 'Distance', use_zoom: true, use_last_viewed_range: false,
            is_raw: false, use_normalize: false,
        },
        data: { index_key: 'numeric-panel', tag_set: [NUMERIC_SERIES] },
        time: { range_config: LEGACY_NUMERIC_RANGE },
        axes: {
            x_axis: { show_tickline: true, calculated_data_pixels_per_tick: 3 },
            left_y_axis: axis, right_y_axis: axis, right_y_axis_enabled: false,
        },
        display: {
            show_legend: true, chart_type: 'Line', show_point: true,
            point_radius: 0, fill: 0, stroke: 1,
        },
    };
}

function encodePanels(panels: PanelInfo[]) {
    return encodeTazBoard({
        id: 'persisted-id', type: 'taz', name: 'original.taz', path: '/original/',
        code: '', savedCode: false, panels,
        boardTimeRange: { start: 'now-1h', end: 'now' },
        boardNumericRange: { start: 'first+10', end: 'last-5' },
    });
}

afterEach(() => jest.restoreAllMocks());

describe('public TAZ loading and reconstruction', () => {
    it.each([
        ['2.0.0', createV200NumericPanel],
        ['2.0.4', createV204NumericPanel],
    ] as const)('decodes numeric range expressions after identifying the %s panel axis', (version, createPanel) => {
        const loaded = loadTazBoard({ version, panels: [createPanel()] }, 'opened-id', 'distance.taz', '/work/');

        expect(loaded.panels[0].time.rangeInput).toEqual({ start: 'first+12', end: 'last-5' });
        expect(loaded.panels[0].query.tagSet[0]).toMatchObject({
            key: 'numeric-series', calculationMode: 'AVG',
            sourceColumns: { time: 'ODOMETER', timeType: 4, timeBaseTime: true },
        });
        expect(loaded.version).toBe(version);
        expect(loaded.loadWarning).toContain(`(${version})`);
        expect(isTazBoardSaved(loaded)).toBe(true);
    });

    it('loads separate time and numeric panels while overriding document identity and retaining both Board ranges', () => {
        const timePanel = createNewPanelInfo([TIME_SERIES], 'Time', 'Line');
        timePanel.time.rangeInput = { start: 'first+1h', end: 'last-1h' };
        timePanel.time.navigatorRangeInput = { start: 'first', end: 'last' };
        const numericPanel = createNewPanelInfo([NUMERIC_SERIES], 'Distance', 'Line');
        numericPanel.time.rangeInput = { start: 'FIRST + 1e1', end: 'last - .25e+2' };
        numericPanel.time.navigatorRangeInput = { start: 'first-10', end: 'last+10' };
        const document = { ...encodePanels([timePanel, numericPanel]), code: 'persisted transient code' };

        const loaded = loadTazBoard(document, 'opened-id', 'opened.taz', '/work/');

        expect(loaded).toMatchObject({
            id: 'opened-id', name: 'opened.taz', path: '/work/', type: 'taz', code: '',
            version: '2.1.0',
            boardTimeRange: { start: 'now-1h', end: 'now' },
            boardNumericRange: { start: 'first+10', end: 'last-5' },
        });
        expect(loaded.loadWarning).toBeUndefined();
        expect(loaded.panels.map(({ title, time }) => ({ title, time }))).toEqual([
            { title: 'Time', time: timePanel.time },
            { title: 'Distance', time: numericPanel.time },
        ]);
        expect(loaded.panels.map(({ query }) => query.tagSet[0].sourceColumns.timeType)).toEqual([6, 4]);
        expect(isTazBoardSaved(loaded)).toBe(true);
        expect(document.code).toBe('persisted transient code');
    });

    it('snapshots repaired panel keys on load and upgrades an older Board only after saving', async () => {
        const panel = createV204NumericPanel();
        const panels = [panel, { ...panel }, { ...panel, data: { ...panel.data, index_key: '' } }];
        const loaded = loadTazBoard({ version: '2.0.4', panels }, 'opened-id', 'repaired.taz', '/work/');
        const keys = loaded.panels.map(({ key }) => key);

        expect(keys[0]).toBe('numeric-panel');
        expect(new Set(keys).size).toBe(3);
        expect(keys.every((key) => key.trim().length > 0)).toBe(true);
        expect(panels.map(({ data }) => data.index_key)).toEqual(['numeric-panel', 'numeric-panel', '']);
        expect(loaded.version).toBe('2.0.4');
        expect(loaded.loadWarning).toContain('(2.0.4)');
        expect(isTazBoardSaved(loaded)).toBe(true);
        expect(isTazBoardSaved({
            ...loaded,
            panels: loaded.panels.map((item, index) => index === 0 ? { ...item, title: 'Edited' } : item),
        })).toBe(false);

        const saveFile = jest.spyOn(tazFileApi, 'saveTazFile').mockResolvedValue(true);
        const saved = await saveTazBoard(loaded);

        expect(saved).toBeDefined();
        expect(saved?.version).toBe('2.1.0');
        expect(saved?.loadWarning).toBeUndefined();
        expect(saved?.panels.map(({ key }) => key)).toEqual(keys);
        expect(isTazBoardSaved(saved!)).toBe(true);
        expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({
            directoryPath: '/work/', fileName: 'repaired.taz',
            payload: expect.objectContaining({ version: '2.1.0' }),
        }));
        const reopened = loadTazBoard(saveFile.mock.calls[0][0].payload, 'reopened-id', 'repaired.taz', '/work/');
        expect(reopened.panels.map(({ key }) => key)).toEqual(keys);
        expect(reopened.loadWarning).toBeUndefined();
        expect(isTazBoardSaved(reopened)).toBe(true);
        expect(loaded.version).toBe('2.0.4');
        expect(loaded.loadWarning).toContain('(2.0.4)');
    });
});

describe('Board document lifecycle', () => {
    it('saves edited markup and view ranges to a new destination and reopens through the existing facade', async () => {
        const panel = createNewPanelInfo([TIME_SERIES], 'Original', 'Line');
        panel.time = {
            rangeInput: { start: 'first', end: 'last' },
            navigatorRangeInput: { start: 'first', end: 'last' },
            useLastViewedRange: true,
            lastViewedRange: {
                mainRange: { start: 20, end: 40 },
                navigatorRange: { start: 10, end: 50 },
            },
        };
        panel.highlights = [{
            text: 'Window', timeRange: { start: 20, end: 40 },
            fillColor: '#112233', textColor: '#445566',
        }];
        panel.annotations = [{
            text: 'Peak', seriesKey: TIME_SERIES.key, timeRange: { start: 30, end: 30 },
            fillColor: '#abcdef', textColor: '#123456', clip: true,
        }];
        const opened = loadBoardDocument(encodePanels([panel]), 'opened-id', 'original.taz', '/original/');
        expect(opened.panels[0]).toMatchObject({
            time: panel.time, highlights: panel.highlights, annotations: panel.annotations,
            isOverlapSelected: false,
        });
        const edited = {
            ...opened,
            name: 'copy.taz', path: '/reports/', code: 'transient editor code',
            panels: opened.panels.map((item) => ({ ...item, title: 'Edited', isOverlapSelected: true })),
        };
        const original = JSON.stringify(edited);
        const writeFile = jest.spyOn(tazFileApi, 'saveTazFile').mockResolvedValue(true);

        const saved = await saveBoardDocument(edited);

        expect(saved).toBeDefined();
        expect(saved?.code).toBe('');
        expect(isTazBoardSaved(saved!)).toBe(true);
        expect(writeFile).toHaveBeenCalledTimes(1);
        const request = writeFile.mock.calls[0][0];
        expect(request).toMatchObject({
            directoryPath: '/reports/', fileName: 'copy.taz',
            payload: {
                version: '2.1.0',
                panels: [{
                    title: 'Edited',
                    timeRange: { start: 'first', end: 'last', useLastViewedRange: true },
                    highlights: [{ text: 'Window', timeRange: { startTime: 20, endTime: 40 } }],
                    annotations: [{ text: 'Peak', seriesKey: TIME_SERIES.key, timeRange: { startTime: 30, endTime: 30 }, clip: true }],
                }],
            },
        });
        expect(request.payload).not.toHaveProperty('savedCode');
        expect(request.payload).not.toHaveProperty('panels.0.isOverlapSelected');
        expect(JSON.stringify(edited)).toBe(original);

        const reopened = loadTazBoard(request.payload, 'reopened-id', 'copy.taz', '/reports/');
        expect(reopened.panels[0]).toMatchObject({
            title: 'Edited', time: panel.time, highlights: panel.highlights,
            annotations: panel.annotations, isOverlapSelected: false,
        });
        expect(isTazBoardSaved(reopened)).toBe(true);
    });

    it.each(['rejected', 'unsuccessful'])('returns undefined for a %s write without upgrading or mutating the board', async (outcome) => {
        const board = loadTazBoard({ version: '2.0.4', panels: [createV204NumericPanel()] }, 'opened-id', 'original.taz', '/original/');
        board.code = 'unsaved editor code';
        const original = JSON.stringify(board);
        const writeFile = jest.spyOn(tazFileApi, 'saveTazFile');
        if (outcome === 'rejected') writeFile.mockRejectedValue(new Error('Write failed'));
        else writeFile.mockResolvedValue(false);

        await expect(saveBoardDocument(board)).resolves.toBeUndefined();

        expect(writeFile).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(board)).toBe(original);
        expect(board.version).toBe('2.0.4');
        expect(board.loadWarning).toContain('(2.0.4)');
    });

    it('returns undefined without writing or mutating when serialization fails', async () => {
        const board = loadTazBoard(encodePanels([]), 'opened-id', 'original.taz', '/original/');
        const original = JSON.stringify(board);
        const writeFile = jest.spyOn(tazFileApi, 'saveTazFile');
        jest.spyOn(tazFormat, 'encodeTazBoard').mockImplementation(() => { throw new Error('Cannot serialize board'); });

        await expect(saveBoardDocument(board)).resolves.toBeUndefined();

        expect(writeFile).not.toHaveBeenCalled();
        expect(JSON.stringify(board)).toBe(original);
    });
});
