// #1563: dashboard values the code used without checking, and older (< 1.0.1) panels.
import { DashboardChartOptionParser } from './DashboardChartOptionParser';
import { DashboardChartOptionParser as PublicDashboardChartOptionParser } from '@/public-dashboard/utils/DashboardChartOptionParser';
import { DefaultChartOption, DefaultCommonOption, DefaultXAxisOption, DefaultYAxisOption, getDefaultSeriesOption } from './eChartHelper';
import { legacyToFixedSource } from './Chart/formatters';
import { E_BLOCK_TYPE } from './Chart/TransformDataParser';
import { calcInterval, isTimeRangeOutOfOrder } from './dashboardUtil';
import { CheckDataCompatibility, dashboardShapeError } from './CheckDataCompatibility';
import { toDshUrlPath } from './filePath';
import { upgradeDashboardPanel } from './version/utils';
import { getPanelTimeRangeValidationMessage } from '@/components/dashboard/createPanel/validation';

// Formatters are function bodies as text; the chart runtime evaluates them the same way.
const compile = (aSource: string) => new Function(`return (${aSource});`)();

const panel = (aType: string, aChartType: string, aChartOptions: object, aExtra: object = {}) => ({
    type: aType,
    chartOptions: { ...getDefaultSeriesOption(aChartType as any), ...aChartOptions },
    commonOptions: { ...DefaultCommonOption, title: 'P' },
    xAxisOptions: [DefaultXAxisOption],
    yAxisOptions: [DefaultYAxisOption],
    blockList: [],
    theme: 'white',
    version: '1.0.1',
    ...aExtra,
});

describe.each([
    ['editor', DashboardChartOptionParser],
    ['public dashboard', PublicDashboardChartOptionParser],
])('empty number options (%s)', (_aName, aParse) => {
    const series = (aPanel: object) => (aParse(aPanel, [{ name: 'a', color: '', useQuery: true, type: E_BLOCK_TYPE.STD }], { startTime: 0, endTime: 1 }) as any).series[0];

    it('falls back to the chart type default for a cleared or non-numeric number', () => {
        expect(series(panel('Liquid fill', 'liquidFill', { amplitude: '', fontSize: '' }))).toMatchObject({ amplitude: 20, label: { fontSize: 30 } });
        expect(series(panel('Gauge', 'gauge', { axisLabelDistance: '', anchorSize: '', valueFontSize: '' }))).toMatchObject({
            axisLabel: { distance: 25 },
            anchor: { size: 25 },
            detail: { fontSize: 15 },
        });
        expect(series(panel('Scatter', 'scatter', { symbolSize: 'abc' })).symbolSize).toBe(4);
        expect(series(panel('Line', 'line', { areaStyle: true, fillOpacity: '' })).areaStyle).toEqual({ opacity: 0.3 });
    });

    it('writes a set number and a quoted slot as before', () => {
        expect(series(panel('Liquid fill', 'liquidFill', { amplitude: 35 })).amplitude).toBe(35);
        expect(series(panel('Gauge', 'gauge', { alignCenter: '' })).detail.offsetCenter).toEqual([0, '%']);
    });
});

describe('older panel axis labels', () => {
    const axisLabel = (aLabel: object) => {
        const sOption: any = DashboardChartOptionParser(
            panel('Line', 'line', {}, { version: '1.0.0', yAxisOptions: [{ ...DefaultYAxisOption, label: { name: 'value', key: 'value', title: '', unit: '', decimals: undefined, squared: 0, ...aLabel } }] }),
            [],
            { startTime: 0, endTime: 1 }
        );
        return compile(sOption.yAxis[0].axisLabel.formatter);
    };

    it('shows a quote in the unit as written', () => {
        expect(axisLabel({ unit: "it's", decimals: 2 })(80)).toBe("80.00it's");
    });

    it('caps decimals at 100 and leaves a negative one unrounded', () => {
        expect(() => axisLabel({ unit: 'ms', decimals: 101 })(1.5)).not.toThrow();
        expect(axisLabel({ unit: 'ms', decimals: -1 })(1.25)).toBe('1.25ms');
        expect(axisLabel({ unit: 'ms', decimals: 2 })(43.75)).toBe('43.75ms');
    });

    it('builds the toFixed source only for usable digits', () => {
        expect([legacyToFixedSource(2), legacyToFixedSource('101'), legacyToFixedSource(-1), legacyToFixedSource(0), legacyToFixedSource('abc')]).toEqual([
            '.toFixed(2)',
            '.toFixed(100)',
            '',
            '',
            '',
        ]);
    });
});

