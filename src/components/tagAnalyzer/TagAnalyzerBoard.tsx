import { useCallback, useEffect, useState } from 'react';
import { MdHelpOutline as Help } from 'react-icons/md';
import {
    Calendar,
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
    OverlapSelectionChangePayload,
    SetGlobalTimeRangePayload,
} from './domain/BoardDomain';
import type { TimeRangeConfig } from './domain/time/TimeTypes';
import { formatBoardRangeText } from './domain/time/TimeFormatters';
import { isConcreteTimeRange, isSameTimeRange } from './domain/time/TimeRangeUtils';
import type { PanelInfo, PanelRangeState } from './domain/PanelDomain';
import {
    MIXED_X_AXIS_KIND_WARNING,
    getSeriesListKeyAxisKind,
    hasMixedXAxisValueKinds,
} from './domain/SeriesDomain';
import { useTagAnalyzerBoardPanels } from './board/useTagAnalyzerBoardPanels';
import { getNextOverlapSelections } from './boardModal/OverlapComparisonUtils';
import type { PersistedTazPanelInfo } from './persistence/TazPersistenceTypesV200';
import type { SaveableTazBoard } from './appState/SavedTazBoardSnapshot';
import { saveTaz, saveAsTaz } from './appState/saveTazBoard';
import {
    parseLoadedPanelTaz,
    parseLoadedTaz,
} from './persistence/load/parseLoadedTaz';
import { TreeFetchDrilling } from '@/utils/UpdateTree';

