import './TagAnalyzerBoard.scss';
import {
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { MdHelpOutline as Help } from 'react-icons/md';
import {
    Calendar,
    GoArrowBoth,
    PlusCircle,
    Save,
    Refresh,
    SaveAs,
    MdOutlineStackedLineChart,
    LuTimerReset,
} from '@/assets/icons/Icon';
import { Button, Page, Toast } from '@/design-system/components';
import PanelContainer from './panel/PanelContainer';
import BoardTimeRangeModal from './boardModal/BoardTimeRangeModal';
import TagAnalyzerHelpModal from './boardModal/TagAnalyzerHelpModal';
import OverlapModal from './boardModal/OverlapModal';
import { getNextOverlapSelections } from './boardModal/OverlapComparisonUtils';
import CreateChartModal from './modal/selectionPanel/CreateChartModal';
import TazSaveModal, {
    loadTazSaveModalInitialState,
    type TazSaveModalInitialState,
} from './boardModal/TazSaveModal';
import type {
    BoardInfo,
    GlobalTimeRangeState,
    OverlapPanelInfo,
    OverlapPanelSelection,
    OverlapPanelSelectionChangePayload,
    SetGlobalTimeRangePayload,
} from './domain/BoardDomain';
import type { TimeRangeConfig } from './domain/time/model/TimeTypes';
import { ensureUniquePanelIndexKeys } from './domain/PanelIdentity';
import { formatBoardRangeText } from './domain/time/boundary/TimeBoundaryInput';
import { isValidTimeRange, isSameTimeRange } from './domain/time/range/TimeRangeUtils';
import {
    resolvePanelAxesForRuntime,
    type PanelInfo,
    type PanelRangeState,
} from './domain/PanelDomain';
import {
    MIXED_X_AXIS_KIND_WARNING,
    getSeriesListKeyAxisKind,
    hasMixedXAxisValueKinds,
} from './domain/SeriesDomain';
import { useTagAnalyzerBoardPanels } from './board/useTagAnalyzerBoardPanels';
import type { RollupTableMap } from './fetch/FetchContracts';
import type { PersistedTazPanelInfo } from './persistence/TazPersistenceTypesV200';
import {
    createTazSavedCodeFromBoardInfo,
    type SaveableTazBoard,
} from './appState/SavedTazBoardSnapshot';
import { saveTaz, saveAsTaz } from './appState/saveTazBoard';
import {
    parseLoadedPanelTaz,
    parseLoadedTaz,
} from './persistence/load/parseLoadedTaz';
import { TreeFetchDrilling } from '@/utils/UpdateTree';

const SAVE_ERROR_MESSAGE = 'Failed to save TAZ file. Please try again.';
const SAVE_SUCCESS_MESSAGE = 'TAZ file saved successfully.';
const OVERLAP_AXIS_MISMATCH_MESSAGE =
    'Overlap can only compare panels with the same x-axis type.';

type BoardSaveResult =
    | Awaited<ReturnType<typeof saveTaz>>
    | Awaited<ReturnType<typeof saveAsTaz>>;

type TagAnalyzerBoardProps = {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pRecentModalPath: string;
    pFileTree: any;
    pOnSavedBoard: (savedBoard: SaveableTazBoard) => void;
    pOnFileTreeChange: (tree: any) => void;
    pOnRecentModalPathChange: (path: string) => void;
    pAvailableSourceTableNames: string[];
    pRollupTableList: RollupTableMap;
};

const TagAnalyzerBoard = ({
    pInfo,
    pIsActiveTab,
    pRecentModalPath,
    pFileTree,
    pOnSavedBoard,
    pOnFileTreeChange,
    pOnRecentModalPathChange,
    pAvailableSourceTableNames,
    pRollupTableList,
}: TagAnalyzerBoardProps) => {
    const [sIsHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [sIsTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
    const [sIsDisplayOverlapModal, setIsOverlapModalOpen] = useState(false);
    const [sOverlapSelections, setOverlapSelections] = useState<OverlapPanelSelection[]>([]);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<GlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModal, setIsNewPanelModal] = useState(false);
    const [sIsTazSaveModalOpen, setIsTazSaveModalOpen] = useState(false);
    const [sTazSaveModalInitialState, setTazSaveModalInitialState] =
        useState<TazSaveModalInitialState | undefined>(undefined);
    const [sRuntimeBoardInfo, setRuntimeBoardInfo] =
        useState<BoardInfo>(() => pInfo);
    const [sSavedRuntimeBoardCode, setSavedRuntimeBoardCode] = useState(
        () => createTazSavedCodeFromBoardInfo(pInfo),
    );
    const sRuntimePanels = sRuntimeBoardInfo.panels;
    const sSelectedPanelKeys = new Set(
        sOverlapSelections.map((item) => item.panelKey),
    );
    const sRangeText = formatBoardRangeText(sRuntimeBoardInfo.boardTimeRange);
    const boardPanels = useTagAnalyzerBoardPanels({
        panels: sRuntimePanels,
        boardTime: sRuntimeBoardInfo.boardTimeRange,
        globalTimeRange: sGlobalDataAndNavigatorTime,
        isActiveTab: pIsActiveTab,
        rollupTableList: pRollupTableList,
        onAppliedRange: handleRuntimeAppliedRange,
    });
    const getBoardInfoForTazSave = useCallback((boardInfo: BoardInfo): BoardInfo => {
        let sHasPanelChanges = false;
        const sPanelsForSave = boardInfo.panels.map((panel) => {
            const sNextPanel = getPanelWithCurrentVisibleRangeForSave(
                panel,
                boardPanels.getPanelRangeState(panel),
            );

            if (sNextPanel !== panel) {
                sHasPanelChanges = true;
            }

            return sNextPanel;
        });

        if (!sHasPanelChanges) {
            return boardInfo;
        }

        return {
            ...boardInfo,
            panels: sPanelsForSave,
        };
    }, [boardPanels]);
    const sRuntimeBoardInfoForSave = getBoardInfoForTazSave(sRuntimeBoardInfo);
    const sIsRuntimeBoardDirty =
        createTazSavedCodeFromBoardInfo(sRuntimeBoardInfoForSave) !==
        sSavedRuntimeBoardCode;

    function updateRuntimePanels(
        updatePanels: (panels: PanelInfo[]) => PanelInfo[],
    ): void {
        setRuntimeBoardInfo((prev) => {
            const sNextPanels = updatePanels(prev.panels);

            if (sNextPanels === prev.panels) {
                return prev;
            }

            return { ...prev, panels: sNextPanels };
        });
    }

    function handleApplyBoardTimeRange(timeRange: TimeRangeConfig): void {
        setRuntimeBoardInfo((prev) => ({
            ...prev,
            boardTimeRange: timeRange,
        }));
        boardPanels.applyBoardTimeToPanels(timeRange);
    }

    const openTazSaveModal = useCallback(async (): Promise<void> => {
        setTazSaveModalInitialState(
            await loadTazSaveModalInitialState({
                initialDirectoryPath: sRuntimeBoardInfo.path,
                initialFileName: sRuntimeBoardInfo.name,
                recentModalPath: pRecentModalPath,
            }),
        );
        setIsTazSaveModalOpen(true);
    }, [pRecentModalPath, sRuntimeBoardInfo.name, sRuntimeBoardInfo.path]);

    const applySavedRuntimeBoard = useCallback((savedBoard: SaveableTazBoard): void => {
        const sSavedRuntimeBoard = parseLoadedTaz(savedBoard);

        setRuntimeBoardInfo(sSavedRuntimeBoard);
        setSavedRuntimeBoardCode(
            createTazSavedCodeFromBoardInfo(sSavedRuntimeBoard),
        );
        pOnSavedBoard(savedBoard);
    }, [pOnSavedBoard]);

    const finishBoardSave = useCallback((result: BoardSaveResult): boolean => {
        if (!result.success || !result.savedBoard) {
            Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        }

        applySavedRuntimeBoard(result.savedBoard);
        Toast.success(SAVE_SUCCESS_MESSAGE);
        return true;
    }, [applySavedRuntimeBoard]);

    const saveBoardToCurrentTazPath = useCallback(async (
        boardInfo: BoardInfo,
    ): Promise<boolean> => {
        try {
            return finishBoardSave(await saveTaz(getBoardInfoForTazSave(boardInfo)));
        } catch {
            Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        }
    }, [finishBoardSave, getBoardInfoForTazSave]);

    const saveCurrentTazBoard = useCallback(async (): Promise<boolean> => {
        if (!sRuntimeBoardInfo.path) {
            await openTazSaveModal();
            return false;
        }

        return saveBoardToCurrentTazPath(sRuntimeBoardInfo);
    }, [openTazSaveModal, saveBoardToCurrentTazPath, sRuntimeBoardInfo]);
    const saveCurrentTazBoardWithPanel = useCallback(async (
        panel: PanelInfo,
    ): Promise<boolean> => {
        const sBoardWithPanel: BoardInfo = {
            ...sRuntimeBoardInfo,
            panels: updatePanelByKey(
                sRuntimeBoardInfo.panels,
                panel.key,
                () => panel,
            ),
        };

        if (!sBoardWithPanel.path) {
            setRuntimeBoardInfo(sBoardWithPanel);
            await openTazSaveModal();
            return false;
        }

        return saveBoardToCurrentTazPath(sBoardWithPanel);
    }, [openTazSaveModal, saveBoardToCurrentTazPath, sRuntimeBoardInfo]);

    const saveCurrentTazBoardAs = useCallback(async (
        directoryPath: string,
        fileName: string,
    ): Promise<boolean> => {
        try {
            const sSaveResult = await saveAsTaz({
                board: getBoardInfoForTazSave(sRuntimeBoardInfo),
                directoryPath,
                fileName,
            });
            if (!finishBoardSave(sSaveResult)) {
                return false;
            }

            const sUpdatedTreeResult = await TreeFetchDrilling(
                pFileTree,
                `${directoryPath}${fileName}`,
                true,
            );
            if (sUpdatedTreeResult?.tree) {
                pOnFileTreeChange(JSON.parse(JSON.stringify(sUpdatedTreeResult.tree)));
            }
            return true;
        } catch {
            Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        }
    }, [finishBoardSave, getBoardInfoForTazSave, pFileTree, pOnFileTreeChange, sRuntimeBoardInfo]);

    function handleSetGlobalTimeRange(
        payload: SetGlobalTimeRangePayload,
    ): void {
        const sGlobalTimeRange: GlobalTimeRangeState = {
            data: payload.dataTime,
            navigator: payload.navigatorTime,
            interval: payload.interval,
        };

        setGlobalDataAndNavigatorTime(sGlobalTimeRange);
        boardPanels.applyGlobalRangeToPanels(sGlobalTimeRange);
    }

    function updateOverlapSelection(
        payload: OverlapPanelSelectionChangePayload,
    ): void {
        setOverlapSelections((prev) => getNextOverlapSelections(prev, payload));
    }

    function selectOverlapFromRange(
        panel: PanelInfo,
        panelRange: PanelRangeState['requestPanelRange'],
        isRaw: boolean,
        changeType: OverlapPanelSelectionChangePayload['changeType'],
    ): void {
        updateOverlapSelection({
            start: panelRange.startTime,
            end: panelRange.endTime,
            panelKey: panel.key,
            isRaw,
            changeType,
        });
    }

    function getPanelOverlapAxisKind(panel: PanelInfo) {
        return getSeriesListKeyAxisKind(panel.query.tagSet);
    }

    function getOverlapAxisKindMismatchMessage(panel: PanelInfo): string | undefined {
        const sPanelAxisKind = getPanelOverlapAxisKind(panel);

        if (!sPanelAxisKind) {
            return 'Overlap requires a panel with one x-axis type.';
        }

        const sSelectedAxisKind = sOverlapSelections
            .map((selection) =>
                sRuntimePanels.find(
                    (selectedPanel) =>
                        selectedPanel.key === selection.panelKey,
                ),
            )
            .filter((selectedPanel): selectedPanel is PanelInfo =>
                Boolean(selectedPanel),
            )
            .map(getPanelOverlapAxisKind)
            .find((axisKind) => axisKind !== undefined);

        if (sSelectedAxisKind && sSelectedAxisKind !== sPanelAxisKind) {
            return OVERLAP_AXIS_MISMATCH_MESSAGE;
        }

        return undefined;
    }

    function getOverlapPanelsCompatibilityMessage(
        panels: OverlapPanelInfo[],
    ): string | undefined {
        const sAxisKinds = panels
            .map((panel) => panel.axisKind)
            .filter((axisKind) => axisKind !== undefined);

        if (new Set(sAxisKinds).size > 1) {
            return OVERLAP_AXIS_MISMATCH_MESSAGE;
        }

        return undefined;
    }

    function getSelectedOverlapPanels(): OverlapPanelInfo[] {
        return sOverlapSelections.flatMap((selection) => {
            const sPanel = sRuntimePanels.find(
                (panel) => panel.key === selection.panelKey,
            );
            const sSeries = sPanel?.query.tagSet[0];

            if (!sPanel || !sSeries) {
                return [];
            }

            const sRuntimeAxes = resolvePanelAxesForRuntime(
                sPanel.axes,
                sPanel.display.pixelsPerTick,
                sPanel.display.mainChartSampling,
            );
            const sLabel = sSeries.alias || sSeries.sourceTagName || '';

            return [
                {
                    start: selection.start,
                    duration: selection.duration,
                    isRaw: selection.isRaw,
                    panelKey: selection.panelKey,
                    label: sLabel,
                    series: sSeries,
                    queryLimit: sPanel.query.count,
                    intervalType: sPanel.query.intervalType,
                    xAxis: sRuntimeAxes.x,
                    mainChartSampling: sRuntimeAxes.mainChartSampling,
                    isOrderBy: sPanel.mode.isOrderBy,
                    includeZeroInYAxisRange: sPanel.axes.leftY.zeroBase,
                    axisKind: getPanelOverlapAxisKind(sPanel),
                },
            ];
        });
    }

    function applyRuntimePanelInfo(panel: PanelInfo): void {
        updateRuntimePanels((panels) =>
            updatePanelByKey(panels, panel.key, () => panel),
        );
    }

    function appendPanel(panel: PersistedTazPanelInfo): void {
        const sPanelInfo = parseLoadedPanelTaz(panel);

        updateRuntimePanels((panels) =>
            ensureUniquePanelIndexKeys(panels.concat(sPanelInfo)),
        );
    }

    function togglePanelRawMode(panel: PanelInfo): void {
        const sNextPanelInfo: PanelInfo = {
            ...panel,
            mode: {
                ...panel.mode,
                isRaw: !panel.mode.isRaw,
            },
        };

        applyRuntimePanelInfo(sNextPanelInfo);
        handleRuntimeAppliedRange(
            sNextPanelInfo,
            boardPanels.getPanelRangeState(sNextPanelInfo),
        );
    }

    function togglePanelOverlap(
        panel: PanelInfo,
        rangeState: PanelRangeState,
        isRaw: boolean,
    ): void {
        if (!sSelectedPanelKeys.has(panel.key)) {
            if (!hasConcreteOverlapRangeState(rangeState)) {
                Toast.warning('Overlap requires a loaded chart range.', undefined);
                return;
            }

            if (hasMixedXAxisValueKinds(panel.query.tagSet)) {
                Toast.warning(
                    `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled for this panel.`,
                    undefined,
                );
                return;
            }

            if (panel.query.tagSet.length !== 1) {
                Toast.warning('Overlap requires a single-series panel.', undefined);
                return;
            }

            const sAxisKindMismatchMessage = getOverlapAxisKindMismatchMessage(panel);
            if (sAxisKindMismatchMessage) {
                Toast.warning(sAxisKindMismatchMessage, undefined);
                return;
            }
        }

        selectOverlapFromRange(
            panel,
            rangeState.requestPanelRange,
            isRaw,
            undefined,
        );
    }

    function deletePanel(panel: PanelInfo): void {
        updateOverlapSelection({
            panelKey: panel.key,
            changeType: 'delete',
        });
        updateRuntimePanels((panels) =>
            removeRuntimePanel(panels, panel.key),
        );
    }

    function handleRuntimeAppliedRange(
        panel: PanelInfo,
        rangeState: PanelRangeState,
    ): void {
        if (
            !sSelectedPanelKeys.has(panel.key) ||
            !hasConcreteOverlapRangeState(rangeState)
        ) {
            return;
        }

        selectOverlapFromRange(
            panel,
            rangeState.requestPanelRange,
            panel.mode.isRaw,
            'changed',
        );
    }

    const sOverlapPanels = getSelectedOverlapPanels();
    const sOverlapCompatibilityMessage =
        getOverlapPanelsCompatibilityMessage(sOverlapPanels);

    function openOverlapChart(): void {
        if (sOverlapCompatibilityMessage) {
            Toast.warning(sOverlapCompatibilityMessage, undefined);
            return;
        }

        setIsOverlapModalOpen(true);
    }

    useEffect(() => {
        if (!pIsActiveTab) {
            return undefined;
        }

        const handleDocumentSaveShortcut = function handleDocumentSaveShortcut(
            event: KeyboardEvent,
        ) {
            const sIsSaveShortcut =
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's';

            if (!sIsSaveShortcut) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            void saveCurrentTazBoard();
        };

        document.addEventListener('keydown', handleDocumentSaveShortcut, true);

        return () => {
            document.removeEventListener('keydown', handleDocumentSaveShortcut, true);
        };
    }, [pIsActiveTab, saveCurrentTazBoard]);

    const sHeaderActions: Array<{
        key: string;
        tooltip: string;
        icon: ReactNode;
        onClick: () => void;
        disabled?: boolean;
        ariaLabel?: string;
    }> = [
        {
            key: 'refresh-data',
            tooltip: 'Refresh data',
            icon: <Refresh size={15} />,
            onClick: boardPanels.refreshAllPanelData,
        },
        {
            key: 'refresh-time',
            tooltip: 'Refresh time',
            icon: <LuTimerReset size={16} />,
            onClick: boardPanels.refreshAllPanelTime,
        },
        {
            key: 'expand-full-range',
            tooltip: 'Expand all panels to full data range',
            icon: <GoArrowBoth size={15} />,
            onClick: boardPanels.expandAllPanelFullRanges,
        },
        {
            key: 'save',
            tooltip: 'Save',
            icon: <Save size={16} />,
            onClick: () => void saveCurrentTazBoard(),
        },
        {
            key: 'save-as',
            tooltip: 'Save as',
            icon: <SaveAs size={16} />,
            onClick: () => void openTazSaveModal(),
        },
        {
            key: 'overlap',
            tooltip: sOverlapCompatibilityMessage ?? 'Overlap chart',
            icon: <MdOutlineStackedLineChart size={16} />,
            onClick: openOverlapChart,
            disabled: sOverlapPanels.length === 0,
        },
        {
            key: 'help',
            tooltip: 'help',
            icon: <Help size={16} />,
            onClick: () => setIsHelpModalOpen(true),
            ariaLabel: 'Open help',
        },
    ];

    return (
        <>
            <Page.Header>
                <div className="tag-analyzer-board-header">
                    <Page.Space />
                    {sIsRuntimeBoardDirty && (
                        <span className="tag-analyzer-board-header__dirty-message">
                            Runtime change not saved to TAZ
                        </span>
                    )}
                    <Button.Group className="tag-analyzer-board-header__actions">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsTimeRangeModalOpen(true)}
                        >
                            <Calendar style={{ paddingRight: '8px' }} />
                            {sRangeText || 'Board time range not set'}
                        </Button>
                        {sHeaderActions.map((action) => {
                            const sIsDirtySaveButton =
                                action.key === 'save' && sIsRuntimeBoardDirty;

                            return (
                                <Button
                                    key={action.key}
                                    className={
                                        sIsDirtySaveButton
                                            ? 'tag-analyzer-board-header__save-button--dirty'
                                            : undefined
                                    }
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent={
                                        sIsDirtySaveButton
                                            ? 'Save runtime changes to TAZ'
                                            : action.tooltip
                                    }
                                    icon={action.icon}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    aria-label={action.ariaLabel}
                                />
                            );
                        })}
                    </Button.Group>
                </div>
            </Page.Header>
            <Page.Body>
                {sRuntimePanels.map((sPanelInfo) => {
                    const sIsOverlap = sSelectedPanelKeys.has(
                        sPanelInfo.key,
                    );
                    const sIsRaw = sPanelInfo.mode.isRaw;
                    const sPanelRuntimeProps =
                        boardPanels.getPanelContainerRuntimeProps(sPanelInfo);

                    return (
                        <Page.ContentBlock
                            key={sPanelInfo.key}
                            pHoverNone
                            style={{ padding: '24px 32px' }}
                        >
                            <PanelContainer
                                panelInfo={sPanelInfo}
                                runtime={sPanelRuntimeProps}
                                state={{
                                    isRaw: sIsRaw,
                                    isOverlap: sIsOverlap,
                                }}
                                actions={{
                                    onApplyPanelInfo: applyRuntimePanelInfo,
                                    onSetGlobalTimeRange: handleSetGlobalTimeRange,
                                    onChartAreaWidthChange: (width) =>
                                        boardPanels.handleChartWidthChange(
                                            sPanelInfo,
                                            width,
                                        ),
                                    refreshData: () => {
                                        void boardPanels.refreshPanelData(sPanelInfo);
                                    },
                                    refreshTime: () => {
                                        void boardPanels.refreshPanelTime(sPanelInfo);
                                    },
                                    expandFullRange: () => {
                                        void boardPanels.expandPanelFullRange(sPanelInfo);
                                    },
                                    onSavePanelInfo: saveCurrentTazBoardWithPanel,
                                    reloadAfterEditorSave:
                                        boardPanels.reloadAfterEditorSave,
                                    onToggleRaw: () => togglePanelRawMode(sPanelInfo),
                                    onDeletePanel: () => deletePanel(sPanelInfo),
                                    onToggleOverlap: () =>
                                        togglePanelOverlap(
                                            sPanelInfo,
                                            sPanelRuntimeProps.rangeState,
                                            sIsRaw,
                                        ),
                                }}
                            />
                        </Page.ContentBlock>
                    );
                })}
                <Page.ContentBlock
                    pHoverNone
                    style={{ padding: '24px 32px' }}
                >
                    <Button
                        variant="secondary"
                        fullWidth
                        shadow
                        icon={<PlusCircle size={16} />}
                        onClick={() => setIsNewPanelModal(true)}
                        style={{ height: '60px' }}
                    >
                        New Chart
                    </Button>
                    {sIsNewPanelModal && (
                        <CreateChartModal
                            key={pAvailableSourceTableNames.join(String.fromCharCode(0))}
                            onClose={() => setIsNewPanelModal(false)}
                            pOnAppendPanel={appendPanel}
                            pAvailableSourceTableNames={pAvailableSourceTableNames}
                        />
                    )}
                </Page.ContentBlock>
            </Page.Body>
            {sIsHelpModalOpen && (
                <TagAnalyzerHelpModal
                    onClose={() => setIsHelpModalOpen(false)}
                />
            )}
            {sIsTimeRangeModalOpen && (
                <BoardTimeRangeModal
                    boardTimeRange={sRuntimeBoardInfo.boardTimeRange}
                    onApply={handleApplyBoardTimeRange}
                    onClose={() => setIsTimeRangeModalOpen(false)}
                />
            )}
            {sIsDisplayOverlapModal && (
                <OverlapModal
                    key={sOverlapPanels
                        .map((panel) =>
                            [
                                panel.panelKey,
                                panel.start,
                                panel.duration,
                                panel.isRaw,
                            ].join(':'),
                        )
                        .join('|')}
                    pPanelsInfo={sOverlapPanels}
                    pRollupTableList={pRollupTableList}
                    pSetIsModal={setIsOverlapModalOpen}
                />
            )}
            {sIsTazSaveModalOpen && sTazSaveModalInitialState && (
                <TazSaveModal
                    key={`${sTazSaveModalInitialState.directorySegments.join('/')}/${sTazSaveModalInitialState.fileName}`}
                    initialState={sTazSaveModalInitialState}
                    onClose={() => setIsTazSaveModalOpen(false)}
                    onSave={saveCurrentTazBoardAs}
                    onRecentModalPathChange={pOnRecentModalPathChange}
                />
            )}
        </>
    );
};

function assertPanelKey(panelKey: string): void {
    if (panelKey.length === 0) {
        throw new Error('TagAnalyzer panel is missing an index key.');
    }
}

function updatePanelByKey(
    panels: PanelInfo[],
    panelKey: string,
    updatePanel: (panel: PanelInfo) => PanelInfo,
): PanelInfo[] {
    assertPanelKey(panelKey);

    let sWasMatched = false;
    let sHasChanges = false;
    const sNextPanels = panels.map((panel) => {
        if (panel.key !== panelKey) {
            return panel;
        }

        sWasMatched = true;
        const sUpdatedPanel = updatePanel(panel);
        if (sUpdatedPanel !== panel) {
            sHasChanges = true;
        }

        return sUpdatedPanel;
    });

    if (!sWasMatched) {
        throw new Error(`Cannot update missing TagAnalyzer panel: ${panelKey}`);
    }

    if (sHasChanges) {
        return sNextPanels;
    }

    return panels;
}

function removeRuntimePanel(
    panels: PanelInfo[],
    panelKey: string,
): PanelInfo[] {
    assertPanelKey(panelKey);

    const sNextPanels = panels.filter((panel) => panel.key !== panelKey);
    if (sNextPanels.length === panels.length) {
        throw new Error(`Cannot delete missing TagAnalyzer panel: ${panelKey}`);
    }

    return sNextPanels;
}

function getPanelWithCurrentVisibleRangeForSave(
    panel: PanelInfo,
    rangeState: PanelRangeState,
): PanelInfo {
    if (
        !panel.timeRange.useLastViewedRange ||
        !isValidTimeRange(rangeState.requestPanelRange) ||
        !isValidTimeRange(rangeState.requestNavigatorRange)
    ) {
        return panel;
    }

    const sCurrentLastViewedRange = panel.timeRange.lastViewedRange;
    const sCurrentPanelRange = sCurrentLastViewedRange?.panelRange;
    const sCurrentNavigatorRange = sCurrentLastViewedRange?.navigatorRange;
    const sHasSamePanelRange =
        isValidTimeRange(sCurrentPanelRange) &&
        isSameTimeRange(sCurrentPanelRange, rangeState.requestPanelRange);
    const sHasSameNavigatorRange =
        isValidTimeRange(sCurrentNavigatorRange) &&
        isSameTimeRange(sCurrentNavigatorRange, rangeState.requestNavigatorRange);

    if (sHasSamePanelRange && sHasSameNavigatorRange) {
        return panel;
    }

    return {
        ...panel,
        timeRange: {
            ...panel.timeRange,
            lastViewedRange: {
                panelRange: rangeState.requestPanelRange,
                navigatorRange: rangeState.requestNavigatorRange,
            },
        },
    };
}

function hasConcreteOverlapRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.requestPanelRange) &&
        isValidTimeRange(rangeState.requestNavigatorRange) &&
        isValidTimeRange(rangeState.fullRange)
    );
}

export default TagAnalyzerBoard;
