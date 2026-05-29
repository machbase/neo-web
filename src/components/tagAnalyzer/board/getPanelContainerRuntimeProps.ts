import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import type { BoardPanelRecord } from './BoardPanelState';
import type { PanelRangeRefreshOptions } from '../panel/PanelDataRuntimeState';

type PanelContainerRuntimePropsGetterDependencies = {
    panelInfo: PanelInfo;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    refreshVisibleRange: RefreshVisibleRange;
};
type RefreshVisibleRange = (
    panelInfo: PanelInfo,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    options?: PanelRangeRefreshOptions,
) => Promise<void>;

export function getPanelContainerRuntimeProps({
    panelInfo,
    getBoardPanelRecord,
    refreshVisibleRange,
}: PanelContainerRuntimePropsGetterDependencies) {
    const sPanelKey = panelInfo.data.index_key;
    const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);

    return {
        rangeState: sBoardPanelRecord.rangeState,
        chartAreaWidth: sBoardPanelRecord.chartAreaWidth,
        dataRefreshVersion: sBoardPanelRecord.dataRefreshVersion,
        dataRefreshPolicy: sBoardPanelRecord.dataRefreshPolicy,
        onRangeStateChange: (
            rangeState: PanelRangeState,
            options?: PanelRangeRefreshOptions,
        ): void => {
            void refreshVisibleRange(
                panelInfo,
                rangeState.panelRange,
                rangeState.navigatorRange,
                options,
            );
        },
    };
}
