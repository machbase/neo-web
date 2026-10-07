import { DashboardChartOptionParser } from './DashboardChartOptionParser';
import { DashboardQueryParser } from './DashboardQueryParser';
import { DashboardQueryParser as PublicDashboardQueryParser } from '../public-dashboard/utils/DashboardQueryParser';
import { DefaultCommonOption, DefaultXAxisOption, DefaultYAxisOption, getDefaultSeriesOption } from './eChartHelper';
import { isNumericBaseTimeBlock } from './timeFieldColumns';

// Switching a block to typing leaves the selecting-mode table behind on it (`time`, `timeBaseTime`,
// `timeType`). A distance table left there used to hand the typed query a value x-axis it never
// asked for — the axis ran over the distance window and the tooltip labelled it with the leftover
// base column ('ODOMETER_M'). See machbase/neo#1494.
const clone = (aValue: any) => JSON.parse(JSON.stringify(aValue));

const TYPED_SQL = "select time, value as 'series(0)' from _neo_statz where name = 'ps:cpu_percent'";

const typingBlockLeftOnDistanceTable = (aExtra: any = {}) => ({
    id: 'b1',
    type: 'tag',
    table: 'DIST_TAG',
    tag: 'SENSOR_06',
    time: 'ODOMETER_M',
    value: 'VALUE',
    aggregator: 'avg',
    alias: '',
    color: '#367FEB',
    isVisible: true,
    useCustom: false,
    filter: [],
    values: [],
    // what `repairDashboardBlockForTableColumns` persists for a non-DATETIME BASETIME column
    timeBaseTime: true,
    timeType: 8,
    customFullTyping: { use: true, text: TYPED_SQL, dirty: true },
    ...aExtra,
});

const selectingBlockOnDistanceTable = () => typingBlockLeftOnDistanceTable({ customFullTyping: { use: false, text: '', dirty: false } });

const buildPanel = (aBlock: any, aType = 'Line') => ({
    type: aType,
    version: '1.0.2',
    chartOptions: getDefaultSeriesOption('line' as any),
    commonOptions: clone(DefaultCommonOption),
    xAxisOptions: [clone(DefaultXAxisOption)],
    yAxisOptions: [clone(DefaultYAxisOption)],
    axisInterval: { IntervalType: '', IntervalValue: '' },
    blockList: [aBlock],
});

const TIME = { interval: { IntervalType: 'sec', IntervalValue: 10 }, start: 1700000000000, end: 1700003600000 };

const parseQueries = (aParser: any, aBlock: any, aChartType = 'line', aXAxis: any = [clone(DefaultXAxisOption)]) => {
    const [sQueryList]: any = aParser(aChartType, 'TIME_VALUE', [aBlock], [], [], aXAxis, TIME);
    return sQueryList;
};

describe('a typed block is on a time axis, not the base column of the table it was typed from', () => {
    test('isNumericBaseTimeBlock ignores the leftover distance columns, in both block shapes', () => {
        expect(isNumericBaseTimeBlock(typingBlockLeftOnDistanceTable())).toBe(false);
        // the parsed query block carries the flag under a different name
        expect(isNumericBaseTimeBlock({ time: 'ODOMETER_M', timeBaseTime: true, timeType: 8, useFullTyping: true })).toBe(false);
    });

    test('the same block in selecting mode still resolves as distance', () => {
        expect(isNumericBaseTimeBlock(selectingBlockOnDistanceTable())).toBe(true);
    });

    test('the chart draws a time axis and the tooltip drops the leftover base column name', () => {
        const sOption: any = DashboardChartOptionParser(buildPanel(typingBlockLeftOnDistanceTable()), [{ name: 'series(0)' }], { startTime: 0, endTime: 1 });
        expect(sOption.xAxis[0].type).toBe('time');
        expect(String(sOption.tooltip.formatter)).not.toContain('ODOMETER_M');
    });

    test('a selecting-mode distance panel keeps its value axis', () => {
        const sOption: any = DashboardChartOptionParser(buildPanel(selectingBlockOnDistanceTable()), [{ name: 'SENSOR_06(avg)' }], { startTime: 0, endTime: 1 });
        expect(sOption.xAxis[0].type).toBe('value');
    });
});

describe('a typed query asks the JSON sink for milliseconds', () => {
    // The chart plots the first column as ms. Selecting mode divides it down in SQL; a typed query
    // hands its DATETIME column over untouched, and the sink defaults to nanoseconds.
    test.each([
        ['canonical', DashboardQueryParser],
        ['public-dashboard mirror', PublicDashboardQueryParser],
    ])('%s', (_aName: string, aParser: any) => {
        const sQueries = parseQueries(aParser, typingBlockLeftOnDistanceTable());
        expect(sQueries[0].query).toBe(`SQL("${TYPED_SQL}")\nJSON(timeformat('ms'))`);
    });

    test('a selecting-mode query is unchanged — its time column is already a number', () => {
        const sQueries = parseQueries(DashboardQueryParser, selectingBlockOnDistanceTable());
        expect(sQueries[0].query).toContain('JSON()');
        expect(sQueries[0].query).not.toContain('timeformat');
    });
});

describe('adv scatter rewraps a typed block without corrupting the pipeline', () => {
    const sXAxis = [{ ...clone(DefaultXAxisOption), useBlockList: [0] }];

    test.each([
        ['canonical', DashboardQueryParser],
        ['public-dashboard mirror', PublicDashboardQueryParser],
    ])('%s', (_aName: string, aParser: any) => {
        const sQueries = parseQueries(aParser, typingBlockLeftOnDistanceTable(), 'advScatter', sXAxis);
        // A typed block has no `tql` at all; the emptiness check used to read `undefined !== ''`
        // and splice the literal string "undefined" between the SQL and the script.
        expect(sQueries[0].query).not.toContain('\nundefined');
        expect(sQueries[0].query).toContain("JSON(timeformat('ms'))");
        // the x-axis rows are joined to the series rows by their first column, so the fetch the
        // injected script makes has to be on the same scale
        expect(sQueries[0].query).toContain("JSON(timeformat('ms'), cache(");
    });
});
