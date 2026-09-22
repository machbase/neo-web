import { createNewPanelInfo } from '../panel/panelModel';
import { encodeTazBoard, TazVersion } from './tazFormat';
import { loadTazBoard } from '../board/boardDocuments';

function loadTestBoard(document: unknown) {
    return loadTazBoard(document, 'board', 'board.taz', '/');
}

function createSeries() {
    return {
        key: 'series-1',
        table: 'TAG_TABLE',
        sourceTagName: 'TAG_A',
        alias: '   ',
        calculationMode: ' count ',
        useSecondaryAxis: true,
        useRollupTable: true,
        sourceColumns: { name: 'NAME', time: 'TIME', value: 'VALUE', jsonKey: 'rpm' },
    };
}

function createV200Series() {
    const series = createSeries();
    return {
        ...series,
        seriesKey: series.key,
        tableName: series.table,
        sourceColumns: {
            nameColumn: 'NAME', timeColumn: 'TIME', valueColumn: 'VALUE', jsonKey: 'rpm',
        },
    };
}

function createV200Panel(seriesList: unknown[] = [createV200Series()]) {
    const axis = {
        valueRange: { min: undefined, max: undefined },
        rawDataValueRange: { min: undefined, max: undefined },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    };
    return {
        meta: { panelKey: 'panel-1', chartTitle: 'Saved panel' },
        data: { seriesList },
        toolbar: { isRaw: false },
        time: { rangeConfig: { start: 'first', end: 'last' } },
        axes: { xAxis: {}, leftYAxis: axis, rightYAxis: axis },
        display: { chartType: 'Line' },
    };
}

