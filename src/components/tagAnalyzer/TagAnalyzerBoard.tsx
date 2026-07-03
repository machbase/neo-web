import './TagAnalyzerBoard.scss';
import { useCallback, useEffect, useReducer, useState, type ReactNode } from 'react';
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
import TimeRangeModal from './boardModal/TimeRangeModal';
import TagAnalyzerHelpModal from './boardModal/TagAnalyzerHelpModal';
import OverlapModal from './board/overlap/OverlapModal';
import PanelSeriesSelectionModal from './modal/createNewPanel/PanelSeriesSelectionModal';
import TazSaveModal from './boardModal/TazSaveModal';
import {
    loadTazSaveModalInitialState,
    type TazSaveModalInitialState,
} from './boardModal/TazSaveModalLoader';
import type {
    BoardInfo,
    GlobalTimeRangeState,
} from './domain/BoardDomain';
import { formatBoardRangeText } from './formatting/TimeFormatters';
import type {
    PanelInfo,
    PanelRangeState,
    RuntimePanelInfo,
} from './domain/panel/PanelConfig';
import { useTagAnalyzerBoardPanels } from './board/range/useTagAnalyzerBoardPanels';
import { useOverlapSelection } from './board/overlap/useOverlapSelection';
import type { OverlapPanelInfo } from './board/overlap/OverlapTypes';
import {
    createRuntimeBoardInfo,
    getBoardInfoForRuntimeBoardSave,
    getRuntimePanelConfig,
    runtimeBoardReducer,
    setRuntimePanelConfig,
} from './board/runtimeBoardInfo';
import type { RollupTableMap } from './fetch/panelData/PanelDataFetchTypes';
import {
    createSavedTazBoardSnapshot,
    createTazSavedCodeFromBoardInfo,
} from './persistence/save/SavedTazBoardSnapshot';
import { saveBoardInfoToTaz } from './persistence/save/saveBoardInfoToTaz';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import type { EditableTimeRangeInputResolution } from './parsing/TimeRangeInputParsing';
import type { FileTreeState } from './appState/useTagAnalyzerAppState';

const SAVE_ERROR_MESSAGE = 'Failed to save TAZ file. Please try again.';
const SAVE_SUCCESS_MESSAGE = 'TAZ file saved successfully.';
const FILE_TREE_REFRESH_ERROR_MESSAGE = 'TAZ file saved, but file tree refresh failed.';

