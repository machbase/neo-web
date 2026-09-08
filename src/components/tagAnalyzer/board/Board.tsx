import './Board.scss';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { MdHelpOutline as Help } from 'react-icons/md';
import {
    GoArrowBoth,
    PlusCircle,
    Save,
    Refresh,
    SaveAs,
    MdOutlineStackedLineChart,
    LuTimerReset,
} from '@/assets/icons/Icon';
import { Button, Page, Toast } from '@/design-system/components';
import RangeChips from '@/components/dashboard/RangeChips';
import TimeRangeModal from '@/components/modal/TimeRangeModal';
import Panel from '../panel/Panel';
import { HelpModal } from './HelpModal';
import OverlapModal from '../overlap/OverlapModal';
import { CreatePanelModal } from '../panel/CreatePanelModal';
import { SaveAsModal } from '../save/SaveAsModal';
import { useBoardSave } from '../save/useBoardSave';
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
import { getEnclosingRange } from '../range/rangeArithmetic';

import type { PanelBroadcastRequests } from '../panel/panelRuntime';
import { useBoardState } from './useBoardState';
import { useBoardOverlapSelection } from './useBoardOverlapSelection';

const INITIAL_PANEL_BROADCAST_VERSIONS = {
    boardTimeRange: 0,
    boardNumericRange: 0,
    refreshData: 0,
    refreshRange: 0,
    expandFullRange: 0,
};

type BoardProps = {
    info: BoardInfo;
    isActiveTab: boolean;
    onSavedBoard: (savedBoard: BoardInfo) => void;
    onFileSaved: (directoryPath: string, fileName: string) => Promise<void>;
    rollupTableList: RollupTableMap;
};

