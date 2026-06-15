import type { PanelInfo } from '../domain/PanelDomain';
import {
    hasValidRangeState,
    type ApplyPanelRangeState,
    type BoardPanelRecord,
} from './BoardPanelState';

export type ReloadAfterEditorSaveOptions = {
    preserveCurrentVisibleRange: boolean;
};

type ConfigReloadDependencies = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyPanelRangeState: ApplyPanelRangeState;
    resolveAndApplyPanelRange: (panelInfo: PanelInfo) => Promise<void>;
    setFullDataRange: (panelInfo: PanelInfo) => Promise<void>;
};

type ConfigReloadActions = {
    reloadAfterRawModeChange: (nextPanelInfo: PanelInfo) => void;
    reloadAfterEditorSave: (
        nextPanelInfo: PanelInfo,
        options: ReloadAfterEditorSaveOptions,
    ) => void;
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

    function reloadAfterEditorSave(
        nextPanelInfo: PanelInfo,
        options: ReloadAfterEditorSaveOptions,
    ): void {
        const sRangeState =
            getBoardPanelRecord(nextPanelInfo.data.index_key).rangeState;

        if (options.preserveCurrentVisibleRange && hasValidRangeState(sRangeState)) {
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