function createV204Panel(tagSet: unknown[] = [createSeries()]) {
    const axis = {
        zero_base: false,
        show_tickline: true,
        value_range: { min: undefined, max: undefined },
        raw_data_value_range: { min: undefined, max: undefined },
        upper_control_limit: { enabled: false, value: 0 },
        lower_control_limit: { enabled: false, value: 0 },
    };
    return {
        general: {
            chart_title: 'Saved panel', use_zoom: true, use_last_viewed_range: false,
            is_raw: false, use_normalize: false,
        },
        data: { index_key: 'panel-1', tag_set: tagSet },
        time: { range_config: { start: 'first', end: 'last' } },
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

function createV210Panel(tagSet: unknown[] = [createSeries()]) {
    const panel = createNewPanelInfo([], 'Saved panel', 'Line');
    panel.key = 'panel-1';
    panel.time.rangeInput = { start: 'first', end: 'last' };
    const saved = encodeTazBoard({
        id: 'board', type: 'taz', name: 'board.taz', path: '/', code: '', savedCode: false,
        boardTimeRange: { start: '', end: '' }, boardNumericRange: { start: '', end: '' },
        panels: [panel],
    }).panels[0];
    return { ...saved, query: { ...saved.query, tagSet } };
}

function createLegacyNestedPanel() {
    const series = createSeries();
    return {
        meta: { index_key: 'panel-1', chart_title: 'Saved panel' },
        data: {
            tag_set: [{
                ...series,
                sourceColumns: undefined,
                colName: series.sourceColumns,
                tagName: series.sourceTagName,
                use_y2: 'Y', onRollup: true,
            }],
        },
        time: { range_bgn: 'first', range_end: 'last' },
        axes: {},
        display: { chart_type: 'Line' },
    };
}

describe('persisted panel reconstruction compatibility', () => {
    it.each([
        [TazVersion.Legacy, createLegacyNestedPanel],
        [TazVersion.V200, createV200Panel],
        [TazVersion.V204, createV204Panel],
        [TazVersion.V210, () => {
            const panel = createV210Panel();
            return { ...panel, display: { ...panel.display, rawNavigatorSampling: undefined } };
        }],
    ] as const)('restores independent historical navigator sampling defaults for %s', (version, createPanel) => {
        const stored = createPanel();
        const loaded = loadTestBoard({ version, panels: [stored, stored] });

        expect(loaded.panels.map((panel) => panel.display.rawNavigatorSampling)).toEqual([
            { enabled: false, sampleCount: 0.01 },
            { enabled: false, sampleCount: 0.01 },
        ]);
        loaded.panels[0].display.rawNavigatorSampling.sampleCount = 25;
        expect(loaded.panels[1].display.rawNavigatorSampling).toEqual({ enabled: false, sampleCount: 0.01 });
    });

    it('preserves explicit current-format navigator sampling instead of applying the historical fallback', () => {
        const stored = createV210Panel();
        stored.display.rawNavigatorSampling = { enabled: true, sampleCount: 25 };

        const loaded = loadTestBoard({ version: TazVersion.V210, panels: [stored] });

        expect(loaded.panels[0].display.rawNavigatorSampling).toEqual({ enabled: true, sampleCount: 25 });
        expect(stored.display.rawNavigatorSampling).toEqual({ enabled: true, sampleCount: 25 });
    });

    it.each([
        [TazVersion.Legacy, createLegacyNestedPanel, '#367FEB'],
        [TazVersion.V200, createV200Panel, '#367FEB'],
        [TazVersion.V203, createV200Panel, '#367FEB'],
        [TazVersion.V204, createV204Panel, '#367FEB'],
        [TazVersion.V205, createV204Panel, '#367FEB'],
        [TazVersion.V210, createV210Panel, undefined],
    ] as const)('normalizes %s series without changing its data binding', (version, createPanel, color) => {
        const panel = loadTestBoard({ version, panels: [createPanel()] }).panels[0];

        expect(panel.key).toBe('panel-1');
        expect(panel.title).toBe('Saved panel');
        expect(panel.isOverlapSelected).toBe(false);
        expect(panel.query.tagSet).toEqual([expect.objectContaining({
            key: 'series-1', table: 'TAG_TABLE', sourceTagName: 'TAG_A',
            alias: 'TAG_A / VALUE -> rpm (TAG_TABLE)', calculationMode: 'CNT', color,
            useSecondaryAxis: true, useRollupTable: true,
            sourceColumns: expect.objectContaining({
                name: 'NAME', time: 'TIME', value: 'VALUE', jsonKey: 'rpm',
            }),
        })]);
        expect(panel.time.rangeInput).toEqual({ start: 'first', end: 'last' });
    });

    it('keeps v2.0 panel and series annotations in order with their distinct empty-label behavior', () => {
        const panel = createV200Panel([{
            ...createV200Series(),
            annotations: [{ text: '', timeRange: { startTime: 12, endTime: 12 }, clip: true }],
        }]);
        const loaded = loadTestBoard({
            version: TazVersion.V203,
            panels: [{
                ...panel,
                annotations: [{ text: '', seriesKey: 'series-1', timeRange: { startTime: 10, endTime: 10 } }],
                highlights: [{ text: '', timeRange: { startTime: 1, endTime: 20 } }],
            }],
        }).panels[0];

        expect(loaded.annotations).toEqual([
            { text: 'note', seriesKey: 'series-1', timeRange: { start: 10, end: 10 }, fillColor: '#fff4b8', textColor: '#161616', clip: false },
            { text: '', seriesKey: 'series-1', timeRange: { start: 12, end: 12 }, fillColor: '#fff4b8', textColor: '#161616', clip: true },
        ]);
        expect(loaded.highlights).toEqual([
            { text: '', timeRange: { start: 1, end: 20 }, fillColor: '#fdb532', textColor: '#fdb532' },
        ]);
    });

    it('retains current markup colors, default labels, zero-width annotations and clip flags', () => {
        const loaded = loadTestBoard({
            version: TazVersion.V210,
            panels: [{
                ...createV210Panel(),
                annotations: [
                    { text: '', seriesKey: 'series-1', timeRange: { startTime: 15, endTime: 15 }, clip: true },
                    { text: 'Peak', seriesKey: 'series-1', timeRange: { startTime: 16, endTime: 18 }, fillColor: '#123456', textColor: '#abcdef', clip: false },
                ],
                highlights: [
                    { text: 'Region', timeRange: { startTime: 10, endTime: 20 }, fillColor: '#112233', textColor: '#445566' },
                ],
            }],
        }).panels[0];

        expect(loaded.annotations).toEqual([
            { text: 'note', seriesKey: 'series-1', timeRange: { start: 15, end: 15 }, fillColor: '#fff4b8', textColor: '#161616', clip: true },
            { text: 'Peak', seriesKey: 'series-1', timeRange: { start: 16, end: 18 }, fillColor: '#123456', textColor: '#abcdef', clip: false },
        ]);
        expect(loaded.highlights).toEqual([
            { text: 'Region', timeRange: { start: 10, end: 20 }, fillColor: '#112233', textColor: '#445566' },
        ]);
    });

    it.each([TazVersion.V204, TazVersion.V210])('rejects mixed time and numeric axes in %s', (version) => {
        const series = createSeries();
        const tagSet = [series, {
            ...series, key: 'numeric',
            sourceColumns: { ...series.sourceColumns, timeType: 4, timeBaseTime: true },
        }];
        const panel = version === TazVersion.V210 ? createV210Panel(tagSet) : createV204Panel(tagSet);

        expect(() => loadTestBoard({ version, panels: [panel] })).toThrow(
            'Datetime and numeric x-axis series cannot be mixed in one chart.',
        );
    });

    it('preserves the first panel key and regenerates duplicate or blank keys without dropping panels', () => {
        const panel = createV210Panel();
        const panels = [panel, { ...panel, title: 'Duplicate' }, { ...panel, key: '', title: 'Blank' }];
        const loaded = loadTestBoard({ version: TazVersion.V210, panels }).panels;

        expect(loaded.map(({ title }) => title)).toEqual(['Saved panel', 'Duplicate', 'Blank']);
        expect(loaded[0].key).toBe('panel-1');
        expect(new Set(loaded.map(({ key }) => key)).size).toBe(3);
        expect(loaded.every(({ key }) => key.trim().length > 0)).toBe(true);
        expect(panels.map(({ key }) => key)).toEqual(['panel-1', 'panel-1', '']);
    });

    it('preserves v2.0 permissive identifiers and missing-column defaults', () => {
        const loaded = loadTestBoard({
            version: TazVersion.V200,
            panels: [createV200Panel([{
                ...createV200Series(), tableName: 'historical table', sourceColumns: undefined,
            }])],
        }).panels[0].query.tagSet[0];

        expect(loaded.table).toBe('historical table');
        expect(loaded.sourceColumns).toEqual({ name: 'NAME', time: 'TIME', value: 'VALUE' });
        expect(loaded.alias).toBe('TAG_A / VALUE (historical table)');
    });

    it.each([TazVersion.V204, TazVersion.V210])('retains strict identifier validation in %s', (version) => {
        const series = { ...createSeries(), table: 'historical table' };
        const panel = version === TazVersion.V210 ? createV210Panel([series]) : createV204Panel([series]);

        expect(() => loadTestBoard({ version, panels: [panel] })).toThrow('panel series structure.');
    });
});