export default function Board({
    info,
    isActiveTab,
    onSavedBoard,
    onFileSaved,
    rollupTableList,
}: BoardProps) {
    const [sIsHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [sBoardRangeModalOpenedAt, setBoardRangeModalOpenedAt] = useState<
        number | undefined
    >(undefined);
    const [sGlobalRangeRequest, setGlobalRangeRequest] = useState<
        PanelBroadcastRequests['rangeRequests']['global']
    >();
    const [sIsNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
    const [sBoardRangeKind, setBoardRangeKind] = useState<AxisKind>(() =>
        getInitialBoardRangeKind(info),
    );
    const [sPanelBroadcastVersions, setPanelBroadcastVersions] = useState(
        INITIAL_PANEL_BROADCAST_VERSIONS,
    );
    const incrementBroadcastVersion = useCallback((
        key: keyof typeof INITIAL_PANEL_BROADCAST_VERSIONS,
    ): void => setPanelBroadcastVersions((versions) => ({
        ...versions,
        [key]: versions[key] + 1,
    })), []);
    const sReportedBroadcastErrorsRef = useRef(new Set<string>());
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
    const sTimeRangeReference = getBoardRangeReference(
        sPanels,
        sPanelRanges,
        'time',
    ) ?? createBoardRangeEditorReference('time', sBoardRangeModalOpenedAt ?? Date.now());
    const sNumericPanelRangeReference = getBoardRangeReference(
        sPanels,
        sPanelRanges,
        'numeric',
    );
    const sNumericRangeReference = sNumericPanelRangeReference ??
        createBoardRangeEditorReference('numeric', sBoardRangeModalOpenedAt ?? Date.now());
    const sRangeChipsBoardInfo = {
        dashboard: {
            timeRange: sBoardInfo.boardTimeRange,
            distanceRange: sBoardInfo.boardNumericRange,
        },
    };
    const sPanelBroadcastRequests = useMemo<PanelBroadcastRequests>(
        () => ({
            rangeRequests: {
                board: {
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
                global: sGlobalRangeRequest,
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
            sGlobalRangeRequest,
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
    const boardSave = useBoardSave({
        board: sBoardInfoForSave,
        isActive: isActiveTab,
        applySaveResult,
        onSavedBoard,
        onFileSaved,
    });

    useEffect(() => {
        if (isActiveTab) return;

        setIsHelpModalOpen(false);
        setBoardRangeModalOpenedAt(undefined);
        setIsNewPanelModalOpen(false);
        closeOverlapChart();
    }, [closeOverlapChart, isActiveTab]);

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

    function shiftBoardRange(rangeKind: AxisKind, direction: 'l' | 'r'): void {
        const reference = rangeKind === 'time'
            ? sTimeRangeReference
            : sNumericRangeReference;
        const width = reference.currentRange.end - reference.currentRange.start;
        const offset = width * (direction === 'l' ? -1 : 1);
        applyBoardRange(rangeKind, {
            start: String(reference.currentRange.start + offset),
            end: String(reference.currentRange.end + offset),
        });
    }

    const handleSetGlobalRange = useCallback((
        axisKind: AxisKind,
        globalRange: RangeState,
    ): void => {
        setGlobalRangeRequest((request) => ({
            axisKind,
            range: globalRange,
            applyVersion: (request?.applyVersion ?? 0) + 1,
        }));
    }, []);

    const sHeaderActions = [
        {
            key: 'refresh-data',
            'data-testid': 'refresh-data-button',
            'aria-label': 'Refresh all panel data',
            toolTipContent: 'Refresh data',
            icon: <Refresh size={15} />,
            onClick: () => incrementBroadcastVersion('refreshData'),
        },
        {
            key: 'refresh-range',
            'data-testid': 'refresh-range-button',
            'aria-label': 'Refresh all panel ranges',
            toolTipContent: 'Refresh ranges',
            icon: <LuTimerReset size={16} />,
            onClick: () => incrementBroadcastVersion('refreshRange'),
        },
        {
            key: 'expand-full-range',
            'data-testid': 'expand-full-range-button',
            'aria-label': 'Expand all panels to full data range',
            toolTipContent: 'Expand all panels to full data range',
            icon: <GoArrowBoth size={15} />,
            onClick: () =>
                incrementBroadcastVersion('expandFullRange'),
        },
        {
            key: 'save',
            'data-testid': 'save-button',
            'aria-label': 'Save Tag Analyzer board',
            className: boardSave.hasUnsavedChanges
                ? 'tag-analyzer-board-header__save-button--unsaved'
                : undefined,
            toolTipContent: boardSave.hasUnsavedChanges
                ? 'Save runtime changes to TAZ'
                : 'Save',
            icon: <Save size={16} />,
            onClick: () => void boardSave.save(),
        },
        {
            key: 'save-as',
            'data-testid': 'save-as-button',
            toolTipContent: 'Save as',
            'aria-label': 'Open Save As',
            icon: <SaveAs size={16} />,
            onClick: boardSave.openSaveAs,
        },
        {
            key: 'overlap',
            'data-testid': 'overlap-button',
            toolTipContent: overlap.compatibilityMessage ?? 'Overlap chart',
            'aria-label': 'Open overlap chart',
            icon: <MdOutlineStackedLineChart size={16} />,
            onClick: overlap.openOverlapChart,
            disabled: !overlap.canOpenOverlapChart,
        },
        {
            key: 'help',
            'data-testid': 'help-button',
            toolTipContent: 'help',
            icon: <Help size={16} />,
            onClick: () => setIsHelpModalOpen(true),
            'aria-label': 'Open help',
        },
    ];

    return (
        <>
            <Page.Header>
                <div
                    className="tag-analyzer-board-header"
                    data-testid="board-header"
                >
                    <Page.Space />
                    {boardSave.hasUnsavedChanges && (
                        <span className="tag-analyzer-board-header__unsaved-message">
                            Runtime change not saved to TAZ
                        </span>
                    )}
                    <Button.Group className="tag-analyzer-board-header__actions">
                        <RangeChips
                            pBoardInfo={sRangeChipsBoardInfo}
                            pOnShiftTime={(direction) => shiftBoardRange('time', direction)}
                            pOnShiftDist={(direction) => shiftBoardRange('numeric', direction)}
                            pOnEditTime={() => {
                                setBoardRangeKind('time');
                                setBoardRangeModalOpenedAt(Date.now());
                            }}
                            pOnEditDist={() => {
                                setBoardRangeKind('numeric');
                                setBoardRangeModalOpenedAt(Date.now());
                            }}
                        />
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
                    <Page.ContentBlock key={sPanelInfo.key} pHoverNone>
                        <Panel
                            panelInfo={sPanelInfo}
                            rangeState={sPanelRanges[sPanelInfo.key]}
                            broadcastRequests={sPanelBroadcastRequests}
                            isActive={isActiveTab}
                            hasUnsavedBoardChanges={boardSave.hasUnsavedChanges}
                            rollupTableList={rollupTableList}
                            onPanelRangeStateChange={setPanelRange}
                            onBroadcastError={reportBroadcastError}
                            onApplyPanelInfo={applyPanelInfo}
                            onSetGlobalRange={handleSetGlobalRange}
                            onDeletePanel={removePanel}
                            onToggleOverlap={overlap.togglePanelOverlap}
                        />
                    </Page.ContentBlock>
                ))}
                <Page.ContentBlock pHoverNone>
                    <Button
                        data-testid="create-panel-button"
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
            {sBoardRangeModalOpenedAt !== undefined && (
                <TimeRangeModal
                    key={sBoardRangeKind}
                    pUseRecoil={false}
                    pLockTab={sBoardRangeKind === 'numeric' ? 'distance' : 'time'}
                    pStartTime={sBoardRangeKind === 'numeric'
                        ? sBoardInfo.boardNumericRange.start || sNumericPanelRangeReference?.currentRange.start || 0
                        : getTimeModalEdge(sBoardInfo.boardTimeRange.start, sTimeRangeReference.currentRange.start, 'now-1h')}
                    pEndTime={sBoardRangeKind === 'numeric'
                        ? sBoardInfo.boardNumericRange.end || sNumericPanelRangeReference?.currentRange.end || 0
                        : getTimeModalEdge(sBoardInfo.boardTimeRange.end, sTimeRangeReference.currentRange.end, 'now')}
                    pBounds={sBoardRangeKind === 'numeric' && sNumericPanelRangeReference
                        ? { min: sNumericPanelRangeReference.fullRange.start, max: sNumericPanelRangeReference.fullRange.end }
                        : null}
                    pSetTime={() => undefined}
                    pSetTimeRangeModal={(open) => {
                        if (!open) setBoardRangeModalOpenedAt(undefined);
                    }}
                    pSaveCallback={(start, end) => applyBoardRange(sBoardRangeKind, { start: String(start), end: String(end) })}
                />
            )}
            {isActiveTab && boardSave.isSaveAsOpen && (
                <SaveAsModal
                    initialDirectoryPath={sBoardInfo.path}
                    initialFileName={sBoardInfo.name}
                    onClose={boardSave.closeSaveAs}
                    onSaveAs={boardSave.saveAs}
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

function getTimeModalEdge(
    value: string,
    fallback: number,
    emptyFallback: string,
): string | number {
    const trimmed = value.trim();
    if (trimmed === '') return emptyFallback;
    if (trimmed.includes('now') || trimmed.includes('last')) return trimmed;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
    return trimmed.includes('first') ? fallback : trimmed;
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

        const navigatorRange = rangeState.range.navigatorRange;
        currentRange = currentRange
            ? getEnclosingRange(currentRange, navigatorRange)
            : navigatorRange;
        fullRange = fullRange
            ? getEnclosingRange(fullRange, rangeState.fullRange)
            : rangeState.fullRange;
    }

    return currentRange && fullRange
        ? { currentRange, fullRange }
        : undefined;
}

function createBoardRangeEditorReference(
    axisKind: AxisKind,
    openedAt: number,
): { currentRange: AxisRange; fullRange: AxisRange } {
    const range = axisKind === 'time'
        ? { start: 0, end: openedAt }
        : { start: 0, end: Number.MAX_SAFE_INTEGER };

    return { currentRange: range, fullRange: range };
}
