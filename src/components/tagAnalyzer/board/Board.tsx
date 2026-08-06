import './Board.scss';
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
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
import Panel from '../panel/Panel';
import { RangeModal } from '../range/RangeModal';
import { HelpModal } from './HelpModal';
import OverlapModal from '../overlap/OverlapModal';
import { CreatePanelModal } from '../setup/CreatePanelModal';
import { SaveAsModal } from './SaveAsModal';
import type { BoardInfo } from './boardModel';
import type { PanelInfo } from '../panel/panelModel';
import {
    getSeriesListAxisKind,
    type RollupTableMap,
} from '../seriesModel';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeState,
    type RangeExpressionInput,
    type ResolvedRangeState,
} from '../range/rangeModel';

import {
    usePanelRangeRuntime,
    type PanelRangeRuntimeRequests,
} from '../panel/usePanelRangeRuntime';
import { useBoardState } from './useBoardState';
import { useBoardOverlapSelection } from './useBoardOverlapSelection';
import {
    isTazBoardSaved,
    saveTazBoard,
} from '../persistence/tazDocumentService';

const SAVE_ERROR_MESSAGE = 'Failed to save TAZ file. Please try again.';
const SAVE_SUCCESS_MESSAGE = 'TAZ file saved successfully.';
const FILE_TREE_REFRESH_ERROR_MESSAGE =
    'TAZ file saved, but file tree refresh failed.';

const INITIAL_PANEL_BROADCAST_VERSIONS = {
    boardTimeRange: 0,
    boardNumericRange: 0,
    globalRange: 0,
    refreshData: 0,
    refreshRange: 0,
    expandFullRange: 0,
};

type PanelBroadcastVersions =
    typeof INITIAL_PANEL_BROADCAST_VERSIONS;

type BoardProps = {
    info: BoardInfo;
    isActiveTab: boolean;
    onSavedBoard: (savedBoard: BoardInfo) => void;
    onFileSaved: (directoryPath: string, fileName: string) => Promise<void>;
    rollupTableList: RollupTableMap;
};

type BoardPanelProps = {
    panelInfo: PanelInfo;
    rangeState: ResolvedRangeState | undefined;
    rangeRequests: PanelRangeRuntimeRequests;
    isActive: boolean;
    hasUnsavedBoardChanges: boolean;
    rollupTableList: RollupTableMap;
    onPanelRangeStateChange: (
        panelKey: string,
        rangeState: ResolvedRangeState,
    ) => void;
    onBroadcastError: (broadcastKey: string, message: string) => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (globalTimeRange: RangeState) => void;
    onDeletePanel: (panelKey: string) => void;
    onToggleOverlap: (panelKey: string) => void;
};

const BoardPanel = memo(function BoardPanel({
    panelInfo,
    rangeState,
    rangeRequests,
    isActive,
    hasUnsavedBoardChanges,
    rollupTableList,
    onPanelRangeStateChange,
    onBroadcastError,
    onApplyPanelInfo,
    onSetGlobalTimeRange,
    onDeletePanel,
    onToggleOverlap,
}: BoardPanelProps) {
    const handleRangeStateChange = useCallback(
        (nextRangeState: ResolvedRangeState) =>
            onPanelRangeStateChange(panelInfo.key, nextRangeState),
        [onPanelRangeStateChange, panelInfo.key],
    );
    const panelRangeRuntime = usePanelRangeRuntime({
        panelInfo,
        rangeState,
        ...rangeRequests,
        isActive,
        onRangeStateChange: handleRangeStateChange,
        onBroadcastError,
    });

    return (
        <Page.ContentBlock pHoverNone>
            <Panel
                panelInfo={panelInfo}
                rangeState={rangeState}
                runtime={{
                    chartAreaWidth: panelRangeRuntime.chartAreaWidth,
                    dataRefreshVersion:
                        panelRangeRuntime.dataRefreshVersion,
                    isActive,
                    hasUnsavedBoardChanges,
                    rollupTableList,
                }}
                actions={{
                    ...panelRangeRuntime.actions,
                    onApplyPanelInfo,
                    onSetGlobalTimeRange,
                    onDeletePanel: () => onDeletePanel(panelInfo.key),
                    onToggleOverlap: () => onToggleOverlap(panelInfo.key),
                }}
            />
        </Page.ContentBlock>
    );
});

