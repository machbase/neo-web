// #1561: board settings a saved .dsh can carry but the dashboard used without checking.
import { calcRefreshTime, isTimeRangeOutOfOrder } from './dashboardUtil';
import { chartOptionNumber, liquidFillRatioCode } from './chartOptionNumber';
import { DashboardChartOptionParser } from './DashboardChartOptionParser';
import { DashboardChartOptionParser as PublicDashboardChartOptionParser } from '@/public-dashboard/utils/DashboardChartOptionParser';
import { unitFormatter } from './Chart/formatters';
import { DefaultCommonOption, DefaultXAxisOption, DefaultYAxisOption, getDefaultSeriesOption } from './eChartHelper';

// The generated formatter is a function body as text; the chart runtime evaluates it the same way.
const compile = (aSource: string) => new Function(`return (${aSource});`)();

describe('calcRefreshTime', () => {
    it.each([
        ['3 seconds', 3000],
        ['1 minute', 60000],
        ['10 minutes', 600000],
        ['1 hour', 3600000],
        ['7 seconds', 7000],
    ])('reads %s as %i ms', (aValue, aMs) => {
        expect(calcRefreshTime(aValue)).toBe(aMs);
    });

    it.each(['', 'abc', '0 seconds', '0.5 seconds'])('gives no period for %j', (aValue) => {
        expect(calcRefreshTime(aValue)).toBeNull();
    });
});

describe('isTimeRangeOutOfOrder', () => {
    it('flags an absolute range that ends at or before it starts', () => {
        expect(isTimeRangeOutOfOrder(2000, 1000)).toBe(true);
        expect(isTimeRangeOutOfOrder(1000, 1000)).toBe(true);
        expect(isTimeRangeOutOfOrder(1000, 2000)).toBe(false);
    });

    it('compares now-based edges', () => {
        expect(isTimeRangeOutOfOrder('now', 'now-1h')).toBe(true);
        expect(isTimeRangeOutOfOrder('now-3h', 'now')).toBe(false);
    });

    it('leaves alone edges that need the data or are left empty', () => {
        expect(isTimeRangeOutOfOrder('last', 'last-1h')).toBe(false);
        expect(isTimeRangeOutOfOrder('', 'now')).toBe(false);
    });
});

describe('numeric chart options', () => {
    it('falls back for an empty or non-numeric value only', () => {
        expect(chartOptionNumber('', 5)).toBe(5);
        expect(chartOptionNumber('abc', 5)).toBe(5);
        expect(chartOptionNumber('-50', 5)).toBe(-50);
        expect(chartOptionNumber(0, 5)).toBe(0);
    });

    it('writes the Liquid fill ratio with numbers and without dividing by zero', () => {
        const sRatio = (aCode: string, aValue: number) => new Function('sValue', `return ${aCode};`)(aValue);

        expect(liquidFillRatioCode('sValue', 0, 100)).toBe('[ (sValue - 0) / ( 100 -  0) ]');
        expect(sRatio(liquidFillRatioCode('sValue', '', 100), 50)).toEqual([0.5]);
        expect(sRatio(liquidFillRatioCode('sValue', 50, 50), 50)).toEqual([1]);
        expect(sRatio(liquidFillRatioCode('sValue', 50, 50), 49)).toEqual([0]);
    });

    it.each([
        ['editor', DashboardChartOptionParser],
        ['public dashboard', PublicDashboardChartOptionParser],
    ])('opens a Gauge whose Min or Max was cleared on the default (%s)', (_aName, aParse) => {
        const sPanel = {
            type: 'Gauge',
            chartOptions: { ...getDefaultSeriesOption('gauge'), min: '', max: '' },
            commonOptions: { ...DefaultCommonOption, title: 'G' },
            xAxisOptions: [DefaultXAxisOption],
            yAxisOptions: [DefaultYAxisOption],
            blockList: [],
            theme: 'white',
            version: '1.0.1',
        };

        const sOption: any = aParse(sPanel, [], { startTime: 0, endTime: 1 });

        expect(sOption.series[0].min).toBe(0);
        expect(sOption.series[0].max).toBe(100);
    });
});

describe('unitFormatter', () => {
    it('keeps a quote in a free-text unit inside the formatter', () => {
        const sFormat = compile(unitFormatter({ suffix: "it's" } as any, 1).formatter);

        expect(sFormat(12.34)).toBe("12.3 it's");
    });

    it('caps Decimals at what toFixed accepts', () => {
        const sFormat = compile(unitFormatter({ suffix: 'pct' } as any, 101).formatter);

        expect(() => sFormat(1.5)).not.toThrow();
        expect(sFormat(1.5).startsWith('1.5000')).toBe(true);
    });
});
