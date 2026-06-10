import type { PanelInfo } from '../domain/PanelDomain';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    hasValidRangeState,
    type ApplyPanelRangeState,
    type BoardPanelRecord,
} from './BoardPanelState';

type ConfigReloadDependencies = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyPanelRangeState: ApplyPanelRangeState;
    resolveAndApplyPanelRange: (panelInfo: PanelInfo) => Promise<void>;
    setFullDataRange: (panelInfo: PanelInfo) => Promise<void>;
};

type ConfigReloadActions = {
    reloadAfterRawModeChange: (nextPanelInfo: PanelInfo) => void;
    reloadAfterEditorSave: (nextPanelInfo: PanelInfo) => void;
};

export function useConfigReload({
    getBoardPanelRecord,
    applyPanelRangeState,
    resolveAndApplyPanelRange,
    setFullDataRange,
}: ConfigReloadDependencies): ConfigReloadActions {
    function reloadAfterRawModeChange(nextPanelInfo: PanelInfo): void {
        const sRangeState =
            getBoardPanelRecord(nextPanelInfo.data.index_key).rangeState;

        if (!hasValidRangeState(sRangeState)) {
            void setFullDataRange(nextPanelInfo);
            return;
        }

        applyPanelRangeState(nextPanelInfo, {
            panelRange: sRangeState.panelRange,
            navigatorRange: sRangeState.navigatorRange,
            fullRange: sRangeState.fullRange,
            reloadData: true,
        });
    }

    function reloadAfterEditorSave(nextPanelInfo: PanelInfo): void {
        const sRangeState =
            getBoardPanelRecord(nextPanelInfo.data.index_key).rangeState;
        const sLastViewedRange = nextPanelInfo.general.last_viewed_range;
        const sShouldPreserveLiveRange =
            nextPanelInfo.general.use_last_viewed_range &&
            isConcreteTimeRange(sLastViewedRange?.panelRange) &&
            isConcreteTimeRange(sLastViewedRange?.navigatorRange) &&
            hasValidRangeState(sRangeState);

        if (sShouldPreserveLiveRange) {
            applyPanelRangeState(nextPanelInfo, {
                panelRange: sRangeState.panelRange,
                navigatorRange: sRangeState.navigatorRange,
                fullRange: sRangeState.fullRange,
                reloadData: true,
            });
            return;
        }

        void resolveAndApplyPanelRange(nextPanelInfo);
    }

    return {
        reloadAfterRawModeChange,
        reloadAfterEditorSave,
    };
}
