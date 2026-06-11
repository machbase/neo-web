import type { PanelInfo } from '../domain/PanelDomain';
import type { TimeRangeConfig, TimeRangeMs } from '../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    hasValidRangeState,
    type ApplyPanelRangeState,
    type BoardPanelRecord,
} from './BoardPanelState';
import {
    getCoveringNavigatorRange,
    resolveConfiguredPanelRange,
    resolveFullRange,
} from './PanelRangeResolver';

type RefreshRangeDependencies = {
    boardTime: TimeRangeConfig;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyPanelRangeState: ApplyPanelRangeState;
};

type RefreshRangeActions = {
    refreshPanelData: (panelInfo: PanelInfo) => Promise<void>;
    refreshPanelTime: (panelInfo: PanelInfo) => Promise<void>;
    setFullDataRange: (panelInfo: PanelInfo) => Promise<void>;
};

export function useRefreshRange({
    boardTime,
    getBoardPanelRecord,
    applyPanelRangeState,
}: RefreshRangeDependencies): RefreshRangeActions {
    async function setFullDataRange(panelInfo: PanelInfo): Promise<void> {
        const fullDataRange = await resolveFullRange(panelInfo.data.tag_set);

        if (!isConcreteTimeRange(fullDataRange)) {
            throw new Error('Cannot set full data range without a concrete range.');
        }

        applyPanelRangeState(panelInfo, {
            panelRange: fullDataRange,
            navigatorRange: fullDataRange,
            fullRange: fullDataRange,
        });
    }

    async function refreshPanelData(panelInfo: PanelInfo): Promise<void> {
        const rangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;

        if (!hasValidRangeState(rangeState)) {
            await applyConfiguredTimeRange(panelInfo);
            return;
        }

        applyPanelRangeState(panelInfo, {
            panelRange: rangeState.panelRange,
            navigatorRange: rangeState.navigatorRange,
            fullRange: rangeState.fullRange,
            reloadData: true,
        });
    }

    async function refreshPanelTime(panelInfo: PanelInfo): Promise<void> {
        const refreshedRange = await resolveConfiguredPanelRange({
            seriesList: panelInfo.data.tag_set,
            panelTime: panelInfo.time.range_config,
            boardTime,
        });

        await applyConfiguredTimeRange(panelInfo, refreshedRange);
    }

    return {
        refreshPanelData,
        refreshPanelTime,
        setFullDataRange,
    };

    async function applyConfiguredTimeRange(
        panelInfo: PanelInfo,
        refreshedRange?: { panelRange: TimeRangeMs; fullRange: TimeRangeMs },
    ): Promise<void> {
        const range =
            refreshedRange ??
            await resolveConfiguredPanelRange({
                seriesList: panelInfo.data.tag_set,
                panelTime: panelInfo.time.range_config,
                boardTime,
            });

        applyPanelRangeState(panelInfo, {
            panelRange: range.panelRange,
            navigatorRange: getCoveringNavigatorRange(
                range.panelRange,
                range.fullRange,
            ),
            fullRange: range.fullRange,
        });
    }
}
