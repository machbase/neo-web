import type { PanelInfo } from '../domain/PanelDomain';
import type { TimeRangeConfig } from '../domain/time/model/TimeTypes';
import {
    hasValidRangeState,
    type ApplyPanelRangeState,
    type BoardPanelRecord,
} from './BoardPanelState';
import { showPanelFullRangeUnavailableToast } from './PanelRangeFeedback';
import {
    getFullRangeFromSeries,
    resolveConcretePanelRangeState,
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
        const fullRange = await getFullRangeFromSeries(panelInfo.data.tag_set);

        if (!fullRange) {
            showPanelFullRangeUnavailableToast();
            return;
        }

        applyPanelRangeState(panelInfo, {
            panelRange: fullRange,
            navigatorRange: fullRange,
            fullRange,
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
        await applyConfiguredTimeRange(panelInfo, true);
    }

    return {
        refreshPanelData,
        refreshPanelTime,
        setFullDataRange,
    };

    async function applyConfiguredTimeRange(
        panelInfo: PanelInfo,
        useInitialWindowOnFullDataFallback = false,
    ): Promise<void> {
        const fullRange = await getFullRangeFromSeries(panelInfo.data.tag_set);

        if (!fullRange) {
            showPanelFullRangeUnavailableToast();
            return;
        }

        const rangeState = resolveConcretePanelRangeState({
            fullRange,
            rangeConfig: panelInfo.time.range_config,
            lastViewedRange: undefined,
            boardTime,
            applyInitialMainChartWindow: useInitialWindowOnFullDataFallback,
        });

        applyPanelRangeState(panelInfo, {
            panelRange: rangeState.panelRange,
            navigatorRange: rangeState.navigatorRange,
            fullRange: rangeState.fullRange,
        });
    }
}
