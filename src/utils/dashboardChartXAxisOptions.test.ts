import { DashboardChartOptionParser } from './DashboardChartOptionParser';
import { DefaultCommonOption, DefaultXAxisOption, DefaultYAxisOption, getDefaultSeriesOption } from './eChartHelper';
import { findUnitById } from './Chart/AxisConstants';

// A distance (numeric base) panel draws a *value* x-axis, so the unit / decimals / min / max the
// panel editor offers for it have to reach the chart. Adv scatter used to be the only chart with a
// value x-axis, and everything else had those options stripped — which silently included distance.
// jsdom here has no structuredClone; these are plain option objects, so JSON is enough.
const clone = (aValue: any) => JSON.parse(JSON.stringify(aValue));

const buildPanel = (aOverrides: any = {}) => ({
    type: 'Line',
    version: '1.0.2',
    chartOptions: getDefaultSeriesOption('line' as any),
    commonOptions: clone(DefaultCommonOption),
    xAxisOptions: [clone(DefaultXAxisOption)],
    yAxisOptions: [clone(DefaultYAxisOption)],
    axisInterval: { IntervalType: '', IntervalValue: '' },
    blockList: [{ id: 'b1', type: 'tag', table: 'DIST_TAG', tag: 'SENSOR_06', time: 'ODOMETER_M', value: 'VALUE', aggregator: 'avg' }],
    ...aOverrides,
});

// timeBaseTime + a non-DATETIME type is what `isNumericBaseTimeBlock` reads as "distance".
const distanceBlock = (aExtra: any = {}) => ({
    id: 'b1',
    type: 'tag',
    table: 'DIST_TAG',
    tag: 'SENSOR_06',
    time: 'ODOMETER_M',
    value: 'VALUE',
    aggregator: 'avg',
    timeBaseTime: true,
    timeType: 8,
    ...aExtra,
});

const TAGS = [{ name: 'SENSOR_06(avg)' }];
const WINDOW = { startTime: 0, endTime: 999990 };

describe('distance panels keep their value x-axis options', () => {
    test('unit and decimals become an axis label formatter', () => {
        const sPanel = buildPanel({
            blockList: [distanceBlock()],
            xAxisOptions: [{ ...clone(DefaultXAxisOption), unit: findUnitById('SI_short'), label: { name: 'value', key: 'value', decimals: 1 } }],
        });
        const sOption: any = DashboardChartOptionParser(sPanel, TAGS, WINDOW);
        expect(sOption.xAxis[0].type).toBe('value');
        // The option object is JSON round-tripped, so a tick formatter travels as its own source and
        // is revived by the chart — exactly as the y-axis one does.
        expect(String(sOption.xAxis[0].axisLabel?.formatter)).toMatch(/^function/);
        expect(String(sOption.xAxis[0].axisLabel?.formatter)).toContain('const decimals = 1');
    });

    test('a time panel still has them stripped', () => {
        const sPanel = buildPanel({
            xAxisOptions: [{ ...clone(DefaultXAxisOption), unit: findUnitById('SI_short'), label: { name: 'value', key: 'value', decimals: 1 } }],
        });
        const sOption: any = DashboardChartOptionParser(sPanel, TAGS, WINDOW);
        expect(sOption.xAxis[0].type).toBe('time');
        expect(sOption.xAxis[0].axisLabel?.formatter).toBeUndefined();
    });

    test('an explicit Min/Max wins over the queried window, as numbers', () => {
        const sPanel = buildPanel({
            blockList: [distanceBlock()],
            xAxisOptions: [{ ...clone(DefaultXAxisOption), useMinMax: true, min: '400000', max: '600000' }],
        });
        const sOption: any = DashboardChartOptionParser(sPanel, TAGS, WINDOW);
        expect(sOption.xAxis[0].min).toBe(400000);
        expect(sOption.xAxis[0].max).toBe(600000);
    });

    test('without an explicit Min/Max the axis is the queried window', () => {
        const sPanel = buildPanel({ blockList: [distanceBlock()] });
        const sOption: any = DashboardChartOptionParser(sPanel, TAGS, WINDOW);
        expect(sOption.xAxis[0].min).toBe(WINDOW.startTime);
        expect(sOption.xAxis[0].max).toBe(WINDOW.endTime);
    });

    test('a Min/Max that is not a number is dropped rather than passed on', () => {
        const sPanel = buildPanel({
            blockList: [distanceBlock()],
            xAxisOptions: [{ ...clone(DefaultXAxisOption), useMinMax: true, min: 'abc', max: '' }],
        });
        const sOption: any = DashboardChartOptionParser(sPanel, TAGS, WINDOW);
        expect(sOption.xAxis[0].min).toBe(WINDOW.startTime);
        expect(sOption.xAxis[0].max).toBe(WINDOW.endTime);
    });
});
