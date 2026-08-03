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
import type { BoardInfo, PanelInfo } from '../model';
import type { PanelRangeSourceState } from '../panel/panelRangeSourceState';
import {
    getSeriesListAxisKind,
    type RollupTableMap,
} from '../seriesModel';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type PanelRangeState,
    type RangeExpressionInput,
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

const EMPTY_BOARD_RANGE: RangeExpressionInput = { start: '', end: '' };

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
type PanelBroadcastVersionKey = keyof PanelBroadcastVersions;

function incrementPanelBroadcastVersion(
    versions: PanelBroadcastVersions,
    key: PanelBroadcastVersionKey,
): PanelBroadcastVersions {
    return {
        ...versions,
        [key]: versions[key] + 1,
    };
}

type BoardProps = {
    info: BoardInfo;
    isActiveTab: boolean;
    onSavedBoard: (savedBoard: BoardInfo) => void;
    onFileSaved: (directoryPath: string, fileName: string) => Promise<void>;
    rollupTableList: RollupTableMap;
};

type BoardPanelProps = {
    panelInfo: PanelInfo;
    rangeState: PanelRangeSourceState;
    rangeRequests: PanelRangeRuntimeRequests;
    isActive: boolean;
    hasUnsavedBoardChanges: boolean;
    rollupTableList: RollupTableMap;
    onPanelRangeStateChange: (
        panelKey: string,
        rangeState: PanelRangeSourceState,
    ) => void;
    onBroadcastError: (broadcastKey: string, message: string) => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (globalTimeRange: PanelRangeState) => void;
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
        (nextRangeState: PanelRangeSourceState) =>
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
    const [sBoardRangeModalLastDataTime, setBoardRangeModalLastDataTime] =
        useState<number | undefined>(undefined);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<PanelRangeState | undefined>(undefined);
    const [sIsNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
    const [sIsSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [sBoardRangeKind, setBoardRangeKind] = useState<AxisKind>(() =>
        getInitialBoardRangeKind(info),
    );
    const [
        sPanelBroadcastVersions,
        incrementBroadcastVersion,
    ] = useReducer(
        incrementPanelBroadcastVersion,
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
        const sSavedBoard = await saveTazBoard(sBoardToSave);
        const sIsCurrentSave =
            sSaveRequestGenerationRef.current === sRequestGeneration &&
            sActiveBoardIdRef.current === sBoardToSave.id;

        if (!sSavedBoard) {
            if (sIsCurrentSave) {
                Toast.error(SAVE_ERROR_MESSAGE);
            }
            return false;
        }

        if (!sIsCurrentSave) {
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

        return sSaveRequestGenerationRef.current === sRequestGeneration &&
            sActiveBoardIdRef.current === sBoardToSave.id;
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
        setBoardRangeModalLastDataTime(undefined);
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
        globalTimeRange: PanelRangeState,
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
            icon: <SaveAs size={16} />,
            onClick: () => setIsSaveAsModalOpen(true),
        },
        {
            key: 'overlap',
            toolTipContent: overlap.compatibilityMessage ?? 'Overlap chart',
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
                            onClick={() =>
                                setBoardRangeModalLastDataTime(Date.now())
                            }
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
            {sBoardRangeModalLastDataTime !== undefined && (
                <RangeModal
                    key={sBoardRangeKind}
                    title="Board Range"
                    rangeKindSelector={{
                        value: sBoardRangeKind,
                        onChange: setBoardRangeKind,
                    }}
                    mode={{
                        ...(sIsNumericBoardRange
                            ? { kind: 'numeric-input' as const }
                            : {
                                  kind: 'time' as const,
                                  dataStartTime: 0,
                                  dataEndTime:
                                      sBoardRangeModalLastDataTime,
                              }),
                        initialRangeInput: sBoardRangeInput,
                        emptyRange: true,
                        onApply: (rangeInput: RangeExpressionInput) =>
                            applyBoardRange(sBoardRangeKind, rangeInput),
                    }}
                    onClose={() => setBoardRangeModalLastDataTime(undefined)}
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
    const sTimeRange = info.boardTimeRange ?? EMPTY_BOARD_RANGE;
    const sNumericRange = info.boardNumericRange ?? EMPTY_BOARD_RANGE;

    if (isRangeExpressionEmpty(sTimeRange) && !isRangeExpressionEmpty(sNumericRange)) {
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
