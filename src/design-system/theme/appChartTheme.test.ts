import { appChartTheme, DARK_APP_CHART } from './appChartTheme';

describe('appChartTheme', () => {
    test('with no theme loaded it is the dark panel\'s look', () => {
        expect(appChartTheme()).toEqual(DARK_APP_CHART);
    });
});
