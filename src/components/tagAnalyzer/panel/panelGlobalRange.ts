import type { AxisKind, RangeState } from '../range/rangeModel';
import { getSeriesListAxisKind } from '../seriesModel';
import type { PanelInfo } from './panelModel';

type SetGlobalTimeRequest = {
    axisKind: AxisKind;
    range: RangeState;
};

export function resolveSetGlobalTimeRequest(
    panelInfo: Pick<PanelInfo, 'mode' | 'query'>,
    isChartReady: boolean,
    renderRange: RangeState | undefined,
): SetGlobalTimeRequest | undefined {
    if (!isChartReady || !renderRange) return undefined;

    const sAxisKind = getSeriesListAxisKind(panelInfo.query.tagSet);
    if (!sAxisKind || (panelInfo.mode.isRaw && sAxisKind !== 'numeric')) {
        return undefined;
    }

    return { axisKind: sAxisKind, range: renderRange };
}