type TagAnalyzerBoardProps = {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pRecentModalPath: string;
    pFileTree: any;
    pOnSavedBoard: (savedBoard: SaveableTazBoard) => void;
    pOnFileTreeChange: (tree: any) => void;
    pOnRecentModalPathChange: (path: string) => void;
    pAvailableSourceTableNames: string[];
    pRollupTableList: string[];
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

    function refreshAllPanelData(): void {
        boardPanels.refreshAllPanelData();
    }

    function refreshAllPanelTime(): void {
        boardPanels.refreshAllPanelTime();
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
        setRuntimeBoardInfo(parseLoadedTaz(savedBoard));
        pOnSavedBoard(savedBoard);
    }, [pOnSavedBoard]);

    const saveCurrentTazBoard = useCallback(async (): Promise<boolean> => {
        if (!sRuntimeBoardInfo.path) {
            await openTazSaveModal();
            return false;
        }

        try {
            const sSaveResult = await saveTaz(sRuntimeBoardInfo);
            if (!sSaveResult.success || !sSaveResult.savedBoard) {
                Toast.error('Failed to save TAZ file. Please try again.');
                return false;
            }

            applySavedRuntimeBoard(sSaveResult.savedBoard);
            Toast.success('TAZ file saved successfully.');
            return true;
        } catch {
            Toast.error('Failed to save TAZ file. Please try again.');
            return false;
        }
    }, [applySavedRuntimeBoard, openTazSaveModal, sRuntimeBoardInfo]);

    const saveCurrentTazBoardAs = useCallback(async (
        directoryPath: string,
        fileName: string,
    ): Promise<boolean> => {
        try {
            const sSaveResult = await saveAsTaz({
                board: sRuntimeBoardInfo,
                directoryPath,
                fileName,
            });
            if (!sSaveResult.success || !sSaveResult.savedBoard) {
                Toast.error('Failed to save TAZ file. Please try again.');
                return false;
            }

            applySavedRuntimeBoard(sSaveResult.savedBoard);
            Toast.success('TAZ file saved successfully.');

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
            Toast.error('Failed to save TAZ file. Please try again.');
            return false;
        }
    }, [applySavedRuntimeBoard, pFileTree, pOnFileTreeChange, sRuntimeBoardInfo]);

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
        payload: OverlapSelectionChangePayload,
    ): void {
        setOverlapSelections((prev) => getNextOverlapSelections(prev, payload));
    }

    function getPanelOverlapAxisKind(panel: PanelInfo) {
        return getSeriesListKeyAxisKind(panel.data.tag_set);
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
                        selectedPanel.data.index_key === selection.panelKey,
                ),
            )
            .filter((selectedPanel): selectedPanel is PanelInfo =>
                Boolean(selectedPanel),
            )
            .map(getPanelOverlapAxisKind)
            .find((axisKind) => axisKind !== undefined);

        return sSelectedAxisKind && sSelectedAxisKind !== sPanelAxisKind
            ? 'Overlap can only compare panels with the same x-axis type.'
            : undefined;
    }

    function getOverlapPanelsCompatibilityMessage(
        panels: OverlapPanelInfo[],
    ): string | undefined {
        const sAxisKinds = panels
            .map((panel) => getPanelOverlapAxisKind(panel.board))
            .filter((axisKind) => axisKind !== undefined);

        return new Set(sAxisKinds).size > 1
            ? 'Overlap can only compare panels with the same x-axis type.'
            : undefined;
    }

    function getPanelInfoWithRawMode(panel: PanelInfo, isRaw: boolean): PanelInfo {
        return panel.general.is_raw === isRaw
            ? panel
            : {
                  ...panel,
                  general: {
                      ...panel.general,
                      is_raw: isRaw,
                  },
              };
    }

    function getSelectedOverlapPanels(): OverlapPanelInfo[] {
        return sOverlapSelections.flatMap((selection) => {
            const sPanel = sRuntimePanels.find(
                (panel) => panel.data.index_key === selection.panelKey,
            );

            if (!sPanel) {
                return [];
            }

            return [
                {
                    start: selection.start,
                    duration: selection.duration,
                    isRaw: selection.isRaw,
                    board: getPanelInfoWithRawMode(sPanel, selection.isRaw),
                },
            ];
        });
    }

    function savePanel(panel: PanelInfo): void {
        setRuntimeBoardInfo((prev) => ({
            ...prev,
            panels: replaceRuntimePanel(prev.panels, panel),
        }));
    }

    function appendPanel(panel: PersistedTazPanelInfo): void {
        const sPanelInfo = parseLoadedPanelTaz(panel);

        setRuntimeBoardInfo((prev) => ({
            ...prev,
            panels: prev.panels.concat(sPanelInfo),
        }));
    }

    function togglePanelRawMode(
        panel: PanelInfo,
        reloadAfterRawModeChange: (panelInfo: PanelInfo) => void,
    ): void {
        const sNextRawMode = !panel.general.is_raw;
        const sNextPanelInfo = getPanelInfoWithRawMode(panel, sNextRawMode);

        savePanel(sNextPanelInfo);
        reloadAfterRawModeChange(sNextPanelInfo);
    }

    function togglePanelOverlap(
        panel: PanelInfo,
        rangeState: PanelRangeState,
        isRaw: boolean,
    ): void {
        const sIsAlreadySelected = sSelectedPanelKeys.has(panel.data.index_key);

        if (sIsAlreadySelected) {
            updateOverlapSelection({
                start: rangeState.panelRange.startTime,
                end: rangeState.panelRange.endTime,
                panelKey: panel.data.index_key,
                isRaw,
                changeType: undefined,
            });
            return;
        }

        if (hasMixedXAxisValueKinds(panel.data.tag_set)) {
            Toast.warning(
                `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled for this panel.`,
                undefined,
            );
            return;
        }

        if (panel.data.tag_set.length !== 1) {
            Toast.warning('Overlap requires a single-series panel.', undefined);
            return;
        }

        const sAxisKindMismatchMessage = getOverlapAxisKindMismatchMessage(panel);
        if (sAxisKindMismatchMessage) {
            Toast.warning(sAxisKindMismatchMessage, undefined);
            return;
        }

        updateOverlapSelection({
            start: rangeState.panelRange.startTime,
            end: rangeState.panelRange.endTime,
            panelKey: panel.data.index_key,
            isRaw,
            changeType: undefined,
        });
    }

    function deletePanel(panel: PanelInfo): void {
        updateOverlapSelection({
            panelKey: panel.data.index_key,
            changeType: 'delete',
        });
        setRuntimeBoardInfo((prev) => ({
            ...prev,
            panels: removeRuntimePanel(prev.panels, panel.data.index_key),
        }));
    }

    function handleRuntimeAppliedRange(
        panel: PanelInfo,
        rangeState: PanelRangeState,
    ): void {
        if (
            panel.general.use_last_viewed_range &&
            isConcreteTimeRange(rangeState.panelRange) &&
            isConcreteTimeRange(rangeState.navigatorRange)
        ) {
            setRuntimeBoardInfo((prev) => {
                const sNextPanels = applyRuntimePanelLastViewedRange(
                    prev.panels,
                    panel,
                    rangeState,
                );

                return sNextPanels === prev.panels
                    ? prev
                    : {
                          ...prev,
                          panels: sNextPanels,
                      };
            });
        }

        if (
            !sSelectedPanelKeys.has(panel.data.index_key) ||
            !isConcreteTimeRange(rangeState.panelRange)
        ) {
            return;
        }

        updateOverlapSelection({
            start: rangeState.panelRange.startTime,
            end: rangeState.panelRange.endTime,
            panelKey: panel.data.index_key,
            isRaw: panel.general.is_raw,
            changeType: 'changed',
        });
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

    return (
        <>
            <Page.Header>
                <Page.Space />
                <Button.Group>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsTimeRangeModalOpen(true)}
                    >
                        <Calendar style={{ paddingRight: '8px' }} />
                        {sRangeText || 'Time range not set'}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Refresh data"
                        icon={<Refresh size={15} />}
                        onClick={refreshAllPanelData}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Refresh time"
                        icon={<LuTimerReset size={16} />}
                        onClick={refreshAllPanelTime}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Save"
                        icon={<Save size={16} />}
                        onClick={() => void saveCurrentTazBoard()}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Save as"
                        icon={<SaveAs size={16} />}
                        onClick={() => void openTazSaveModal()}
                    />
                    <Button
                        disabled={sOverlapPanels.length === 0}
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent={
                            sOverlapCompatibilityMessage ?? 'Overlap chart'
                        }
                        icon={<MdOutlineStackedLineChart size={16} />}
                        onClick={openOverlapChart}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="help"
                        icon={<Help size={16} />}
                        onClick={() => setIsHelpModalOpen(true)}
                        aria-label="Open help"
                    />
                </Button.Group>
            </Page.Header>
            <Page.Body>
                {sRuntimePanels.map((sPanelInfo) => {
                    const sIsOverlap = sSelectedPanelKeys.has(
                        sPanelInfo.data.index_key,
                    );
                    const sIsRaw = sPanelInfo.general.is_raw;
                    const sPanelRuntimeProps =
                        boardPanels.getPanelContainerRuntimeProps(sPanelInfo);

                    return (
                        <Page.ContentBlock
                            key={sPanelInfo.data.index_key}
                            pHoverNone
                            style={{ padding: '24px 32px' }}
                        >
                            <PanelContainer
                                panelInfo={sPanelInfo}
                                runtime={sPanelRuntimeProps}
                                state={{
                                    isRaw: sIsRaw,
                                    isRawLocked: false,
                                    isOverlap: sIsOverlap,
                                }}
                                actions={{
                                    onSavePanel: savePanel,
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
                                    reloadAfterEditorSave:
                                        boardPanels.reloadAfterEditorSave,
                                    onToggleRaw: () =>
                                        togglePanelRawMode(
                                            sPanelInfo,
                                            boardPanels.reloadAfterRawModeChange,
                                        ),
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
                    />
                    {sIsNewPanelModal && (
                        <CreateChartModal
                            key={pAvailableSourceTableNames.join('\u0000')}
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
                                panel.board.data.index_key,
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

function replaceRuntimePanel(
    panels: PanelInfo[],
    panelInfo: PanelInfo,
): PanelInfo[] {
    const sPanelKey = panelInfo.data.index_key;
    if (sPanelKey.length === 0) {
        throw new Error('Cannot save a TagAnalyzer panel without an index key.');
    }

    let sWasReplaced = false;
    const sNextPanels = panels.map((panel) => {
        if (panel.data.index_key !== sPanelKey) {
            return panel;
        }

        sWasReplaced = true;
        return panelInfo;
    });

    if (!sWasReplaced) {
        throw new Error(`Cannot save missing TagAnalyzer panel: ${sPanelKey}`);
    }

    return sNextPanels;
}

function removeRuntimePanel(
    panels: PanelInfo[],
    panelKey: string,
): PanelInfo[] {
    if (panelKey.length === 0) {
        throw new Error('Cannot delete a TagAnalyzer panel without an index key.');
    }

    let sWasRemoved = false;
    const sNextPanels = panels.filter((panel) => {
        const sShouldKeepPanel = panel.data.index_key !== panelKey;
        if (!sShouldKeepPanel) {
            sWasRemoved = true;
        }

        return sShouldKeepPanel;
    });

    if (!sWasRemoved) {
        throw new Error(`Cannot delete missing TagAnalyzer panel: ${panelKey}`);
    }

    return sNextPanels;
}

function applyRuntimePanelLastViewedRange(
    panels: PanelInfo[],
    panelInfo: PanelInfo,
    rangeState: PanelRangeState,
): PanelInfo[] {
    const sPanelKey = panelInfo.data.index_key;
    if (sPanelKey.length === 0) {
        throw new Error('Cannot persist a TagAnalyzer panel range without an index key.');
    }

    let sWasMatched = false;
    let sHasChanges = false;
    const sNextPanels = panels.map((panel) => {
        if (panel.data.index_key !== sPanelKey) {
            return panel;
        }

        sWasMatched = true;
        const sCurrentLastViewedRange = panel.general.last_viewed_range;
        const sCurrentPanelRange = sCurrentLastViewedRange?.panelRange;
        const sCurrentNavigatorRange = sCurrentLastViewedRange?.navigatorRange;
        const sHasSamePanelRange =
            isConcreteTimeRange(sCurrentPanelRange) &&
            isSameTimeRange(
                sCurrentPanelRange,
                rangeState.panelRange,
            );
        const sHasSameNavigatorRange =
            isConcreteTimeRange(sCurrentNavigatorRange) &&
            isSameTimeRange(
                sCurrentNavigatorRange,
                rangeState.navigatorRange,
            );

        if (
            panel.general.is_raw === panelInfo.general.is_raw &&
            sHasSamePanelRange &&
            sHasSameNavigatorRange
        ) {
            return panel;
        }

        sHasChanges = true;
        return {
            ...panel,
            general: {
                ...panel.general,
                is_raw: panelInfo.general.is_raw,
                last_viewed_range: {
                    panelRange: rangeState.panelRange,
                    navigatorRange: rangeState.navigatorRange,
                },
            },
        };
    });

    if (!sWasMatched) {
        throw new Error(`Cannot persist range for missing TagAnalyzer panel: ${sPanelKey}`);
    }

    return sHasChanges ? sNextPanels : panels;
}

export default TagAnalyzerBoard;
