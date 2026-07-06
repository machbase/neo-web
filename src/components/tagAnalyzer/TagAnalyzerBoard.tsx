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
import RangeModal from './modals/RangeModal';
import TagAnalyzerHelpModal from './modals/TagAnalyzerHelpModal';
import OverlapModal from './board/overlap/OverlapModal';
import PanelSeriesSelectionModal from './modals/createNewPanel/PanelSeriesSelectionModal';
import TazSaveAsModal from './modals/TazSaveAsModal';
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
} from './domain/panel/PanelInfo';
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
    info: BoardInfo;
    isActiveTab: boolean;
    recentModalPath: string;
    fileTree: FileTreeState;
    onSavedBoard: (savedBoard: BoardInfo) => void;
    onFileTreeChange: (tree: FileTreeState) => void;
    onRecentModalPathChange: (path: string) => void;
    rollupTableList: RollupTableMap;
};

const TagAnalyzerBoard = ({
    info,
    isActiveTab,
    recentModalPath,
    fileTree,
    onSavedBoard,
    onFileTreeChange,
    onRecentModalPathChange,
    rollupTableList,
}: TagAnalyzerBoardProps) => {
    const [sIsHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [sIsTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);
    const [sBoardTimeRangeModalLastDataTime, setBoardTimeRangeModalLastDataTime] =
        useState(() => Date.now());
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<GlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
    const [sRuntimeBoardInfo, dispatchRuntimeBoardAction] = useReducer(
        runtimeBoardReducer,
        info,
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
        isActiveTab,
        rollupTableList,
        onPanelRangeStateChange: setPanelRangeState,
        onAppliedRange: overlap.handleAppliedRange,
    });
    const {
        hasUnsavedChanges: sHasUnsavedChanges,
        save: saveCurrentTazBoard,
        saveAs: openTazSaveAsModal,
        saveAsModalProps: sSaveAsModalProps,
    } = useTazBoardSave({
        runtimeBoardInfo: sRuntimeBoardInfo,
        dispatchRuntimeBoardAction,
        isActiveTab,
        recentModalPath,
        fileTree,
        onSavedBoard,
        onFileTreeChange,
        onRecentModalPathChange,
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

    function openBoardTimeRangeModal(): void {
        setBoardTimeRangeModalLastDataTime(Date.now());
        setIsTimeRangeModalOpen(true);
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
            onClick: () => void openTazSaveAsModal(),
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
                            onClick={openBoardTimeRangeModal}
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
                        onClick={() => setIsNewPanelModalOpen(true)}
                        style={{ height: '60px' }}
                    >
                        New Chart
                    </Button>
                    {sIsNewPanelModalOpen && (
                        <PanelSeriesSelectionModal
                            onClose={() => setIsNewPanelModalOpen(false)}
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
                <RangeModal
                    title="Board Time Range"
                    isNumeric={false}
                    timeRange={{
                        initialRangeInput: sRuntimeBoardInfo.boardTimeRange,
                        dataEndTime: sBoardTimeRangeModalLastDataTime,
                        emptyRange: true,
                        onApply: handleApplyBoardTimeRange,
                    }}
                    onClose={() => setIsTimeRangeModalOpen(false)}
                />
            )}
            {overlap.isOverlapModalOpen && (
                <OverlapModal
                    key={buildOverlapModalKey(overlap.overlapPanels)}
                    initialPanels={overlap.overlapPanels}
                    rollupTableList={rollupTableList}
                    onClose={() => overlap.setOverlapModalOpen(false)}
                />
            )}
            {sSaveAsModalProps && (
                <TazSaveAsModal
                    key={`${sSaveAsModalProps.initialState.directorySegments.join('/')}/${sSaveAsModalProps.initialState.fileName}`}
                    initialState={sSaveAsModalProps.initialState}
                    onClose={sSaveAsModalProps.onClose}
                    onSaveAs={sSaveAsModalProps.onSaveAs}
                    onRecentModalPathChange={sSaveAsModalProps.onRecentModalPathChange}
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