export default function Board({
    info,
    isActiveTab,
    onSavedBoard,
    onFileSaved,
    rollupTableList,
}: BoardProps) {
    const [sIsHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [sIsBoardRangeModalOpen, setIsBoardRangeModalOpen] = useState(false);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<RangeState | undefined>(undefined);
    const [sIsNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
    const [sIsSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [sBoardRangeKind, setBoardRangeKind] = useState<AxisKind>(() =>
        getInitialBoardRangeKind(info),
    );
    const [
        sPanelBroadcastVersions,
        incrementBroadcastVersion,
    ] = useReducer(
        (
            versions: PanelBroadcastVersions,
            key: keyof PanelBroadcastVersions,
        ): PanelBroadcastVersions => ({
            ...versions,
            [key]: versions[key] + 1,
        }),
        INITIAL_PANEL_BROADCAST_VERSIONS,
    );
    const sSaveRequestGenerationRef = useRef(0);
    const sReportedBroadcastErrorsRef = useRef(new Set<string>());
    const sActiveBoardIdRef = useRef(info.id);
    sActiveBoardIdRef.current = info.id;
    const {
        state: sBoardState,
        infoForSave: sBoardInfoForSave,
        commands: {
            setBoardRange,
            applyPanelInfo,
            appendPanel,
            removePanel,
            setPanelOverlapSelected,
            setPanelRange,
            applySaveResult,
        },
    } = useBoardState(info);
    const sBoardInfo = sBoardState.info;
    const sPanels = sBoardInfo.panels;
    const sPanelRanges = sBoardState.panelRanges;
    const overlap = useBoardOverlapSelection(
        sPanels,
        sPanelRanges,
        setPanelOverlapSelected,
    );
    const { closeOverlapChart } = overlap;
    const sIsNumericBoardRange = sBoardRangeKind === 'numeric';
    const sBoardRangeInput =
        sIsNumericBoardRange
            ? sBoardInfo.boardNumericRange
            : sBoardInfo.boardTimeRange;
    const sBoardRangeReferences = {
        time: getBoardRangeReference(sPanels, sPanelRanges, 'time'),
        numeric: getBoardRangeReference(sPanels, sPanelRanges, 'numeric'),
    };
    const sBoardRangeReference = sBoardRangeReferences[sBoardRangeKind];
    const sBoardRangeButtonLabel =
        sBoardRangeInput.start.trim() === '' ||
        sBoardRangeInput.end.trim() === ''
            ? 'Board range'
            : `${sIsNumericBoardRange ? 'Numeric' : 'Time'}: ${sBoardRangeInput.start}~${sBoardRangeInput.end}`;
    const sPanelRangeRequests = useMemo<PanelRangeRuntimeRequests>(
        () => ({
            boardRanges: {
                time: {
                    input: sBoardInfo.boardTimeRange,
                    applyVersion:
                        sPanelBroadcastVersions.boardTimeRange,
                },
                numeric: {
                    input: sBoardInfo.boardNumericRange,
                    applyVersion:
                        sPanelBroadcastVersions.boardNumericRange,
                },
            },
            globalRangeRequest: {
                range: sGlobalDataAndNavigatorTime,
                applyVersion: sPanelBroadcastVersions.globalRange,
            },
            commandVersions: {
                refreshDataVersion:
                    sPanelBroadcastVersions.refreshData,
                refreshRangeVersion:
                    sPanelBroadcastVersions.refreshRange,
                expandFullRangeVersion:
                    sPanelBroadcastVersions.expandFullRange,
            },
        }),
        [
            sBoardInfo.boardNumericRange,
            sBoardInfo.boardTimeRange,
            sGlobalDataAndNavigatorTime,
            sPanelBroadcastVersions,
        ],
    );
    const reportBroadcastError = useCallback(
        (broadcastKey: string, message: string): void => {
            const sErrorKey = `${broadcastKey}\0${message}`;
            if (sReportedBroadcastErrorsRef.current.has(sErrorKey)) {
                return;
            }

            sReportedBroadcastErrorsRef.current.add(sErrorKey);
            Toast.error(message);
        },
        [],
    );
    const sHasUnsavedChanges = !isTazBoardSaved(sBoardInfoForSave);

    useEffect(() => () => {
        sSaveRequestGenerationRef.current += 1;
        sActiveBoardIdRef.current = '';
    }, []);

    const saveBoard = useCallback(async (
        destination?: { directoryPath: string; fileName: string },
    ): Promise<boolean> => {
        const sBoardToSerialize = sBoardInfoForSave;

        if (!destination && !sBoardToSerialize.path) {
            setIsSaveAsModalOpen(true);
            return false;
        }

        const sRequestGeneration = ++sSaveRequestGenerationRef.current;

        const sBoardToSave: BoardInfo = destination
            ? {
                  ...sBoardToSerialize,
                  path: destination.directoryPath,
                  name: destination.fileName,
              }
            : sBoardToSerialize;
        const isCurrentSaveRequest = (): boolean =>
            sSaveRequestGenerationRef.current === sRequestGeneration &&
            sActiveBoardIdRef.current === sBoardToSave.id;
        const sSavedBoard = await saveTazBoard(sBoardToSave);

        if (!sSavedBoard) {
            if (isCurrentSaveRequest()) {
                Toast.error(SAVE_ERROR_MESSAGE);
            }
            return false;
        }

        if (!isCurrentSaveRequest()) {
            return false;
        }

        applySaveResult(sSavedBoard);
        onSavedBoard(sSavedBoard);
        Toast.success(SAVE_SUCCESS_MESSAGE);

        if (destination) {
            try {
                await onFileSaved(
                    destination.directoryPath,
                    destination.fileName,
                );
            } catch {
                Toast.error(FILE_TREE_REFRESH_ERROR_MESSAGE);
            }
        }

        return isCurrentSaveRequest();
    }, [
        applySaveResult,
        onFileSaved,
        onSavedBoard,
        sBoardInfoForSave,
    ]);

    const closeSaveAsModal = useCallback(
        () => setIsSaveAsModalOpen(false),
        [],
    );

    useEffect(() => {
        if (isActiveTab) return;

        setIsHelpModalOpen(false);
        setIsBoardRangeModalOpen(false);
        setIsNewPanelModalOpen(false);
        closeSaveAsModal();
        closeOverlapChart();
    }, [closeOverlapChart, closeSaveAsModal, isActiveTab]);

    useEffect(() => {
        if (!isActiveTab) return undefined;

        function handleDocumentSaveShortcut(event: KeyboardEvent): void {
            if (
                !(event.ctrlKey || event.metaKey) ||
                event.key.toLowerCase() !== 's'
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            void saveBoard();
        }

        document.addEventListener('keydown', handleDocumentSaveShortcut, true);
        return () =>
            document.removeEventListener(
                'keydown',
                handleDocumentSaveShortcut,
                true,
            );
    }, [isActiveTab, saveBoard]);

    function applyBoardRange(
        rangeKind: AxisKind,
        rangeInput: RangeExpressionInput,
    ): void {
        setBoardRange(rangeKind, rangeInput);
        incrementBroadcastVersion(
            rangeKind === 'time'
                ? 'boardTimeRange'
                : 'boardNumericRange',
        );
    }

    const handleSetGlobalTimeRange = useCallback((
        globalTimeRange: RangeState,
    ): void => {
        setGlobalDataAndNavigatorTime(globalTimeRange);
        incrementBroadcastVersion('globalRange');
    }, []);

    const sHeaderActions = [
        {
            key: 'refresh-data',
            toolTipContent: 'Refresh data',
            icon: <Refresh size={15} />,
            onClick: () => incrementBroadcastVersion('refreshData'),
        },
        {
            key: 'refresh-range',
            toolTipContent: 'Refresh ranges',
            icon: <LuTimerReset size={16} />,
            onClick: () => incrementBroadcastVersion('refreshRange'),
        },
        {
            key: 'expand-full-range',
            toolTipContent: 'Expand all panels to full data range',
            icon: <GoArrowBoth size={15} />,
            onClick: () =>
                incrementBroadcastVersion('expandFullRange'),
        },
        {
            key: 'save',
            className: sHasUnsavedChanges
                ? 'tag-analyzer-board-header__save-button--unsaved'
                : undefined,
            toolTipContent: sHasUnsavedChanges
                ? 'Save runtime changes to TAZ'
                : 'Save',
            icon: <Save size={16} />,
            onClick: () => void saveBoard(),
        },
        {
            key: 'save-as',
            toolTipContent: 'Save as',
            'aria-label': 'Open Save As',
            icon: <SaveAs size={16} />,
            onClick: () => setIsSaveAsModalOpen(true),
        },
        {
            key: 'overlap',
            toolTipContent: overlap.compatibilityMessage ?? 'Overlap chart',
            'aria-label': 'Open overlap chart',
            icon: <MdOutlineStackedLineChart size={16} />,
            onClick: overlap.openOverlapChart,
            disabled: !overlap.canOpenOverlapChart,
        },
        {
            key: 'help',
            toolTipContent: 'help',
            icon: <Help size={16} />,
            onClick: () => setIsHelpModalOpen(true),
            'aria-label': 'Open help',
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
                            disabled={!sBoardRangeReference}
                            onClick={() => setIsBoardRangeModalOpen(true)}
                        >
                            <Calendar style={{ paddingRight: '8px' }} />
                            {sBoardRangeButtonLabel}
                        </Button>
                        {sHeaderActions.map(({ key, ...buttonProps }) => (
                            <Button
                                key={key}
                                size="icon"
                                variant="ghost"
                                isToolTip
                                {...buttonProps}
                            />
                        ))}
                    </Button.Group>
                </div>
            </Page.Header>
            <Page.Body>
                {sPanels.map((sPanelInfo) => (
                    <BoardPanel
                        key={sPanelInfo.key}
                        panelInfo={sPanelInfo}
                        rangeState={sPanelRanges[sPanelInfo.key]}
                        rangeRequests={sPanelRangeRequests}
                        isActive={isActiveTab}
                        hasUnsavedBoardChanges={sHasUnsavedChanges}
                        rollupTableList={rollupTableList}
                        onPanelRangeStateChange={setPanelRange}
                        onBroadcastError={reportBroadcastError}
                        onApplyPanelInfo={applyPanelInfo}
                        onSetGlobalTimeRange={handleSetGlobalTimeRange}
                        onDeletePanel={removePanel}
                        onToggleOverlap={overlap.togglePanelOverlap}
                    />
                ))}
                <Page.ContentBlock pHoverNone>
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
                        <CreatePanelModal
                            rollupTableList={rollupTableList}
                            onClose={() => setIsNewPanelModalOpen(false)}
                            onCreatePanel={appendPanel}
                        />
                    )}
                </Page.ContentBlock>
            </Page.Body>
            {sIsHelpModalOpen && (
                <HelpModal
                    onClose={() => setIsHelpModalOpen(false)}
                />
            )}
            {sIsBoardRangeModalOpen && sBoardRangeReference && (
                <RangeModal
                    key={sBoardRangeKind}
                    kind={sBoardRangeKind}
                    initialRangeInput={sBoardRangeInput}
                    currentRange={sBoardRangeReference.currentRange}
                    fullRange={sBoardRangeReference.fullRange}
                    onAxisKindChange={(rangeKind) => {
                        if (sBoardRangeReferences[rangeKind]) {
                            setBoardRangeKind(rangeKind);
                            return;
                        }

                        Toast.error(
                            `Cannot resolve a ${rangeKind} board range until a matching panel is ready.`,
                        );
                    }}
                    onApply={(rangeInput: RangeExpressionInput) =>
                        applyBoardRange(sBoardRangeKind, rangeInput)
                    }
                    onClose={() => setIsBoardRangeModalOpen(false)}
                />
            )}
            {isActiveTab && sIsSaveAsModalOpen && (
                <SaveAsModal
                    initialDirectoryPath={sBoardInfo.path}
                    initialFileName={sBoardInfo.name}
                    onClose={closeSaveAsModal}
                    onSaveAs={(directoryPath, fileName) =>
                        saveBoard({ directoryPath, fileName })
                    }
                />
            )}
            {isActiveTab && overlap.openSession && (
                <OverlapModal
                    initialPanels={overlap.openSession.panels}
                    isNumericXAxis={overlap.openSession.isNumericXAxis}
                    includeZeroInYAxisRange={
                        overlap.openSession.includeZeroInYAxisRange
                    }
                    onClose={overlap.closeOverlapChart}
                />
            )}
        </>
    );
}

function getInitialBoardRangeKind(info: BoardInfo): AxisKind {
    if (
        isRangeExpressionEmpty(info.boardTimeRange) &&
        !isRangeExpressionEmpty(info.boardNumericRange)
    ) {
        return 'numeric';
    }

    const sPanelAxisKinds = info.panels.map((panel) =>
        getSeriesListAxisKind(panel.query.tagSet),
    );
    return sPanelAxisKinds.includes('numeric') &&
        !sPanelAxisKinds.includes('time')
        ? 'numeric'
        : 'time';
}

function getBoardRangeReference(
    panels: PanelInfo[],
    panelRanges: Record<string, ResolvedRangeState | undefined>,
    axisKind: AxisKind,
): { currentRange: AxisRange; fullRange: AxisRange } | undefined {
    let currentRange: AxisRange | undefined;
    let fullRange: AxisRange | undefined;

    for (const panel of panels) {
        if (getSeriesListAxisKind(panel.query.tagSet) !== axisKind) continue;

        const rangeState = panelRanges[panel.key];
        if (!rangeState) continue;

        const panelRange = rangeState.range.navigatorRange;
        currentRange = currentRange
            ? {
                  startTime: Math.min(
                      currentRange.startTime,
                      panelRange.startTime,
                  ),
                  endTime: Math.max(currentRange.endTime, panelRange.endTime),
              }
            : panelRange;
        fullRange = fullRange
            ? {
                  startTime: Math.min(
                      fullRange.startTime,
                      rangeState.fullRange.startTime,
                  ),
                  endTime: Math.max(
                      fullRange.endTime,
                      rangeState.fullRange.endTime,
                  ),
              }
            : rangeState.fullRange;
    }

    return currentRange && fullRange
        ? { currentRange, fullRange }
        : undefined;
}