type TagAnalyzerBoardProps = {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pRecentModalPath: string;
    pFileTree: FileTreeState;
    pOnSavedBoard: (savedBoard: BoardInfo) => void;
    pOnFileTreeChange: (tree: FileTreeState) => void;
    pOnRecentModalPathChange: (path: string) => void;
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
    pRollupTableList,
}: TagAnalyzerBoardProps) => {
    const [sIsHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [sIsTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<GlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModal, setIsNewPanelModal] = useState(false);
    const [sRuntimeBoardInfo, dispatchRuntimeBoardAction] = useReducer(
        runtimeBoardReducer,
        pInfo,
        createRuntimeBoardInfo,
    );
    const [sSavedRuntimeBoardCode, setSavedRuntimeBoardCode] = useState(
        () => pInfo.savedCode,
    );
    const [sIsTazSaveModalOpen, setIsTazSaveModalOpen] = useState(false);
    const [sTazSaveModalInitialState, setTazSaveModalInitialState] =
        useState<TazSaveModalInitialState | undefined>(undefined);
    const sRuntimePanels = sRuntimeBoardInfo.panels;
    const sRangeText = formatBoardRangeText(sRuntimeBoardInfo.boardTimeRange);

    const setPanelRangeState = useCallback((
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ): void => {
        dispatchRuntimeBoardAction({
            type: 'SET_PANEL_RANGE',
            panelKey: panelInfo.key,
            rangeState,
        });
    }, []);

    const setPanelOverlapSelected = useCallback((
        panelKey: string,
        isOverlapSelected: boolean,
    ): void => {
        dispatchRuntimeBoardAction({
            type: 'SET_PANEL_OVERLAP_SELECTED',
            panelKey,
            isOverlapSelected,
        });
    }, []);

    const overlap = useOverlapSelection(
        sRuntimePanels,
        setPanelOverlapSelected,
    );
    const boardPanels = useTagAnalyzerBoardPanels({
        panels: sRuntimePanels,
        boardTime: sRuntimeBoardInfo.boardTimeRange,
        globalTimeRange: sGlobalDataAndNavigatorTime,
        isActiveTab: pIsActiveTab,
        rollupTableList: pRollupTableList,
        onPanelRangeStateChange: setPanelRangeState,
        onAppliedRange: overlap.handleAppliedRange,
    });
    const sRuntimeBoardInfoForSave = getBoardInfoForRuntimeBoardSave(
        sRuntimeBoardInfo,
    );
    const sIsRuntimeBoardDirty =
        createTazSavedCodeFromBoardInfo(sRuntimeBoardInfoForSave) !==
        sSavedRuntimeBoardCode;

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

    const applySavedBoardInfo = useCallback((savedBoardInfo: BoardInfo): void => {
        const sSavedBoardInfo = createSavedTazBoardSnapshot(savedBoardInfo);

        dispatchRuntimeBoardAction({
            type: 'REPLACE_FROM_SAVED_BOARD',
            boardInfo: sSavedBoardInfo,
        });
        setSavedRuntimeBoardCode(sSavedBoardInfo.savedCode);
        pOnSavedBoard(sSavedBoardInfo);
    }, [pOnSavedBoard]);

    const saveBoardInfo = useCallback(async (boardInfo: BoardInfo): Promise<boolean> => {
        const sDidSave = await saveBoardInfoToTaz(boardInfo);

        if (!sDidSave) {
            Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        }

        applySavedBoardInfo(boardInfo);
        Toast.success(SAVE_SUCCESS_MESSAGE);
        return true;
    }, [applySavedBoardInfo]);

    const saveCurrentTazBoard = useCallback(async (): Promise<boolean> => {
        if (!sRuntimeBoardInfo.path) {
            await openTazSaveModal();
            return false;
        }

        return saveBoardInfo(getBoardInfoForRuntimeBoardSave(sRuntimeBoardInfo));
    }, [openTazSaveModal, saveBoardInfo, sRuntimeBoardInfo]);

    const saveCurrentTazBoardWithPanel = useCallback(async (
        panel: PanelInfo,
    ): Promise<boolean> => {
        const sRuntimeBoardWithPanel = runtimeBoardReducer(
            sRuntimeBoardInfo,
            { type: 'APPLY_PANEL_CONFIG', panelInfo: panel },
        );
        const sBoardWithPanel = getBoardInfoForRuntimeBoardSave(
            sRuntimeBoardWithPanel,
        );

        if (!sBoardWithPanel.path) {
            dispatchRuntimeBoardAction({
                type: 'APPLY_PANEL_CONFIG',
                panelInfo: panel,
            });
            await openTazSaveModal();
            return false;
        }

        return saveBoardInfo(sBoardWithPanel);
    }, [openTazSaveModal, saveBoardInfo, sRuntimeBoardInfo]);

    const saveCurrentTazBoardAs = useCallback(async (
        directoryPath: string,
        fileName: string,
    ): Promise<boolean> => {
        const sBoardToSave = getBoardInfoForRuntimeBoardSave({
            ...sRuntimeBoardInfo,
            name: fileName,
            path: directoryPath,
        });
        const sDidSave = await saveBoardInfo(sBoardToSave);

        if (!sDidSave) {
            return false;
        }

        try {
            const sUpdatedTreeResult = await TreeFetchDrilling(
                pFileTree,
                `${directoryPath}${fileName}`,
                true,
            );
            if (sUpdatedTreeResult?.tree) {
                pOnFileTreeChange(JSON.parse(JSON.stringify(sUpdatedTreeResult.tree)));
            }
        } catch {
            Toast.error(FILE_TREE_REFRESH_ERROR_MESSAGE);
        }

        return true;
    }, [pFileTree, pOnFileTreeChange, saveBoardInfo, sRuntimeBoardInfo]);

    function handleApplyBoardTimeRange(
        timeRangeInput: EditableTimeRangeInputResolution,
    ): void {
        if (timeRangeInput.status === 'invalid') {
            return;
        }

        dispatchRuntimeBoardAction({
            type: 'SET_BOARD_TIME_RANGE',
            boardTimeRange: timeRangeInput.rangeInput,
        });
        boardPanels.applyBoardTimeRangeToPanels(timeRangeInput.rangeInput);
    }

    function handleSetGlobalTimeRange(globalTimeRange: GlobalTimeRangeState): void {
        setGlobalDataAndNavigatorTime(globalTimeRange);
        boardPanels.applyGlobalRangeToPanels(globalTimeRange);
    }

    function applyRuntimePanelInfo(panel: PanelInfo): void {
        dispatchRuntimeBoardAction({
            type: 'APPLY_PANEL_CONFIG',
            panelInfo: panel,
        });
    }

    function appendPanel(panel: PanelInfo): void {
        dispatchRuntimeBoardAction({
            type: 'APPEND_PANEL_CONFIG',
            panelInfo: panel,
        });
    }

    function togglePanelRawMode(runtimePanelInfo: RuntimePanelInfo): void {
        const sPanelInfo = getRuntimePanelConfig(runtimePanelInfo);
        const sNextPanelInfo: PanelInfo = {
            ...sPanelInfo,
            mode: {
                ...sPanelInfo.mode,
                isRaw: !sPanelInfo.mode.isRaw,
            },
        };
        const sNextRuntimePanelInfo = setRuntimePanelConfig(
            runtimePanelInfo,
            sNextPanelInfo,
        );

        applyRuntimePanelInfo(sNextPanelInfo);
        overlap.handleAppliedRange(
            sNextRuntimePanelInfo,
            sNextRuntimePanelInfo.time.runtimeRange,
        );
    }

    function deletePanel(runtimePanelInfo: RuntimePanelInfo): void {
        overlap.removePanelFromOverlap(runtimePanelInfo.key);
        dispatchRuntimeBoardAction({
            type: 'REMOVE_PANEL',
            panelKey: runtimePanelInfo.key,
        });
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
            tooltip: overlap.compatibilityMessage ?? 'Overlap chart',
            icon: <MdOutlineStackedLineChart size={16} />,
            onClick: overlap.openOverlapChart,
            disabled: overlap.overlapPanels.length === 0,
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
                {sRuntimePanels.map((sRuntimePanelInfo) => {
                    const sPanelRuntimeProps =
                        boardPanels.getPanelContainerRuntimeProps(sRuntimePanelInfo);

                    return (
                        <Page.ContentBlock
                            key={sRuntimePanelInfo.key}
                            pHoverNone
                            style={{ padding: '24px 32px' }}
                        >
                            <PanelContainer
                                runtimePanelInfo={sRuntimePanelInfo}
                                runtime={sPanelRuntimeProps}
                                actions={{
                                    onApplyPanelInfo: applyRuntimePanelInfo,
                                    onSetGlobalTimeRange: handleSetGlobalTimeRange,
                                    onChartAreaWidthChange: (width) =>
                                        boardPanels.handleChartWidthChange(
                                            sRuntimePanelInfo,
                                            width,
                                        ),
                                    refreshData: () => {
                                        void boardPanels.refreshPanelData(
                                            sRuntimePanelInfo.key,
                                        );
                                    },
                                    refreshTime: () => {
                                        void boardPanels.refreshPanelTime(
                                            sRuntimePanelInfo.key,
                                        );
                                    },
                                    expandFullRange: () => {
                                        void boardPanels.expandPanelFullRange(
                                            sRuntimePanelInfo.key,
                                        );
                                    },
                                    onSavePanelInfo: saveCurrentTazBoardWithPanel,
                                    reloadAfterEditorSave:
                                        boardPanels.reloadAfterEditorSave,
                                    onToggleRaw: () =>
                                        togglePanelRawMode(sRuntimePanelInfo),
                                    onDeletePanel: () => deletePanel(sRuntimePanelInfo),
                                    onToggleOverlap: () =>
                                        overlap.togglePanelOverlap(
                                            sRuntimePanelInfo,
                                            sRuntimePanelInfo.time.runtimeRange,
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
                        <PanelSeriesSelectionModal
                            onClose={() => setIsNewPanelModal(false)}
                            onCreatePanel={appendPanel}
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
                <TimeRangeModal
                    rangeKind="time"
                    title="Board Time Range"
                    timeRange={sRuntimeBoardInfo.boardTimeRange}
                    lastDataTime={Date.now()}
                    allowEmptyTimeRange={true}
                    onApply={handleApplyBoardTimeRange}
                    onClose={() => setIsTimeRangeModalOpen(false)}
                />
            )}
            {overlap.isOverlapModalOpen && (
                <OverlapModal
                    key={buildOverlapModalKey(overlap.overlapPanels)}
                    pPanelsInfo={overlap.overlapPanels}
                    pRollupTableList={pRollupTableList}
                    pSetIsModal={overlap.setOverlapModalOpen}
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

// Remounts the overlap chart whenever the compared panel set, ranges, or series change
function buildOverlapModalKey(overlapPanels: OverlapPanelInfo[]): string {
    return overlapPanels
        .map((panel) =>
            [
                panel.panelKey,
                panel.runtimeRange.startTime,
                panel.runtimeRange.endTime,
                panel.panelInfo.mode.isRaw,
                panel.panelInfo.query.tagSet
                    .map((series) => series.key)
                    .join(','),
            ].join(':'),
        )
        .join('|');
}

export default TagAnalyzerBoard;
