import { useCallback, useMemo } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import { PanelOverlayMode } from '../domain/panel/PanelActions';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import type { PanelSeriesRollupStatus } from '../fetch/panelData/PanelDataFetchTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    PanelActionKey,
    type PanelHeaderRuntimeState,
} from './PanelHeader';

type PanelTitleConfig = {
    title: string;
};

type UsePanelHeaderInteractionParams<TPanelInfo extends PanelTitleConfig> = {
    panelInfo: TPanelInfo;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    resolvedIntervalOption: IntervalOption | undefined;
    resolvedNumericInterval: number | undefined;
    seriesRollupStatusList: PanelSeriesRollupStatus[];
    canSaveLocal: boolean;
    isNumericXAxis: boolean;
    overlayMode: PanelOverlayMode;
    isEditing: boolean;
    isRaw: boolean;
    isOverlapSelected: boolean;
    onToggleRaw: () => void;
    onApplyPanelInfo: (panelInfo: TPanelInfo) => void;
    onSetGlobalTimeRange: (globalTimeRange: GlobalTimeRangeState) => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onExpandFullRange: () => void;
    onPanelInteractionAction: (actionKey: PanelActionKey) => void;
};

type UsePanelHeaderInteractionResult = {
    runtimeState: PanelHeaderRuntimeState;
    handleAction: (actionKey: PanelActionKey) => void;
    renameTitle: (title: string) => void;
};

export function usePanelHeaderInteraction<TPanelInfo extends PanelTitleConfig>({
    panelInfo,
    panelRange,
    navigatorRange,
    resolvedIntervalOption,
    resolvedNumericInterval,
    seriesRollupStatusList,
    canSaveLocal,
    isNumericXAxis,
    overlayMode,
    isEditing,
    isRaw,
    isOverlapSelected,
    onToggleRaw,
    onApplyPanelInfo,
    onSetGlobalTimeRange,
    onRefreshData,
    onRefreshTime,
    onExpandFullRange,
    onPanelInteractionAction,
}: UsePanelHeaderInteractionParams<TPanelInfo>): UsePanelHeaderInteractionResult {
    const sResolvedIntervalOption = hasResolvedIntervalOption(resolvedIntervalOption)
        ? resolvedIntervalOption
        : undefined;

    const runtimeState = useMemo<PanelHeaderRuntimeState>(() => ({
        title: panelInfo.title,
        panelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        resolvedNumericInterval,
        seriesRollupStatusList,
        canSetGlobalTime: !isNumericXAxis && sResolvedIntervalOption !== undefined,
        canSaveLocal,
        isNumericXAxis,
        overlayMode,
        isEditing,
        isRaw,
        isOverlapSelected,
    }), [
        canSaveLocal,
        isEditing,
        isNumericXAxis,
        isOverlapSelected,
        isRaw,
        overlayMode,
        panelInfo.title,
        panelRange,
        resolvedNumericInterval,
        seriesRollupStatusList,
        sResolvedIntervalOption,
    ]);

    const setGlobalTimeRange = useCallback(() => {
        if (!sResolvedIntervalOption) {
            throw new Error('Cannot set global time without a resolved interval.');
        }

        onSetGlobalTimeRange({
            panelRange,
            navigatorRange,
            interval: sResolvedIntervalOption,
        });
    }, [
        navigatorRange,
        onSetGlobalTimeRange,
        panelRange,
        sResolvedIntervalOption,
    ]);

    const renameTitle = useCallback((title: string): void => {
        const sNextTitle = title.trim();

        if (sNextTitle.length === 0 || sNextTitle === panelInfo.title) {
            return;
        }

        onApplyPanelInfo({
            ...panelInfo,
            title: sNextTitle,
        });
    }, [onApplyPanelInfo, panelInfo]);

    const handleAction = useCallback((actionKey: PanelActionKey): void => {
        switch (actionKey) {
            case PanelActionKey.TOGGLE_RAW:
                onToggleRaw();
                return;

            case PanelActionKey.SET_GLOBAL_TIME:
                setGlobalTimeRange();
                return;

            case PanelActionKey.REFRESH_DATA:
                onRefreshData();
                return;

            case PanelActionKey.REFRESH_TIME:
                onRefreshTime();
                return;

            case PanelActionKey.EXPAND_FULL_RANGE:
                onExpandFullRange();
                return;

            case PanelActionKey.TOGGLE_HIGHLIGHT:
            case PanelActionKey.TOGGLE_ANNOTATION:
            case PanelActionKey.TOGGLE_DRAG_SELECT:
            case PanelActionKey.TOGGLE_EDIT:
            case PanelActionKey.OPEN_EXPORT_CSV:
            case PanelActionKey.OPEN_DELETE_CONFIRM:
                onPanelInteractionAction(actionKey);
                return;
        }
    }, [
        onExpandFullRange,
        onPanelInteractionAction,
        onRefreshData,
        onRefreshTime,
        onToggleRaw,
        setGlobalTimeRange,
    ]);

    return {
        runtimeState,
        handleAction,
        renameTitle,
    };
}
