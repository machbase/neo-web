import { useRef } from 'react';
import type { GlobalTimeRangeState } from '../../domain/BoardDomain';
import {
    getPanelConfigFromRuntimePanel,
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelInfo,
} from '../../domain/panel/PanelConfig';
import { hasNumericBaseTimeSeries } from '../../domain/SeriesDomain';
import type { TimeRangeInput, TimeRangeMs } from '../../domain/time/TimeTypes';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import {
    hasConcretePanelRangeState,
} from '../../domain/panelRange/PanelRangeApply';
import { resolveDefaultNavigatorRange } from '../../domain/panelRange/PanelRangeResolver';
import {
    clampTimeRangeToBounds,
} from '../../domain/time/TimeRangeUtils';
import { useBoardPanelRangeRecords } from './useBoardPanelRangeRecords';
import { assertPanelKey } from '../runtimeBoardPanels';
import {
    fetchRequiredFullRange,
    isRequiredFullRangeError,
    resolvePanelRangeStateForSeries,
} from './PanelFullRangeFetcher';

type FullRangeProjection = {
    panelRange: TimeRangeMs;
    navigatorSeed: TimeRangeMs;
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
    const panelRangeRecords = useBoardPanelRangeRecords({
        onPanelRangeStateChange,
        onAppliedRange,
    });

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

        panelRangeRecords.applyRangeToPanel(panelInfo, {
            requestPanelRange: sFullRange,
            requestNavigatorRange: sFullRange,
            fullRange: sFullRange,
        });
    }

    function applyConfiguredTimeRange(
        panelInfo: RuntimePanelInfo,
        applyInitialMainChartWindow: boolean,
    ): Promise<void> {
        return applyConfiguredTimeRangeWithBoardTime(
            panelInfo,
            boardTime,
            applyInitialMainChartWindow,
        );
    }

    async function applyConfiguredTimeRangeWithBoardTime(
        panelInfo: RuntimePanelInfo,
        boardTimeToApply: TimeRangeInput,
        applyInitialMainChartWindow: boolean,
    ): Promise<void> {
        const sRangeState = await resolvePanelRangeStateForSeries({
            panelInfo: getRuntimePanelConfig(panelInfo),
            boardTime: boardTimeToApply,
            useLastViewedRange: false,
            applyInitialMainChartWindow,
        });

        panelRangeRecords.applyRangeToPanel(panelInfo, sRangeState);
    }

    async function refreshPanelDataForPanel(
        panelInfo: RuntimePanelInfo,
    ): Promise<void> {
        const sRangeState = panelInfo.time.runtimeRange;

        if (!hasConcretePanelRangeState(sRangeState)) {
            await applyConfiguredTimeRange(panelInfo, false);
            return;
        }

        panelRangeRecords.requestDataRefresh(panelInfo.key);
    }

    function refreshPanelTimeForPanel(
        panelInfo: RuntimePanelInfo,
    ): Promise<void> {
        return applyConfiguredTimeRange(panelInfo, true);
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
            await applyConfiguredTimeRangeWithBoardTime(
                panelInfo,
                boardTimeToApply,
                true,
            );
            return;
        }

        const sNavigatorRange = resolveDefaultNavigatorRange(
            boardTimeToApply,
            sCurrentRangeState.fullRange,
        );

        panelRangeRecords.applyRangeToPanel(panelInfo, {
            ...sCurrentRangeState,
            requestPanelRange: clampTimeRangeToBounds(
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
            panelInfo: getRuntimePanelConfig(panelInfo),
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

        void runRangeAction(() => reloadPanelRangeAfterEditorSave(
            sRuntimePanelWithNextConfig,
        ));
    }

    async function reloadPanelRangeAfterEditorSave(
        nextPanelInfo: RuntimePanelInfo,
    ): Promise<void> {
        const sResolvedRangeState = await resolveConfiguredPanelRange(
            nextPanelInfo,
            false,
        );

        panelRangeRecords.applyRangeToPanel(nextPanelInfo, sResolvedRangeState);
    }

    function handleChartWidthChange(
        panelInfo: RuntimePanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.key;

        panelRangeRecords.setChartAreaWidth(sPanelKey, width);

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
        const sPanelRecord = panelRangeRecords.getPanelRuntimeRecord(panelInfo.key);

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

            panelRangeRecords.applyRangeToPanel(panelInfo, sResolvedRangeState);
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

    async function applyFullRangeProjectionToPanel(
        panelInfo: RuntimePanelInfo,
        projectRange: (fullRange: TimeRangeMs) => FullRangeProjection,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return;
        }

        const sFullRange = await fetchRequiredFullRange(panelInfo.query.tagSet);

        panelRangeRecords.applyRangeToPanel(
            panelInfo,
            createRangeStateFromFullRange(sFullRange, projectRange(sFullRange)),
        );
    }

    function applyGlobalRangeToPanel(
        panelInfo: RuntimePanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): Promise<void> {
        return applyFullRangeProjectionToPanel(panelInfo, () => ({
            panelRange: globalTimeRangeToApply.data,
            navigatorSeed: globalTimeRangeToApply.navigator,
        }));
    }


    return {
        getPanelContainerRuntimeProps: (panelInfo: RuntimePanelInfo) => ({
            ...panelRangeRecords.getPanelContainerRuntimeRecord(panelInfo),
            isActive: isActiveTab,
            rollupTableList,
            boardTimeRange: boardTime,
        }),
        handleChartWidthChange,
        refreshPanelData,
        refreshPanelTime: (panelKey: string) => void refreshPanelTime(panelKey),
        expandPanelFullRange: (panelKey: string) =>
            void expandPanelFullRange(panelKey),
        reloadAfterEditorSave,
        refreshAllPanelData: () =>
            panels.forEach((panel) =>
                void runRangeAction(() => refreshPanelDataForPanel(panel)),
            ),
        refreshAllPanelTime: () =>
            panels.forEach((panel) =>
                void runRangeAction(() => refreshPanelTimeForPanel(panel)),
            ),
        expandAllPanelFullRanges: () =>
            panels.forEach((panel) =>
                void runRangeAction(() => expandPanelToFullDataRange(panel)),
            ),
        applyBoardTimeRangeToPanels: (boardTimeToApply: TimeRangeInput) =>
            panels.forEach((panel) =>
                void runRangeAction(() =>
                    applyBoardTimeRangeToPanel(panel, boardTimeToApply),
                ),
            ),

        applyGlobalRangeToPanels: (
            globalTimeRangeToApply: GlobalTimeRangeState,
        ) =>
            panels.forEach(
                (panel) =>
                    void runRangeAction(() =>
                        applyGlobalRangeToPanel(panel, globalTimeRangeToApply),
                    ),
            ),
    };
}

function getRuntimePanelConfig(panelInfo: RuntimePanelInfo): PanelInfo {
    return getPanelConfigFromRuntimePanel(panelInfo);
}

function createRangeStateFromFullRange(
    fullRange: TimeRangeMs,
    projection: FullRangeProjection,
): PanelRangeState {
    return {
        requestPanelRange: projection.panelRange,
        requestNavigatorRange: projection.navigatorSeed,
        fullRange,
    };
}
