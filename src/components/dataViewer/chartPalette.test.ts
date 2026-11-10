import { resolveDataViewerChartPalette } from './chartPalette';
import { DATA_VIEWER_CHART_PALETTE } from './dataViewerModel';

describe('resolveDataViewerChartPalette', () => {
    test('with no theme loaded it is the dark panel\'s palette', () => {
        expect(resolveDataViewerChartPalette()).toEqual(DATA_VIEWER_CHART_PALETTE);
    });
});
