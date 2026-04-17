import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
import { memo, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import {
    buildPanelPresentationState,
    createPanelRangeControlHandlers,
    createPanelTimeKeeperPayload,
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelRangeUtils';
import type {
    TagAnalyzerEditRequest,
    TagAnalyzerBoardContext,
} from '../TagAnalyzerTypes';
import type {
    PanelChartHandle,
    PanelState,
} from './PanelModel';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TimeRange,
} from '../common/CommonTypes';
import { usePanelChartRuntimeController } from './usePanelController';

// Props for the board-only chart shell that wraps the shared runtime controller.
// Used by PanelContainer to type component props.
type PanelContainerProps = {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardContext: TagAnalyzerBoardContext;
    pChartBoardState: {
        refreshCount: number;
        bgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined;
        globalTimeRange: TagAnalyzerGlobalTimeRangeState | undefined;
    };
    pChartBoardActions: {
        onPersistPanelState: (
            aTargetPanel: string,
            aTimeInfo: TagAnalyzerPanelTimeKeeper,
            aRaw: boolean,
        ) => void;
        onSetGlobalTimeRange: (
            aDataTime: TimeRange,
            aNavigatorTime: TimeRange,
            aInterval: TagAnalyzerIntervalOption,
        ) => void;
        onOpenEditRequest: (aRequest: TagAnalyzerEditRequest) => void;
    };
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
};

// Context returned by the shared runtime controller after a panel range has finished applying.
// Used by PanelContainer to type applied board panel range context.
type AppliedBoardPanelRangeContext = {
    navigatorRange: TimeRange;
    isRaw: boolean;
};

// Future Refactor Target: this board controller still overlaps heavily with the preview controller.
// Keep the duplicated orchestration visible until we can safely extract a shared controller path.
/**
 * Renders the board panel shell and keeps board-only persistence, overlap, and global-time wiring outside the shared runtime controller.
 * @param pProps The board panel inputs and board-specific action handlers.
 * @returns The board panel card for the current TagAnalyzer panel.
 */
function PanelContainer({
    pPanelInfo,
    pBoardContext,
    pChartBoardState,
    pChartBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: PanelContainerProps) {
    const {
        meta,
        data,
        time,
        axes,
        display,
    } = pPanelInfo;

    // Refs
    const areaChartRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<HTMLDivElement | null>(null);

    // Global state
    const selectedTab = useRecoilValue(gSelectedTab);
    const rollupTableList = useRecoilValue(gRollupTableList);

    // Local state
    const [panelState, setPanelState] = useState<PanelState>({
        ...INITIAL_PANEL_STATE,
        isRaw: data.raw_keeper ?? false,
    });
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [canOpenFft, setCanOpenFft] = useState(false);

    // Derived
    const boardRange = pBoardContext.range;
    const boardRangeConfig = pBoardContext.rangeConfig;

    /**
     * Builds the reset and initialization inputs shared by the panel time-range helpers.
     * @returns The current board and panel time-resolution inputs.
     */
    function makeResetParams() {
        return {
            boardRange,
            boardRangeConfig,
            panelData: data,
            panelTime: time,
            bgnEndTimeRange: pChartBoardState.bgnEndTimeRange,
            isEdit: false as const,
        };
    }

    /**
     * Persists the applied panel range through the board lane after the shared runtime controller finishes loading.
     * @param aPanelRange The final visible panel range.
     * @param aContext The navigator range and raw-mode context for the applied panel range.
     * @returns Nothing.
     * Side effect: persists time-keeper state and updates the overlap selection window through board callbacks.
     */
    function handlePanelRangeApplied(
        aPanelRange: TimeRange,
        aContext: AppliedBoardPanelRangeContext,
    ) {
        if (time.use_time_keeper) {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(aPanelRange, aContext.navigatorRange),
                aContext.isRaw,
            );
        }
        if (pIsSelectedForOverlap) {
            pOnUpdateOverlapSelection(aPanelRange.startTime, aPanelRange.endTime, aContext.isRaw);
        }
    }

    const {
        navigateState,
        navigateStateRef,
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
        updateNavigateState,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        boardRange,
        boardRangeConfig,
        areaChartRef,
        chartRef,
        rollupTableList,
        isRaw: panelState.isRaw,
        onPanelRangeApplied: handlePanelRangeApplied,
    });

    // --- Lifecycle ---

    /**
     * Initializes the board panel from the resolved panel and navigator ranges.
     * @returns Nothing.
     * Side effect: fetches and stores the initial panel and navigator datasets.
     */
    const initialize = async function initialize() {
        if (!panelFormRef.current?.clientWidth) return;

        const resolved = await resolveInitialPanelRange(makeResetParams());
        const keeper =
            time.use_time_keeper
                ? resolveTimeKeeperRanges(time.time_keeper)
                : undefined;
        const range = keeper?.panelRange ?? resolved;
        const nRange = keeper?.navigatorRange ?? range;

        await applyLoadedRanges(range, nRange);
    };

    /**
     * Resets the current panel back to the board-resolved visible range.
     * @returns Nothing.
     * Side effect: routes the reset range back through the shared panel controller.
     */
    const reset = async function reset() {
        if (pBoardContext.id !== selectedTab) return;
        const range = await resolveResetTimeRange(makeResetParams());
        setExtremes(range, range);
    };

    // --- Toggles ---

    /**
     * Toggles drag-select mode and closes the FFT modal when drag-select is disabled.
     * @returns Nothing.
     * Side effect: updates the panel-local selection and FFT modal state.
     */
    const toggleDragSelect = function toggleDragSelect() {
        const nextIsDragSelectActive = !panelState.isDragSelectActive;
        setPanelState((p) => ({
            ...p,
            isDragSelectActive: nextIsDragSelectActive,
            isFFTModal: nextIsDragSelectActive ? p.isFFTModal : false,
        }));
        if (!nextIsDragSelectActive) {
            setCanOpenFft(false);
        }
    };

    /**
     * Applies drag-select state changes reported by the chart body.
     * @param aIsDragSelectActive Whether drag-select should stay active.
     * @param aCanOpenFft Whether the FFT action should be enabled.
     * @returns Nothing.
     * Side effect: updates panel-local drag-select and FFT availability state.
     */
    const handleDragSelectStateChange = function handleDragSelectStateChange(
        aIsDragSelectActive: boolean,
        aCanOpenFft: boolean,
    ) {
        if (!aIsDragSelectActive) {
            setPanelState((p) => ({ ...p, isDragSelectActive: false }));
        }
        setCanOpenFft(aCanOpenFft);
    };

    /**
     * Toggles raw mode for the board panel and refreshes the affected datasets.
     * @returns Nothing.
     * Side effect: updates panel-local raw state, persists time-keeper state, and triggers panel or navigator reloads.
     */
    const toggleRaw = function toggleRaw() {
        const nextRaw = !panelState.isRaw;
        setPanelState((p) => ({ ...p, isRaw: nextRaw }));

        if (navigateState.panelRange.startTime) {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(navigateState.panelRange, navigateState.navigatorRange),
                nextRaw,
            );
        }
        void refreshPanelData(navigateState.panelRange, nextRaw, navigateState.navigatorRange);
    };

    // --- Composed handler objects ---

    const actionHandlers = {
        onToggleOverlap: () => {
            if (data.tag_set.length === 1) {
                pOnToggleOverlapSelection(
                    navigateState.panelRange.startTime,
                    navigateState.panelRange.endTime,
                    panelState.isRaw,
                );
            }
        },
        onToggleRaw: toggleRaw,
        onToggleDragSelect: toggleDragSelect,
        onOpenFft: () => setPanelState((p) => ({ ...p, isFFTModal: true })),
        onSetGlobalTime: () => {
            if (!navigateState.rangeOption) return;
            pChartBoardActions.onSetGlobalTimeRange(
                resolveGlobalTimeTargetRange(navigateState.preOverflowTimeRange, navigateState.panelRange),
                navigateState.navigatorRange,
                navigateState.rangeOption,
            );
        },
        onOpenEdit: () =>
            pChartBoardActions.onOpenEditRequest({
                pPanelInfo,
                pNavigatorRange: navigateState.navigatorRange,
                pSetSaveEditedInfo: setShouldRefreshAfterEdit,
            }),
        onDelete: () =>
            pOnDeletePanel(
                navigateState.panelRange.startTime,
                navigateState.panelRange.endTime,
                panelState.isRaw,
            ),
    };
    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );

    const presentationState = buildPanelPresentationState(
        meta.chart_title,
        navigateState.panelRange,
        navigateState.rangeOption,
        false,
        panelState.isRaw,
        pIsSelectedForOverlap,
        pIsOverlapAnchor,
        data.tag_set.length === 1,
        panelState.isDragSelectActive,
        canOpenFft,
        Boolean(navigateState.chartData),
        changeUtcToText,
    );

    // --- Effects ---

    useEffect(() => {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNavigateState({ rangeOption: pChartBoardState.globalTimeRange.interval });
        setExtremes(
            pChartBoardState.globalTimeRange.data,
            pChartBoardState.globalTimeRange.navigator,
        );
    }, [pChartBoardState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chartRef.current)
            void refreshPanelData(
                navigateState.panelRange,
                panelState.isRaw,
                navigateState.navigatorRange,
            );
    }, [pChartBoardState.refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (pBoardContext.id === selectedTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }, [pPanelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chartRef.current) void reset();
    }, [pChartBoardState.bgnEndTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            selectedTab === pBoardContext.id &&
            areaChartRef.current &&
            !navigateStateRef.current.chartData
        ) {
            void initialize();
        }
    }, [selectedTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Render ---

    return (
        <div
            ref={panelFormRef}
            className="panel-form"
            style={{ border: `0.5px solid ${pIsSelectedForOverlap ? '#FDB532' : '#454545'}` }}
        >
            <PanelHeader
                pPresentationState={presentationState}
                pActionHandlers={actionHandlers}
                pRefreshHandlers={{
                    onRefreshData: () =>
                        void refreshPanelData(
                            navigateState.panelRange,
                            panelState.isRaw,
                            navigateState.navigatorRange,
                        ),
                    onRefreshTime: () => void reset(),
                }}
                pSavedChartInfo={{ chartData: navigateState.chartData, chartRef: chartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{
                    axes,
                    display,
                    useNormalize: pPanelInfo.use_normalize,
                }}
                pPanelState={panelState}
                pNavigateState={navigateState}
                pChartHandlers={{
                    onSetExtremes: handlePanelRangeChange,
                    onSetNavigatorExtremes: handleNavigatorRangeChange,
                    onSelection: () => undefined,
                }}
                pShiftHandlers={shiftHandlers}
                pTagSet={data.tag_set}
                pSetIsFFTModal={(aValue: SetStateAction<boolean>) =>
                    setPanelState((p) => ({
                        ...p,
                        isFFTModal: typeof aValue === 'function' ? aValue(p.isFFTModal) : aValue,
                    }))
                }
                pOnDragSelectStateChange={handleDragSelectStateChange}
            />
            <PanelFooter
                pPanelSummary={{
                    tagCount: data.tag_set.length,
                    showLegend: display.show_legend,
                }}
                pVisibleRange={navigateState.panelRange}
                pShiftHandlers={shiftHandlers}
                pZoomHandlers={zoomHandlers}
            />
        </div>
    );
}

const INITIAL_PANEL_STATE: PanelState = {
    isRaw: false,
    isFFTModal: false,
    isDragSelectActive: false,
};

function arePanelContainerPropsEqual(
    aPrevProps: Readonly<PanelContainerProps>,
    aNextProps: Readonly<PanelContainerProps>,
): boolean {
    return (
        aPrevProps.pPanelInfo === aNextProps.pPanelInfo &&
        aPrevProps.pBoardContext.id === aNextProps.pBoardContext.id &&
        aPrevProps.pBoardContext.range === aNextProps.pBoardContext.range &&
        aPrevProps.pBoardContext.rangeConfig === aNextProps.pBoardContext.rangeConfig &&
        aPrevProps.pChartBoardState.refreshCount === aNextProps.pChartBoardState.refreshCount &&
        aPrevProps.pChartBoardState.bgnEndTimeRange === aNextProps.pChartBoardState.bgnEndTimeRange &&
        aPrevProps.pChartBoardState.globalTimeRange === aNextProps.pChartBoardState.globalTimeRange &&
        aPrevProps.pChartBoardActions.onPersistPanelState ===
            aNextProps.pChartBoardActions.onPersistPanelState &&
        aPrevProps.pChartBoardActions.onSetGlobalTimeRange ===
            aNextProps.pChartBoardActions.onSetGlobalTimeRange &&
        aPrevProps.pChartBoardActions.onOpenEditRequest ===
            aNextProps.pChartBoardActions.onOpenEditRequest &&
        aPrevProps.pIsSelectedForOverlap === aNextProps.pIsSelectedForOverlap &&
        aPrevProps.pIsOverlapAnchor === aNextProps.pIsOverlapAnchor
    );
}

export default memo(PanelContainer, arePanelContainerPropsEqual);
