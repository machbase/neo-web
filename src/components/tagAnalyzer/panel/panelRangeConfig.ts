import { seriesDataApi } from '../api/seriesDataApi';
import { getSeriesListAxisKind } from '../seriesModel';
import type { PanelInfo } from './panelModel';
import type { RangeControlConfig } from './rangeControl/rangeControlModel';

export function createPanelRangeConfig(panelInfo: PanelInfo): RangeControlConfig {
    const series = panelInfo.query.tagSet;
    return {
        key: panelInfo.key,
        axisKind: getSeriesListAxisKind(series),
        rangeInput: panelInfo.time.rangeInput,
        navigatorRangeInput: panelInfo.time.navigatorRangeInput,
        restoredRange: panelInfo.time.useLastViewedRange
            ? panelInfo.time.lastViewedRange
            : undefined,
        loadFullRange: () => seriesDataApi.fetchSeriesFullRange(series),
    };
}
