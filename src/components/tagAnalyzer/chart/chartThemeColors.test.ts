import { recolorTagAnalyzerOption, resolveTagAnalyzerChartColors } from './chartThemeColors';

describe('recolorTagAnalyzerOption', () => {
    test('with no theme the colours are the literals and the option comes back as it is', () => {
        const colors = resolveTagAnalyzerChartColors();
        expect(colors.get('#252525')).toBe('#252525');
        const option = { backgroundColor: '#252525' };
        expect(recolorTagAnalyzerOption(option, colors)).toBe(option);
    });

    test('swaps the literals, leaves series data and the input alone, and recolours tooltip html', () => {
        const colors = new Map([['#252525', '#f0f2fb'], ['#afb5bc', '#30335c'], ['#323333', 'rgba(46, 51, 104, 0.24)']]);
        const shared = { lineStyle: { color: '#323333' } };
        const data = [[1, 2], [3, '#252525']];
        const option = {
            backgroundColor: '#252525',
            xAxis: [{ axisLine: shared, axisLabel: { color: '#afb5bc' } }],
            series: [{ data, lineStyle: { color: '#5470c6' } }],
            tooltip: { formatter: () => '<div style="color:#afb5bc">t</div>' },
        };
        const out = recolorTagAnalyzerOption(option, colors);
        expect(out.backgroundColor).toBe('#f0f2fb');
        expect(out.xAxis[0].axisLine.lineStyle.color).toBe('rgba(46, 51, 104, 0.24)');
        expect(out.xAxis[0].axisLabel.color).toBe('#30335c');
        expect(out.series[0].data).toBe(data);
        expect(out.series[0].lineStyle.color).toBe('#5470c6');
        expect((out.tooltip.formatter as () => string)()).toBe('<div style="color:#30335c">t</div>');
        expect(shared.lineStyle.color).toBe('#323333');
        expect(option.backgroundColor).toBe('#252525');
    });
});