describe('upgradeDashboardPanel', () => {
    const legacyLine = (aLabel: object, aExtra: object = {}) => ({
        type: 'Line',
        version: '1.0.0',
        yAxisOptions: [{ type: 'value', label: { name: 'value', key: 'value', title: '', unit: '', decimals: 2, squared: 0, ...aLabel } }],
        xAxisOptions: [{ type: 'time' }],
        commonOptions: { tooltipUnit: '' },
        chartOptions: {},
        ...aExtra,
    });

    it('carries a free-text axis unit and its scale into the unit the current version reads', () => {
        const sPanel = upgradeDashboardPanel(legacyLine({ unit: 'ms' }));
        expect(sPanel.version).toBe('1.0.1');
        expect(sPanel.yAxisOptions[0].unit).toEqual({ suffix: 'ms', sourceScale: 1 });
        expect(upgradeDashboardPanel(legacyLine({ unit: 'K', squared: 3 })).yAxisOptions[0].unit).toEqual({ suffix: 'K', sourceScale: 1000 });
    });

    it('uses a listed unit when one matches', () => {
        expect(upgradeDashboardPanel(legacyLine({ name: 'percent', unit: '%', squared: -2 })).yAxisOptions[0].unit.id).toBe('percent_0_1');
        expect(upgradeDashboardPanel(legacyLine({ name: 'byte', key: 'byte (SI)' })).yAxisOptions[0].unit.id).toBe('bytes_SI');
    });

    it('keeps a unit already chosen and an axis without one', () => {
        const sChosen = { id: 'celsius', label: 'Celsius (°C)', suffix: '°C', sourceScale: 1, outFormat: 'temperature' };
        expect(upgradeDashboardPanel(legacyLine({ unit: 'ms' }, { yAxisOptions: [{ unit: sChosen, label: { unit: 'ms' } }] })).yAxisOptions[0].unit).toEqual(sChosen);
        expect(upgradeDashboardPanel(legacyLine({})).yAxisOptions[0].unit).toBeUndefined();
    });

    it('carries the tooltip, Gauge unit and Gauge decimals', () => {
        const sPanel = upgradeDashboardPanel(legacyLine({}, { type: 'Gauge', commonOptions: { tooltipUnit: 'rpm' }, chartOptions: { unit: 'rpm', gaugeValueLimit: 1, digit: 0 } }));
        expect(sPanel.commonOptions.tooltipUnit).toEqual({ suffix: 'rpm', sourceScale: 1 });
        expect(sPanel.chartOptions.unit).toEqual({ suffix: 'rpm', sourceScale: 1 });
        expect(sPanel.chartOptions.digit).toBe(1);
    });

    it('leaves a current panel as it is', () => {
        const sCurrent = { ...legacyLine({ unit: 'ms' }), version: '1.0.1' };
        expect(upgradeDashboardPanel(sCurrent)).toEqual(sCurrent);
    });
});

describe('board files that are not dashboards', () => {
    it.each(['[]', '{}', '[1,2]', '{"foo":1}', '{"dashboard":null}', '{"dashboard":"x"}', '{"dashboard":[]}', '{"dashboard":{"panels":{}}}'])('refuses %s', (aText) => {
        expect(dashboardShapeError(JSON.parse(aText))).toEqual(expect.any(String));
        expect(() => CheckDataCompatibility(aText, 'dsh')).toThrow('Not a dashboard file');
    });

    it('still opens a dashboard that is only missing keys', () => {
        expect(CheckDataCompatibility('{"dashboard":{}}', 'dsh').dashboard.panels).toEqual([]);
    });
});

describe('time ranges', () => {
    it('leaves a range ending at now+N to be applied', () => {
        expect(isTimeRangeOutOfOrder('now-1h', 'now+1h')).toBe(false);
        expect(isTimeRangeOutOfOrder('now-30m', 'now+1h')).toBe(false);
        expect(isTimeRangeOutOfOrder('now', 'now-1h')).toBe(true);
    });

    it('refuses a reversed panel range the way the board dialog does', () => {
        const sRange = (start: string, end: string) => ({ useCustomTime: true, timeRange: { start, end } });
        expect(getPanelTimeRangeValidationMessage(sRange('2026-01-01 12:00:00', '2026-01-01 06:00:00'))).toBe('The start time must be earlier than the end time.');
        expect(getPanelTimeRangeValidationMessage(sRange('2026-01-01 06:00:00', '2026-01-01 12:00:00'))).toBe('');
        expect(getPanelTimeRangeValidationMessage({ ...sRange('2026-01-01 12:00:00', '2026-01-01 06:00:00'), useCustomTime: false })).toBe('');
    });
});

describe('zero-width panels and share links', () => {
    it('computes a finite interval for a panel with no width', () => {
        const sInterval = calcInterval(0, 3_600_000, 0);
        expect(Number.isFinite(sInterval.IntervalValue)).toBe(true);
        expect(calcInterval(0, 3_600_000, -5)).toEqual(sInterval);
    });

    it('encodes a board name for a link', () => {
        expect(toDshUrlPath('/TEST/d#1.dsh')).toBe('/TEST/d%231.dsh');
        expect(toDshUrlPath('TEST/v1.2')).toBe('/TEST/v1.2.dsh');
    });
});

// #1565: a panel the editor creates is in the current format, so its default free-text units are not
// migrated as if it had been saved before 1.0.1.
describe('new panels', () => {
    const newPanel = (aType: string, aChartType: string) => ({ ...structuredClone(DefaultChartOption), type: aType, chartOptions: structuredClone(getDefaultSeriesOption(aChartType as any)) });

    it('start in the current version', () => {
        expect(DefaultChartOption.version).toBe('1.0.1');
    });

    it('keep the Liquid fill default unit as it was before 1.0.1 migration existed', () => {
        expect(upgradeDashboardPanel(newPanel('Liquid fill', 'liquidFill')).chartOptions.unit).toBe('%');
    });

    it('still migrate a panel saved without a version', () => {
        const sLegacy: Record<string, unknown> = newPanel('Liquid fill', 'liquidFill');
        delete sLegacy.version;
        expect(upgradeDashboardPanel(sLegacy).chartOptions.unit).toMatchObject({ suffix: '%' });
    });
});

