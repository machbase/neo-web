import { useReducer, useRef } from 'react';
import type { GlobalTimeRangeState } from '../../domain/BoardDomain';
import {
    getPanelConfigFromRuntimePanel,
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelInfo,
} from '../../domain/panel/PanelConfig';
import { hasNumericBaseTimeSeries } from '../../domain/SeriesDomain';
import type { TimeRangeInput } from '../../domain/time/TimeTypes';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import {
    hasConcretePanelRangeState,
    resolvePanelRangeApplyResult,
    type PanelRangeChangeOptions,
} from '../../domain/panelRange/PanelRangeApply';
import { isEmptyPanelRangeInput } from '../../domain/panelRange/PanelRangeInput';
import { resolveDefaultNavigatorRangeResolution } from '../../domain/panelRange/PanelRangeResolver';
import {
    clampTimeRangeToBounds,
} from '../../domain/time/TimeRangeUtils';
import { assertPanelKey } from '../runtimeBoardPanels';
import {
    fetchRequiredFullRange,
    isRequiredFullRangeError,
    resolvePanelRangeStateForSeries,
} from './PanelFullRangeFetcher';

type BoardPanelRuntimeRecord = {
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
};

const INITIAL_PANEL_RUNTIME_RECORD: BoardPanelRuntimeRecord = {
    chartAreaWidth: undefined,
    dataRefreshVersion: 0,
};

