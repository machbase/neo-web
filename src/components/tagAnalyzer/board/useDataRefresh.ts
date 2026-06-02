import type { PanelInfo } from '../domain/PanelDomain';
import type {
    BoardPanelRecord,
    PanelRangeRefreshOptions,
} from './BoardPanelState';
import { hasConcretePanelRangeState } from './BoardPanelState';

type DataRefreshDependencies = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    refreshFullRange: (panelInfo: PanelInfo) => Promise<void>;
    refreshCurrentRange: (
        panelInfo: PanelInfo,
        options?: PanelRangeRefreshOptions,
    ) => Promise<void>;
};

export function useDataRefresh({
    getBoardPanelRecord,
    refreshFullRange,
    refreshCurrentRange,
}: DataRefreshDependencies) {
    async function refreshDataRange(panelInfo: PanelInfo): Promise<void> {
        const rangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;

        if (!hasConcretePanelRangeState(rangeState)) {
            await refreshFullRange(panelInfo);
            return;
        }

        await refreshCurrentRange(panelInfo, {
            forceReload: true,
            preserveNavigatorRange: true,
            forceRawMainSampling: true,
        });
    }

    return {
        refreshDataRange,
    };
}
