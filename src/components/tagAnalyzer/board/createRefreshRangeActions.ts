import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeConfig } from '../domain/time/model/TimeTypes';
import {
    hasValidRangeState,
    type BoardPanelRecord,
    type RequestPanelDataRefresh,
} from './BoardPanelState';
import {
    fetchFullRangeOrWarn,
    resolvePanelRangeStateForSeries,
} from './PanelRangeResolver';

type RefreshRangeDependencies = {
    boardTime: TimeRangeConfig;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    getPanelInfo: (panelKey: string) => PanelInfo | undefined;
    applyPanelRangeToPanel: (
        panelInfo: PanelInfo,
        rangeState: PanelRangeState,
    ) => PanelRangeState | undefined;
    requestPanelDataRefresh: RequestPanelDataRefresh;
};

type RefreshRangeActions = {
    refreshPanelData: (panelKey: string) => Promise<void>;
    refreshPanelTime: (panelKey: string) => Promise<void>;
    setFullDataRange: (panelKey: string) => Promise<void>;
};

export function createRefreshRangeActions({
    boardTime,
    getBoardPanelRecord,
    getPanelInfo,
    applyPanelRangeToPanel,
    requestPanelDataRefresh,
}: RefreshRangeDependencies): RefreshRangeActions {
    async function setFullDataRange(panelKey: string): Promise<void> {
        const panelInfo = getPanelInfo(panelKey);

        if (!panelInfo) {
            return;
        }

        const fullRange = await fetchFullRangeOrWarn(panelInfo.query.tagSet);

        if (!fullRange) {
            return;
        }

        applyPanelRangeToPanel(panelInfo, {
            requestPanelRange: fullRange,
            requestNavigatorRange: fullRange,
            fullRange,
        });
    }

    async function refreshPanelData(panelKey: string): Promise<void> {
        const rangeState = getBoardPanelRecord(panelKey).rangeState;

        if (!hasValidRangeState(rangeState)) {
            await applyConfiguredTimeRange(panelKey, false);
            return;
        }

        requestPanelDataRefresh(panelKey);
    }

    async function refreshPanelTime(panelKey: string): Promise<void> {
        await applyConfiguredTimeRange(panelKey, true);
    }

    return {
        refreshPanelData,
        refreshPanelTime,
        setFullDataRange,
    };

    async function applyConfiguredTimeRange(
        panelKey: string,
        applyInitialMainChartWindow: boolean,
    ): Promise<void> {
        const panelInfo = getPanelInfo(panelKey);

        if (!panelInfo) {
            return;
        }

        const rangeState = await resolvePanelRangeStateForSeries({
            panelInfo,
            boardTime,
            useLastViewedRange: false,
            applyInitialMainChartWindow,
        });

        if (!rangeState) {
            return;
        }

        applyPanelRangeToPanel(panelInfo, rangeState);
    }
}