export function useTagAnalyzerBoardPanels({
    panels,
    boardTime,
    globalTimeRange,
    isActiveTab,
    rollupTableList,
    onPanelRangeStateChange,
    onAppliedRange,
}: {
    panels: RuntimePanelInfo[];
    boardTime: TimeRangeInput;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
    rollupTableList: RollupTableMap;
    onPanelRangeStateChange: (
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ) => void;
    onAppliedRange: (
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ) => void;
}) {
    const initializedPanelKeysRef = useRef<Record<string, true>>({});
    const initializingPanelKeysRef = useRef<Record<string, true>>({});
    const boardPanelRecordsRef = useRef<Record<string, BoardPanelRuntimeRecord>>({});
    const [, forceRender] = useReducer((version: number) => version + 1, 0);

    function getPanelRuntimeRecord(panelKey: string): BoardPanelRuntimeRecord {
        assertPanelKey(panelKey);
        return boardPanelRecordsRef.current[panelKey] ?? INITIAL_PANEL_RUNTIME_RECORD;
    }

    function updatePanelRecord(
        panelKey: string,
        updater: (record: BoardPanelRuntimeRecord) => BoardPanelRuntimeRecord,
    ): void {
        assertPanelKey(panelKey);
        boardPanelRecordsRef.current = {
            ...boardPanelRecordsRef.current,
            [panelKey]: updater(getPanelRuntimeRecord(panelKey)),
        };
        forceRender();
    }

    function setChartAreaWidth(
        panelKey: string,
        chartAreaWidth: number | undefined,
    ): void {
        if (getPanelRuntimeRecord(panelKey).chartAreaWidth === chartAreaWidth) {
            return;
        }

        updatePanelRecord(panelKey, (record) => ({
            ...record,
            chartAreaWidth,
        }));
    }

    function requestDataRefresh(panelKey: string): void {
        updatePanelRecord(panelKey, (record) => ({
            ...record,
            dataRefreshVersion: record.dataRefreshVersion + 1,
        }));
    }

    function applyRangeToPanel(
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ): void {
        const sApplyResult = resolvePanelRangeApplyResult(
            {
                ...getPanelRuntimeRecord(panelInfo.key),
                rangeState: panelInfo.time.runtimeRange,
            },
            {
                rangeState,
                navigatorSelectionCenterRatio:
                    options?.navigatorSelectionCenterRatio,
            },
        );

        if (!sApplyResult.didChange) {
            return;
        }

        onPanelRangeStateChange(panelInfo, sApplyResult.resolvedRangeState);
        onAppliedRange(panelInfo, sApplyResult.resolvedRangeState);
    }

    function getPanelInfoOrThrow(panelKey: string): RuntimePanelInfo {
        assertPanelKey(panelKey);

        const sPanelInfo = panels.find((panel) => panel.key === panelKey);

        if (!sPanelInfo) {
            throw new Error(`Panel was not found for key "${panelKey}".`);
        }

        return sPanelInfo;
    }

    function runPanelRangeAction(
        panelKey: string,
        action: (panelInfo: RuntimePanelInfo) => Promise<void>,
    ): Promise<void> {
        return runRangeAction(() => action(getPanelInfoOrThrow(panelKey)));
    }

    function forEachPanel(
        action: (panelInfo: RuntimePanelInfo) => Promise<void>,
    ): void {
        panels.forEach((panel) => void runRangeAction(() => action(panel)));
    }

    async function runRangeAction(action: () => Promise<void>): Promise<void> {
        try {
            await action();
        } catch (error) {
            if (isRequiredFullRangeError(error)) {
                return;
            }

            throw error;
        }
    }

    async function expandPanelToFullDataRange(
        panelInfo: RuntimePanelInfo,
    ): Promise<void> {
        const sFullRange = await fetchRequiredFullRange(panelInfo.query.tagSet);

        applyRangeToPanel(panelInfo, {
            requestPanelRange: sFullRange,
            requestNavigatorRange: sFullRange,
            fullRange: sFullRange,
        });
    }

    async function applyConfiguredTimeRange(
        panelInfo: RuntimePanelInfo,
        boardTimeToApply: TimeRangeInput,
        applyInitialMainChartWindow: boolean,
    ): Promise<void> {
        const sRangeState = await resolvePanelRangeStateForSeries({
            panelInfo: getPanelConfigFromRuntimePanel(panelInfo),
            boardTime: boardTimeToApply,
            useLastViewedRange: false,
            applyInitialMainChartWindow,
        });

        applyRangeToPanel(panelInfo, sRangeState);
    }

    async function refreshPanelDataForPanel(
        panelInfo: RuntimePanelInfo,
    ): Promise<void> {
        const sRangeState = panelInfo.time.runtimeRange;

        if (!hasConcretePanelRangeState(sRangeState)) {
            await applyConfiguredTimeRange(panelInfo, boardTime, false);
            return;
        }

        requestDataRefresh(panelInfo.key);
    }

    function refreshPanelTimeForPanel(
        panelInfo: RuntimePanelInfo,
    ): Promise<void> {
        return applyConfiguredTimeRange(panelInfo, boardTime, true);
    }

    async function applyBoardTimeRangeToPanel(
        panelInfo: RuntimePanelInfo,
        boardTimeToApply: TimeRangeInput,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return;
        }

        const sCurrentRangeState = panelInfo.time.runtimeRange;

        if (!hasConcretePanelRangeState(sCurrentRangeState)) {
            await applyConfiguredTimeRange(panelInfo, boardTimeToApply, true);
            return;
        }

        const sNavigatorRangeResolution = resolveDefaultNavigatorRangeResolution(
            boardTimeToApply,
            sCurrentRangeState.fullRange,
        );
        const sNavigatorRange = sNavigatorRangeResolution.range;
        const sShouldInheritBoardRange =
            isEmptyPanelRangeInput(panelInfo.time.config.rangeInput) &&
            sNavigatorRangeResolution.source === 'board-time';

        applyRangeToPanel(panelInfo, {
            ...sCurrentRangeState,
            requestPanelRange: sShouldInheritBoardRange
                ? sNavigatorRange
                : clampTimeRangeToBounds(
                      sCurrentRangeState.requestPanelRange,
                      sNavigatorRange,
                  ),
            requestNavigatorRange: sNavigatorRange,
            requestNavigatorRangeInput: undefined,
        });
    }

    function refreshPanelData(panelKey: string): Promise<void> {
        return runPanelRangeAction(panelKey, refreshPanelDataForPanel);
    }

    function refreshPanelTime(panelKey: string): Promise<void> {
        return runPanelRangeAction(panelKey, refreshPanelTimeForPanel);
    }

    function expandPanelFullRange(panelKey: string): Promise<void> {
        return runPanelRangeAction(panelKey, expandPanelToFullDataRange);
    }

    function resolveConfiguredPanelRange(
        panelInfo: RuntimePanelInfo,
        applyInitialMainChartWindow: boolean,
    ): Promise<PanelRangeState> {
        return resolvePanelRangeStateForSeries({
            panelInfo: getPanelConfigFromRuntimePanel(panelInfo),
            boardTime,
            useLastViewedRange: true,
            applyInitialMainChartWindow,
        });
    }

    function reloadAfterEditorSave(
        nextPanelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ): void {
        const sRuntimePanelInfo = getPanelInfoOrThrow(nextPanelInfo.key);
        const sRuntimePanelWithNextConfig = {
            ...nextPanelInfo,
            time: {
                config: nextPanelInfo.time,
                runtimeRange: sRuntimePanelInfo.time.runtimeRange,
            },
            isOverlapSelected: sRuntimePanelInfo.isOverlapSelected,
        } satisfies RuntimePanelInfo;
        const sCurrentRangeState = sRuntimePanelInfo.time.runtimeRange;

        if (
            preserveCurrentVisibleRange &&
            hasConcretePanelRangeState(sCurrentRangeState)
        ) {
            return;
        }

        void runRangeAction(async () => {
            const sResolvedRangeState = await resolveConfiguredPanelRange(
                sRuntimePanelWithNextConfig,
                false,
            );

            applyRangeToPanel(sRuntimePanelWithNextConfig, sResolvedRangeState);
        });
    }

    function handleChartWidthChange(
        panelInfo: RuntimePanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.key;

        setChartAreaWidth(sPanelKey, width);

        if (width === undefined || !isActiveTab) {
            clearPanelInitializationState(sPanelKey);
            return;
        }

        if (!shouldInitializePanelRange(panelInfo)) {
            return;
        }

        initializingPanelKeysRef.current[sPanelKey] = true;
        void runRangeAction(() => initializePanelRange(panelInfo));
    }

    function shouldInitializePanelRange(panelInfo: RuntimePanelInfo): boolean {
        const sPanelRecord = getPanelRuntimeRecord(panelInfo.key);

        return !(
            sPanelRecord.chartAreaWidth === undefined ||
            initializedPanelKeysRef.current[panelInfo.key] ||
            initializingPanelKeysRef.current[panelInfo.key]
        );
    }

    async function initializePanelRange(panelInfo: RuntimePanelInfo): Promise<void> {
        const sPanelKey = panelInfo.key;

        try {
            const sInitialGlobalRange = getInitialGlobalRangeToApply(panelInfo);

            if (sInitialGlobalRange) {
                await applyGlobalRangeToPanel(panelInfo, sInitialGlobalRange);
                initializedPanelKeysRef.current[sPanelKey] = true;
                return;
            }

            const sResolvedRangeState = await resolveConfiguredPanelRange(
                panelInfo,
                true,
            );

            applyRangeToPanel(panelInfo, sResolvedRangeState);
            initializedPanelKeysRef.current[sPanelKey] = true;
        } finally {
            delete initializingPanelKeysRef.current[sPanelKey];
        }
    }

    function getInitialGlobalRangeToApply(
        panelInfo: RuntimePanelInfo,
    ): GlobalTimeRangeState | undefined {
        if (panelInfo.time.config.useLastViewedRange) {
            return undefined;
        }

        if (!globalTimeRange) {
            return undefined;
        }

        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return undefined;
        }

        return globalTimeRange;
    }

    function clearPanelInitializationState(panelKey: string): void {
        delete initializedPanelKeysRef.current[panelKey];
        delete initializingPanelKeysRef.current[panelKey];
    }

    async function applyGlobalRangeToPanel(
        panelInfo: RuntimePanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return;
        }

        const sFullRange = await fetchRequiredFullRange(panelInfo.query.tagSet);

        applyRangeToPanel(panelInfo, {
            requestPanelRange: globalTimeRangeToApply.data,
            requestNavigatorRange: globalTimeRangeToApply.navigator,
            fullRange: sFullRange,
        });
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: RuntimePanelInfo) => {
            const sPanelRecord = getPanelRuntimeRecord(panelInfo.key);

            return {
                chartAreaWidth: sPanelRecord.chartAreaWidth,
                dataRefreshVersion: sPanelRecord.dataRefreshVersion,
                onRangeStateChange: (
                    rangeState: PanelRangeState,
                    options?: PanelRangeChangeOptions,
                ) => {
                    applyRangeToPanel(panelInfo, rangeState, options);
                },
                isActive: isActiveTab,
                rollupTableList,
                boardTimeRange: boardTime,
            };
        },
        handleChartWidthChange,
        refreshPanelData,
        refreshPanelTime: (panelKey: string) => void refreshPanelTime(panelKey),
        expandPanelFullRange: (panelKey: string) =>
            void expandPanelFullRange(panelKey),
        reloadAfterEditorSave,
        refreshAllPanelData: () => forEachPanel(refreshPanelDataForPanel),
        refreshAllPanelTime: () => forEachPanel(refreshPanelTimeForPanel),
        expandAllPanelFullRanges: () => forEachPanel(expandPanelToFullDataRange),
        applyBoardTimeRangeToPanels: (boardTimeToApply: TimeRangeInput) =>
            forEachPanel((panel) =>
                applyBoardTimeRangeToPanel(panel, boardTimeToApply),
            ),
        applyGlobalRangeToPanels: (
            globalTimeRangeToApply: GlobalTimeRangeState,
        ) =>
            forEachPanel((panel) =>
                applyGlobalRangeToPanel(panel, globalTimeRangeToApply),
            ),
    };
}
