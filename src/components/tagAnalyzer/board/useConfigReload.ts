import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
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
    resolvePanelRangeState: (
        panelInfo: PanelInfo,
    ) => Promise<PanelRangeState | undefined>;
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
    resolvePanelRangeState,
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

        void (async () => {
            const sResolvedRangeState = await resolvePanelRangeState(nextPanelInfo);

            if (!sResolvedRangeState) {
                return;
            }

            applyPanelRangeState(nextPanelInfo, {
                ...sResolvedRangeState,
                reloadData: true,
            });
        })();
    }

    return {
        reloadAfterRawModeChange,
        reloadAfterEditorSave,
    };
}
