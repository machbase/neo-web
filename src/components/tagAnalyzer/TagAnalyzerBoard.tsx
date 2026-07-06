import './TagAnalyzerBoard.scss';
import { useCallback, useReducer, useState, type ReactNode } from 'react';
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
import { Button, Page } from '@/design-system/components';
import PanelContainer from './panel/PanelContainer';
import TimeRangeModal from './modals/TimeRangeModal';
import TagAnalyzerHelpModal from './modals/TagAnalyzerHelpModal';
import OverlapModal from './board/overlap/OverlapModal';
import PanelSeriesSelectionModal from './modals/createNewPanel/PanelSeriesSelectionModal';
import TazSaveModal from './modals/TazSaveModal';
import type {
    BoardInfo,
    GlobalTimeRangeState,
} from './domain/BoardDomain';
import { formatBoardRangeText } from './domain/time/TimeFormatters';
import {
    getPanelConfigFromRuntimePanel,
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelInfo,
} from './domain/panel/PanelConfig';
import { useTagAnalyzerBoardPanels } from './board/range/useTagAnalyzerBoardPanels';
import { useOverlapSelection } from './board/overlap/useOverlapSelection';
import type { OverlapPanelInfo } from './board/overlap/OverlapTypes';
import {
    createRuntimeBoardInfo,
    runtimeBoardReducer,
    setRuntimePanelConfig,
} from './board/runtimeBoardInfo';
import type { RollupTableMap } from './fetch/panelData/PanelDataFetchTypes';
import { useTazBoardSave } from './persistence/save/useTazBoardSave';
import type { EditableTimeRangeInputResolution } from './domain/time/TimeRangeInputParsing';
import type { FileTreeState } from './appState/useTagAnalyzerAppState';

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
    const {
        hasUnsavedChanges: sHasUnsavedChanges,
        save: saveCurrentTazBoard,
        saveAs: openTazSaveModal,
        saveModalProps: sSaveModalProps,
    } = useTazBoardSave({
        runtimeBoardInfo: sRuntimeBoardInfo,
        dispatchRuntimeBoardAction,
        isActiveTab: pIsActiveTab,
        recentModalPath: pRecentModalPath,
        fileTree: pFileTree,
        onSavedBoard: pOnSavedBoard,
        onFileTreeChange: pOnFileTreeChange,
        onRecentModalPathChange: pOnRecentModalPathChange,
    });

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
        const sPanelInfo = getPanelConfigFromRuntimePanel(runtimePanelInfo);
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
                    {sHasUnsavedChanges && (
                        <span className="tag-analyzer-board-header__unsaved-message">
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
                            const sIsUnsavedSaveButton =
                                action.key === 'save' && sHasUnsavedChanges;

                            return (
                                <Button
                                    key={action.key}
                                    className={
                                        sIsUnsavedSaveButton
                                            ? 'tag-analyzer-board-header__save-button--unsaved'
                                            : undefined
                                    }
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent={
                                        sIsUnsavedSaveButton
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
                                runtime={{
                                    ...sPanelRuntimeProps,
                                    hasUnsavedBoardChanges: sHasUnsavedChanges,
                                }}
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
            {sSaveModalProps && (
                <TazSaveModal
                    key={`${sSaveModalProps.initialDirectoryPath}/${sSaveModalProps.initialFileName}`}
                    initialDirectoryPath={sSaveModalProps.initialDirectoryPath}
                    initialFileName={sSaveModalProps.initialFileName}
                    onClose={sSaveModalProps.onClose}
                    onSave={sSaveModalProps.onSave}
                    onRecentModalPathChange={sSaveModalProps.onRecentModalPathChange}
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
