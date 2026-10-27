import { createNewPanelInfo, type PanelInfo } from '../panel/panelModel';
import { createPanelSeriesDefinition, getPanelSeriesDisplayColor, getSeriesListAxisKind, PanelSeriesCalculationMode } from '../seriesModel';
import { buildRenderableSeriesAnnotations } from './annotationLayout';
import { mapFetchResultToChartData } from './chartData';
import { buildChartOption, buildChartSeriesOption, MAIN_PANEL_SERIES_ID_PREFIX } from './chartOptions';
import type { PanelChartRuntime } from './chartOptions';
import { createPanelChartPresentation, createChartHighlight } from '../panel/panelChartPresentation';

function createPanel(numeric = false) {
    return createNewPanelInfo(['first', 'second'].map((key) => createPanelSeriesDefinition({
        key, table: 'TEST', tagName: key,
        calculationMode: PanelSeriesCalculationMode.Average,
        columns: { name: 'NAME', time: 'TIME', value: 'VALUE', timeBaseTime: true, timeType: numeric ? 12 : 6 },
    })), 'Chart', 'Line');
}

function createRuntime(panel: PanelInfo): PanelChartRuntime {
    const chartData = mapFetchResultToChartData(panel.query.tagSet.map(({ key }) => ({
        seriesKey: key, data: [[0, 2], [20, 4]],
    })), panel.query.tagSet, panel.mode.isRaw);
    return {
        config: createPanelChartPresentation(panel),
        data: { chartData, navigatorChartData: chartData },
        ranges: { mainRange: { start: 0, end: 20 }, navigatorRange: { start: 0, end: 20 } },
        interaction: { visibleSeries: {}, isWheelZoomEnabled: true },
        rendering: { isNumericXAxis: getSeriesListAxisKind(panel.query.tagSet) === 'numeric', animateMainDataUpdate: false, animateNavigatorDataUpdate: false },
    };
}

function renderAnnotations(panel: PanelInfo) {
    const runtime = createRuntime(panel);
    return buildRenderableSeriesAnnotations({
        annotations: runtime.config.annotations,
        series: runtime.config.series,
        chartData: runtime.data.chartData,
        yAxisOptions: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
        visibleRange: runtime.ranges.mainRange,
    });
}

