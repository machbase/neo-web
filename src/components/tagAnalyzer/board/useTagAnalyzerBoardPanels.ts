import { useRef, useState } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type { TimeRangeConfig } from '../domain/time/model/TimeTypes';
import type { RollupTableMap } from '../fetch/FetchContracts';
import {
    createInitialBoardPanelRecord,
    hasValidRangeState,
    type BoardPanelRecord,
    type PanelRangeChangeOptions,
} from './BoardPanelState';
import { useApplyPanelRange } from './useApplyPanelRange';
import { useRefreshRange } from './useRefreshRange';
import { showPanelFullRangeUnavailableToast } from './PanelRangeFeedback';
import {
    getFullRangeFromSeries,
    getCoveringNavigatorRange,
    resolveBoardTimeRange,
    resolveConcretePanelRangeState,
} from './PanelRangeResolver';

type ResolvePanelRangeOptions = {
    applyInitialMainChartWindow?: boolean;
};

export function useTagAnalyzerBoardPanels({
    panels,
    boardTime,
    globalTimeRange,
    isActiveTab,
    rollupTableList,
    onAppliedRange,
}: {
    panels: PanelInfo[];
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
    rollupTableList: RollupTableMap;
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
}) {
    const [, setBoardPanelRecords] =
        useState<Record<string, BoardPanelRecord>>({});
    const boardPanelRecordsRef = useRef<Record<string, BoardPanelRecord>>({});
    const initializedPanelKeysRef = useRef<Record<string, true>>({});
    const initializingPanelKeysRef = useRef<Record<string, true>>({});

    function getBoardPanelRecord(panelKey: string): BoardPanelRecord {
        assertPanelKey(panelKey);
        return boardPanelRecordsRef.current[panelKey] ?? createInitialBoardPanelRecord();
    }

    function updateBoardPanelRecord(
        panelKey: string,
        updater: (record: BoardPanelRecord) => BoardPanelRecord,
    ): void {
        assertPanelKey(panelKey);
        const sNextRecord = updater(getBoardPanelRecord(panelKey));
        const sNextBoardPanelRecords = {
            ...boardPanelRecordsRef.current,
            [panelKey]: sNextRecord,
        };

        boardPanelRecordsRef.current = sNextBoardPanelRecords;
        setBoardPanelRecords(sNextBoardPanelRecords);
    }

    function setPanelChartAreaWidth(
        panelKey: string,
        chartAreaWidth: number | undefined,
    ): void {
        if (getBoardPanelRecord(panelKey).chartAreaWidth === chartAreaWidth) {
            return;
        }

        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            chartAreaWidth,
        }));
    }

    const {
        applyPanelRange,
        requestPanelDataRefresh,
    } = useApplyPanelRange({
        panelStore: {
            getBoardPanelRecord,
            updateBoardPanelRecord,
        },
    });

    function applyPanelRangeToPanel(
        panelInfo: PanelInfo,
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ): PanelRangeState | undefined {
        const sApplyResult = applyPanelRange({
            panelKey: panelInfo.key,
            rangeState,
            navigatorSelectionCenterRatio:
                options?.navigatorSelectionCenterRatio,
        });

        if (sApplyResult.didChange) {
            onAppliedRange(panelInfo, sApplyResult.resolvedRangeState);
            return sApplyResult.resolvedRangeState;
        }

        return undefined;
    }

    const {
        refreshPanelData,
        refreshPanelTime: refreshPanelTimeRange,
        setFullDataRange,
    } = useRefreshRange({
        boardTime,
        getBoardPanelRecord,
        applyPanelRangeToPanel,
        requestPanelDataRefresh,
    });
    async function resolvePanelRangeState(
        panelInfo: PanelInfo,
        options?: ResolvePanelRangeOptions,
    ): Promise<PanelRangeState | undefined> {
        const fullRange = await getFullRangeFromSeries(panelInfo.query.tagSet);

        if (!fullRange) {
            showPanelFullRangeUnavailableToast();
            return undefined;
        }

        return resolveConcretePanelRangeState({
            fullRange,
            rangeConfig: panelInfo.timeRange,
            lastViewedRange: panelInfo.timeRange.useLastViewedRange
                ? panelInfo.timeRange.lastViewedRange
                : undefined,
            boardTime,
            applyInitialMainChartWindow:
                options?.applyInitialMainChartWindow === true,
        });
    }

    function reloadAfterEditorSave(
        nextPanelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ): void {
        const sRangeState =
            getBoardPanelRecord(nextPanelInfo.key).rangeState;

        if (preserveCurrentVisibleRange && hasValidRangeState(sRangeState)) {
            return;
        }

        void (async () => {
            const sResolvedRangeState = await resolvePanelRangeState(nextPanelInfo);

            if (!sResolvedRangeState) {
                return;
            }

            applyPanelRangeToPanel(nextPanelInfo, sResolvedRangeState);
        })();
    }

    function handleChartWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.key;

        setPanelChartAreaWidth(sPanelKey, width);

        if (width === undefined || !isActiveTab) {
            delete initializedPanelKeysRef.current[sPanelKey];
            delete initializingPanelKeysRef.current[sPanelKey];
            return;
        }

        const sUpdatedBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (
            sUpdatedBoardPanelRecord.chartAreaWidth === undefined ||
            initializedPanelKeysRef.current[sPanelKey] ||
            initializingPanelKeysRef.current[sPanelKey]
        ) {
            return;
        }

        initializingPanelKeysRef.current[sPanelKey] = true;
        void (async () => {
            try {
                if (panelInfo.timeRange.useLastViewedRange) {
                    const sResolvedRangeState = await resolvePanelRangeState(panelInfo, {
                        applyInitialMainChartWindow: true,
                    });

                    if (!sResolvedRangeState) {
                        return;
                    }

                    applyPanelRangeToPanel(panelInfo, sResolvedRangeState);
                    initializedPanelKeysRef.current[sPanelKey] = true;
                    return;
                }

                if (
                    globalTimeRange &&
                    !hasNumericBaseTimeSeries(panelInfo.query.tagSet)
                ) {
                    await applyGlobalRangeToPanel(panelInfo, globalTimeRange);
                    initializedPanelKeysRef.current[sPanelKey] = true;
                    return;
                }

                const sResolvedRangeState = await resolvePanelRangeState(panelInfo, {
                    applyInitialMainChartWindow: true,
                });

                if (!sResolvedRangeState) {
                    return;
                }

                applyPanelRangeToPanel(panelInfo, sResolvedRangeState);
                initializedPanelKeysRef.current[sPanelKey] = true;
            } finally {
                delete initializingPanelKeysRef.current[sPanelKey];
            }
        })();
    }

    async function applyGlobalRangeToPanel(
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return;
        }

        const fullRange = await getFullRangeFromSeries(panelInfo.query.tagSet);

        if (!fullRange) {
            showPanelFullRangeUnavailableToast();
            return;
        }

        applyPanelRangeToPanel(panelInfo, {
            requestPanelRange: globalTimeRangeToApply.data,
            requestNavigatorRange: getCoveringNavigatorRange(
                globalTimeRangeToApply.navigator,
                fullRange,
            ),
            fullRange,
        });
    }

    async function applyBoardTimeToPanel(
        panelInfo: PanelInfo,
        boardTimeToApply: TimeRangeConfig,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return;
        }

        const fullRange = await getFullRangeFromSeries(panelInfo.query.tagSet);

        if (!fullRange) {
            showPanelFullRangeUnavailableToast();
            return;
        }

        const boardRange = resolveBoardTimeRange(boardTimeToApply, fullRange);

        applyPanelRangeToPanel(panelInfo, {
            requestPanelRange: boardRange,
            requestNavigatorRange: getCoveringNavigatorRange(boardRange, fullRange),
            fullRange,
        });
    }

    function refreshAllPanelData(): void {
        for (const panelInfo of panels) {
            void refreshPanelData(panelInfo);
        }
    }

    function refreshPanelTime(panelInfo: PanelInfo): void {
        void refreshPanelTimeRange(panelInfo);
    }

    function expandPanelFullRange(panelInfo: PanelInfo): void {
        void setFullDataRange(panelInfo);
    }

    function refreshAllPanelTime(): void {
        for (const panelInfo of panels) refreshPanelTime(panelInfo);
    }

    function expandAllPanelFullRanges(): void {
        for (const panelInfo of panels) expandPanelFullRange(panelInfo);
    }

    function applyBoardTimeToPanels(boardTimeToApply: TimeRangeConfig): void {
        for (const panelInfo of panels) {
            void applyBoardTimeToPanel(panelInfo, boardTimeToApply);
        }
    }

    function applyGlobalRangeToPanels(
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): void {
        for (const panelInfo of panels) {
            void applyGlobalRangeToPanel(panelInfo, globalTimeRangeToApply);
        }
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: PanelInfo) => ({
            ...getPanelRuntimeProps(panelInfo),
            rollupTableList,
        }),
        handleChartWidthChange,
        refreshPanelData,
        refreshPanelTime,
        expandPanelFullRange,
        reloadAfterEditorSave,
        refreshAllPanelData,
        refreshAllPanelTime,
        expandAllPanelFullRanges,
        applyBoardTimeToPanels,
        applyGlobalRangeToPanels,
        getPanelRangeState: (panelInfo: PanelInfo) =>
            getBoardPanelRecord(panelInfo.key).rangeState,
    };

    function getPanelRuntimeProps(panelInfo: PanelInfo) {
        const sBoardPanelRecord = getBoardPanelRecord(panelInfo.key);

        return {
            isActive: isActiveTab,
            rangeState: sBoardPanelRecord.rangeState,
            chartAreaWidth: sBoardPanelRecord.chartAreaWidth,
            dataRefreshVersion: sBoardPanelRecord.dataRefreshVersion,
            onRangeStateChange: (
                rangeState: PanelRangeState,
                options?: PanelRangeChangeOptions,
            ): void => {
                applyPanelRangeToPanel(panelInfo, rangeState, options);
            },
        };
    }
}

function assertPanelKey(panelKey: string): void {
    if (panelKey.length === 0) {
        throw new Error('Panel key is required.');
    }
}
