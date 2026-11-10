import { appChartTheme, APP_CHART_LINE, DARK_APP_CHART } from './appChartTheme';

describe('appChartTheme', () => {
    test('with no theme loaded it is the dark panel\'s look', () => {
        expect(appChartTheme()).toEqual(DARK_APP_CHART);
    });

    // jsdom cannot compute a color-mix(): both sides falling back to one colour is what keeps the dark screen's line
    test('the chart line mixes two colours that both fall back to the dark screen\'s line', () => {
        expect(APP_CHART_LINE.match(/var\(--neo-[a-z-]+, #323333\)/g)).toHaveLength(2);
    });
});
