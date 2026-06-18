import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeConfig } from '../domain/time/model/TimeTypes';
import {
    hasValidRangeState,
    type BoardPanelRecord,
    type RequestPanelDataRefresh,
} from './BoardPanelState';
import { showPanelFullRangeUnavailableToast } from './PanelRangeFeedback';
import {
    getFullRangeFromSeries,
    resolveConcretePanelRangeState,
} from './PanelRangeResolver';

type RefreshRangeDependencies = {
    boardTime: TimeRangeConfig;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyPanelRangeToPanel: (
        panelInfo: PanelInfo,
        rangeState: PanelRangeState,
    ) => PanelRangeState | undefined;
    requestPanelDataRefresh: RequestPanelDataRefresh;
};

type RefreshRangeActions = {
    refreshPanelData: (panelInfo: PanelInfo) => Promise<void>;
    refreshPanelTime: (panelInfo: PanelInfo) => Promise<void>;
    setFullDataRange: (panelInfo: PanelInfo) => Promise<void>;
};

export function useRefreshRange({
    boardTime,
    getBoardPanelRecord,
    applyPanelRangeToPanel,
    requestPanelDataRefresh,
}: RefreshRangeDependencies): RefreshRangeActions {
    async function setFullDataRange(panelInfo: PanelInfo): Promise<void> {
        const fullRange = await getFullRangeFromSeries(panelInfo.data.tag_set);

        if (!fullRange) {
            showPanelFullRangeUnavailableToast();
            return;
        }

        applyPanelRangeToPanel(panelInfo, {
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

        requestPanelDataRefresh(panelInfo.data.index_key);
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

        applyPanelRangeToPanel(panelInfo, {
            panelRange: rangeState.panelRange,
            navigatorRange: rangeState.navigatorRange,
            fullRange: rangeState.fullRange,
        });
    }
}