describe('panel chart presentation', () => {
    it.each([false, true])('selects active axis bounds when raw mode is %s', (isRaw) => {
        const panel = createPanel();
        panel.axes.leftY.valueRange = { min: -20, max: 20 };
        panel.axes.leftY.rawValueRange = { min: -10, max: 10 };
        panel.axes.rightY.valueRange = { min: 300, max: 400 };
        panel.axes.rightY.rawValueRange = { min: 100, max: 200 };
        panel.mode.isRaw = isRaw;
        panel.mode.useNormalize = true;
        const option = buildChartOption(createRuntime(panel));
        expect(option.yAxis).toEqual([
            expect.objectContaining(isRaw ? { min: -10, max: 10 } : { min: -20, max: 20 }),
            expect.objectContaining(isRaw ? { min: 100, max: 200 } : { min: 300, max: 400 }),
            expect.any(Object),
        ]);
    });

    it('does not reject dormant settings on a disabled right axis', () => {
        const panel = createPanel();
        panel.axes.rightY.valueRange = { min: 2, max: 1 };
        const config = createPanelChartPresentation(panel);
        expect(config.axes.rightYEnabled).toBe(false);
        expect(config.axes.rightY.valueRange).toEqual({ min: 2, max: 1 });
    });

    it('copies axis bounds and thresholds without changing persisted settings', () => {
        const panel = createPanel();
        panel.mode.isRaw = true;
        panel.axes.leftY.rawValueRange = { min: -5, max: 10 };
        panel.axes.leftY.upperControlLimit = { enabled: false, value: undefined };
        panel.axes.leftY.lowerControlLimit = { enabled: true, value: -3 };
        const config = createPanelChartPresentation(panel);
        expect(config.axes.leftY).toMatchObject({
            valueRange: { min: -5, max: 10 },
            upperControlLimit: { enabled: false, value: 0 },
            lowerControlLimit: { enabled: true, value: -3 },
        });
        config.axes.leftY.valueRange.min = -100;
        config.axes.leftY.upperControlLimit.value = 100;
        config.axes.leftY.lowerControlLimit.enabled = false;
        config.axes.x.showTickline = false;
        expect(panel.axes.leftY.rawValueRange).toEqual({ min: -5, max: 10 });
        expect(panel.axes.leftY.upperControlLimit).toEqual({ enabled: false, value: undefined });
        expect(panel.axes.leftY.lowerControlLimit).toEqual({ enabled: true, value: -3 });
        expect(panel.axes.x.showTickline).toBe(true);
    });

    it.each([false, true])('preserves series order, axis kind and palette when numeric is %s', (numeric) => {
        const panel = createPanel(numeric);
        panel.query.tagSet[0].color = '#abcdef';
        panel.query.tagSet[1].useSecondaryAxis = true;
        const runtime = createRuntime(panel);
        expect(runtime.rendering.isNumericXAxis).toBe(numeric);
        expect(buildChartSeriesOption(runtime).filter((series) => String(series.id).startsWith(MAIN_PANEL_SERIES_ID_PREFIX))).toEqual([
            expect.objectContaining({ yAxisIndex: 0, lineStyle: expect.objectContaining({ color: '#abcdef' }) }),
            expect.objectContaining({ yAxisIndex: 1, lineStyle: expect.objectContaining({ color: getPanelSeriesDisplayColor(panel.query.tagSet[1], 1) }) }),
        ]);
    });

    it('keeps series indexes and annotation anchors when an earlier series failed', () => {
        const panel = createPanel();
        panel.annotations = [
            { text: 'On second', seriesKey: 'second', timeRange: { start: 20, end: 20 }, fillColor: '#112233', textColor: '#445566', clip: true },
            { text: 'On first', seriesKey: 'first', timeRange: { start: 20, end: 20 }, fillColor: '#112233', textColor: '#445566', clip: true },
        ];
        const runtime = createRuntime(panel);
        const chartData = [
            { ...runtime.data.chartData[0], data: [], isUnavailable: true },
            { ...runtime.data.chartData[1], data: [[0, 7], [20, 9]] as [number, number][] },
        ];
        const failedRuntime = { ...runtime, data: { chartData, navigatorChartData: chartData } };
        expect(buildChartSeriesOption(failedRuntime).filter((series) => String(series.id).startsWith(MAIN_PANEL_SERIES_ID_PREFIX))
            .map((series) => series.id)).toEqual([`${MAIN_PANEL_SERIES_ID_PREFIX}1`]);
        expect(buildRenderableSeriesAnnotations({
            annotations: failedRuntime.config.annotations,
            series: failedRuntime.config.series,
            chartData,
            yAxisOptions: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
            visibleRange: failedRuntime.ranges.mainRange,
        })).toEqual([expect.objectContaining({ text: 'On second', seriesIndex: 1, anchorValue: 9 })]);
    });

    it('defaults blank editable numbers without changing the stored values', () => {
        const panel = createPanel();
        panel.display.pointRadius = undefined;
        panel.display.fill = undefined;
        panel.display.stroke = undefined;
        expect(createPanelChartPresentation(panel).display).toMatchObject({ pointRadius: 0, fill: 0, stroke: 0 });
        expect(panel.display).toMatchObject({ pointRadius: undefined, fill: undefined, stroke: undefined });
    });

    it('projects markup in source order with display defaults and independent values', () => {
        const panel = createPanel();
        panel.highlights = [
            { text: '', timeRange: { start: 2, end: 4 }, fillColor: '#123456', textColor: '#abcdef' },
            { text: '  ', timeRange: { start: 8, end: 10 }, fillColor: '#654321', textColor: '#fedcba' },
        ];
        panel.annotations = [
            { text: '  Peak  ', seriesKey: 'second', timeRange: { start: 2, end: 4 }, fillColor: '#112233', textColor: '#445566', clip: true },
            { text: ' \t ', seriesKey: 'first', timeRange: { start: 9, end: 9 }, fillColor: '#abcdef', textColor: '', clip: false },
            { text: 'Reversed', seriesKey: 'second', timeRange: { start: 14, end: 12 }, fillColor: '#fedcba', textColor: '#778899', clip: true },
        ];
        const original = JSON.stringify(panel);
        const annotations = renderAnnotations(panel);
        expect(annotations).toEqual([
            expect.objectContaining({ text: 'Peak', anchorTime: 3, fillColor: '#112233', textColor: '#445566', clip: true }),
            expect.objectContaining({ text: 'note', anchorTime: 9, fillColor: '#abcdef', textColor: '#161616', clip: false }),
            expect.objectContaining({ text: 'Reversed', anchorTime: 14, fillColor: '#fedcba', textColor: '#778899', clip: true }),
        ]);
        expect(buildChartSeriesOption(createRuntime(panel))).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'highlight-labels', data: [
                expect.objectContaining({ name: 'unnamed', value: [3, expect.any(Number)] }),
                expect.objectContaining({ name: '  ', value: [9, expect.any(Number)] }),
            ] }),
        ]));
        annotations[0].text = 'Changed display';
        annotations[0].anchorTime = -100;
        expect(JSON.stringify(panel)).toBe(original);
    });

    it.each([
        { label: 'missing', text: undefined },
        { label: 'numeric', text: 42 },
    ])('recovers $label legacy annotation text without changing stored markup', ({ text }) => {
        const panel = createPanel();
        Object.assign(panel, { annotations: [{
            seriesKey: 'first', timeRange: { start: 12, end: 12 },
            fillColor: '#fff4b8', textColor: '#161616', clip: true,
            ...(text === undefined ? {} : { text }),
        }] });
        const original = JSON.stringify(panel.annotations);
        expect(renderAnnotations(panel)[0]).toMatchObject({ anchorTime: 12, text: 'note' });
        expect(JSON.stringify(panel.annotations)).toBe(original);
    });

    it('renders an unsaved highlight draft with the same defaults without mutating it', () => {
        const panel = createPanel();
        const runtime = createRuntime(panel);
        const draft = { text: '', timeRange: { start: 12, end: 18 }, fillColor: '#123456', textColor: '#fedcba' };
        const original = JSON.stringify(draft);
        runtime.interaction.draftHighlight = createChartHighlight(draft);
        expect(buildChartSeriesOption(runtime)).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'highlight-labels', data: [expect.objectContaining({ name: 'unnamed', value: [15, expect.any(Number)] })] }),
        ]));
        expect(JSON.stringify(draft)).toBe(original);
        expect(panel.highlights).toEqual([]);
    });
});
