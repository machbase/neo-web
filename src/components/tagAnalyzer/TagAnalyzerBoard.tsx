import { useEffect, useState } from 'react';
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
import { Button, Modal, Page, Toast } from '@/design-system/components';
import { formatTimeValue } from '@/utils/dashboardUtil';
import PanelContainer from './panel/PanelContainer';
import BoardTimeRangeModal from './boardModal/BoardTimeRangeModal';
import OverlapModal from './boardModal/OverlapModal';
import CreateChartModal from './modal/selectionPanel/CreateChartModal';
import TazSaveModal, {
    loadTazSaveModalInitialState,
    type TazSaveModalInitialState,
} from './boardModal/TazSaveModal';
import type {
    BoardActions,
    BoardInfo,
    GlobalTimeRangeState,
    OverlapPanelInfo,
    OverlapPanelSelection,
    OverlapSelectionChangePayload,
    SetGlobalTimeRangePayload,
} from './domain/BoardDomain';
import { formatTimeRangeInputValue } from './domain/time/TimeBoundaryInput';
import type { TimeRangeConfig } from './domain/time/TimeTypes';
import { isConcreteTimeRange } from './domain/time/TimeRangeUtils';
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
import { TreeFetchDrilling } from '@/utils/UpdateTree';

const HELP_SECTIONS = [
    {
        title: 'Panels and data',
        items: [
            'Use the time range button to choose the board time range for every panel.',
            'Refresh data reloads the current visible range without changing the time window.',
            'Refresh time checks the available data range again. Panels with Keep Navigator Position enabled keep the current navigator range.',
        ],
    },
    {
        title: 'Raw mode',
        items: [
            'The Raw button switches a panel between calculated interval data and raw table rows.',
            'Calculated mode groups points by the panel interval and shows the interval in the header.',
            'Raw mode shows the original data points. Raw panels can use different pixel and sampling settings in the panel editor.',
        ],
    },
    {
        title: 'Zoom and navigation',
        items: [
            'Drag on the chart to zoom when zoom is enabled.',
            'Use the navigator at the bottom to move or resize the visible time window.',
            'The focus button recenters the navigator around the current visible range.',
            'The reset navigator button returns the navigator to the full available data range.',
        ],
    },
    {
        title: 'Annotations and highlights',
        items: [
            'Click Annotation, then click the chart where the note should be placed. Choose the series, edit the text, then apply.',
            'Click an existing annotation label to edit or delete it.',
            'Click Highlight, drag across the chart, then edit the label, time range, and colors.',
        ],
    },
    {
        title: 'Selection, FFT, and overlap',
        items: [
            'Use range selection to select points for stats. After selecting a range, the FFT button becomes available.',
            'Click a single-series panel title to include it in overlap comparison, then use the overlap chart button in the toolbar.',
            'Set global time copies a panel visible range to the board so other panels can follow it.',
        ],
    },
    {
        title: 'Saving',
        items: [
            'Save updates the current TAZ file.',
            'Save as creates a new saved TAZ file.',
            'Panel editor changes, annotations, highlights, and display settings are saved with the board.',
        ],
    },
] as const;

type TagAnalyzerBoardProps = {
    pInfo: BoardInfo;
    pSaveableBoard: SaveableTazBoard;
    pIsActiveTab: boolean;
    pPanelBoardActions: BoardActions;
    pRecentModalPath: string;
    pFileTree: any;
    pOnSavedBoard: (savedBoard: SaveableTazBoard) => void;
    pOnFileTreeChange: (tree: any) => void;
    pOnRecentModalPathChange: (path: string) => void;
    pAvailableSourceTableNames: string[];
    pOnAppendPanel: (panel: PersistedTazPanelInfo) => void;
    pRollupTableList: string[];
};

const TagAnalyzerBoard = ({
    pInfo,
    pSaveableBoard,
    pIsActiveTab,
    pPanelBoardActions,
    pRecentModalPath,
    pFileTree,
    pOnSavedBoard,
    pOnFileTreeChange,
    pOnRecentModalPathChange,
    pAvailableSourceTableNames,
    pOnAppendPanel,
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
    const [sPanelRawModeByKey, setPanelRawModeByKey] =
        useState<Record<string, boolean>>({});
    const sSelectedPanelKeys = new Set(
        sOverlapSelections.map((item) => item.panelKey),
    );
    const sRangeText = formatBoardRangeText(pInfo.boardTimeRange);
    const sRuntimePanels = pInfo.panels.map((panel) =>
        getPanelInfoWithRawMode(panel, getPanelRawMode(panel)),
    );
    const boardPanels = useTagAnalyzerBoardPanels({
        panels: sRuntimePanels,
        boardTime: pInfo.boardTimeRange,
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
        pPanelBoardActions.onSetBoardTimeRange(timeRange);
        boardPanels.applyBoardRangeToPanels(timeRange);
    }

    async function openTazSaveModal(): Promise<void> {
        setTazSaveModalInitialState(
            await loadTazSaveModalInitialState({
                initialDirectoryPath: pInfo.path,
                initialFileName: pInfo.name,
                recentModalPath: pRecentModalPath,
            }),
        );
        setIsTazSaveModalOpen(true);
    }

    async function saveCurrentTazBoard(): Promise<boolean> {
        if (!pSaveableBoard.path) {
            await openTazSaveModal();
            return false;
        }

        try {
            const sSaveResult = await saveTaz(pSaveableBoard);
            if (!sSaveResult.success || !sSaveResult.savedBoard) {
                Toast.error('Failed to save TAZ file. Please try again.');
                return false;
            }

            pOnSavedBoard(sSaveResult.savedBoard);
            Toast.success('TAZ file saved successfully.');
            return true;
        } catch {
            Toast.error('Failed to save TAZ file. Please try again.');
            return false;
        }
    }

    async function saveCurrentTazBoardAs(
        directoryPath: string,
        fileName: string,
    ): Promise<boolean> {
        try {
            const sSaveResult = await saveAsTaz({
                board: pSaveableBoard,
                directoryPath,
                fileName,
            });
            if (!sSaveResult.success || !sSaveResult.savedBoard) {
                Toast.error('Failed to save TAZ file. Please try again.');
                return false;
            }

            pOnSavedBoard(sSaveResult.savedBoard);
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
    }

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
                pInfo.panels.find(
                    (selectedPanel) =>
                        selectedPanel.meta.index_key === selection.panelKey,
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

    function getPanelRawMode(panel: PanelInfo): boolean {
        return sPanelRawModeByKey[panel.meta.index_key] ?? panel.toolbar.isRaw;
    }

    function getPanelInfoWithRawMode(panel: PanelInfo, isRaw: boolean): PanelInfo {
        return panel.toolbar.isRaw === isRaw
            ? panel
            : {
                  ...panel,
                  toolbar: {
                      ...panel.toolbar,
                      isRaw,
                  },
              };
    }

    function getSelectedOverlapPanels(): OverlapPanelInfo[] {
        return sOverlapSelections.flatMap((selection) => {
            const sPanel = pInfo.panels.find(
                (panel) => panel.meta.index_key === selection.panelKey,
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

    function setPanelRawMode(panelKey: string, isRaw: boolean): void {
        setPanelRawModeByKey((prev) =>
            prev[panelKey] === isRaw
                ? prev
                : {
                      ...prev,
                      [panelKey]: isRaw,
                  },
        );
    }

    function clearPanelRawMode(panelKey: string): void {
        setPanelRawModeByKey((prev) => {
            if (!(panelKey in prev)) {
                return prev;
            }

            const {
                [panelKey]: _removedPanelRawMode,
                ...sNextPanelRawModeByKey
            } = prev;

            return sNextPanelRawModeByKey;
        });
    }

    function savePanel(panel: PanelInfo): void {
        setPanelRawMode(panel.meta.index_key, panel.toolbar.isRaw);
        pPanelBoardActions.onSavePanel(panel);
    }

    function togglePanelRawMode(
        panel: PanelInfo,
        reloadRawMode: (panelInfo: PanelInfo) => void,
    ): void {
        const sNextRawMode = !getPanelRawMode(panel);
        const sNextPanelInfo = getPanelInfoWithRawMode(panel, sNextRawMode);

        setPanelRawMode(panel.meta.index_key, sNextRawMode);
        reloadRawMode(sNextPanelInfo);
    }

    function togglePanelOverlap(
        panel: PanelInfo,
        rangeState: PanelRangeState,
        isRaw: boolean,
    ): void {
        const sIsAlreadySelected = sSelectedPanelKeys.has(panel.meta.index_key);

        if (sIsAlreadySelected) {
            updateOverlapSelection({
                start: rangeState.panelRange.startTime,
                end: rangeState.panelRange.endTime,
                panelKey: panel.meta.index_key,
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
            panelKey: panel.meta.index_key,
            isRaw,
            changeType: undefined,
        });
    }

    function deletePanel(panel: PanelInfo): void {
        clearPanelRawMode(panel.meta.index_key);
        updateOverlapSelection({
            panelKey: panel.meta.index_key,
            changeType: 'delete',
        });
        pPanelBoardActions.onDeletePanel({
            panelKey: panel.meta.index_key,
        });
    }

    function handleRuntimeAppliedRange(
        panel: PanelInfo,
        rangeState: PanelRangeState,
    ): void {
        if (
            panel.time.useLastViewedRange &&
            isConcreteTimeRange(rangeState.panelRange) &&
            isConcreteTimeRange(rangeState.navigatorRange)
        ) {
            pPanelBoardActions.onPersistPanelState({
                targetPanelKey: panel.meta.index_key,
                timeInfo: rangeState,
                isRaw: panel.toolbar.isRaw,
            });
        }

        if (
            !sSelectedPanelKeys.has(panel.meta.index_key) ||
            !isConcreteTimeRange(rangeState.panelRange)
        ) {
            return;
        }

        updateOverlapSelection({
            start: rangeState.panelRange.startTime,
            end: rangeState.panelRange.endTime,
            panelKey: panel.meta.index_key,
            isRaw: panel.toolbar.isRaw,
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
                        sPanelInfo.meta.index_key,
                    );
                    const sIsRaw = sPanelInfo.toolbar.isRaw;
                    const sPanelRuntimeProps =
                        boardPanels.getPanelContainerRuntimeProps(sPanelInfo);

                    return (
                        <Page.ContentBlock
                            key={sPanelInfo.meta.index_key}
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
                                        boardPanels.handlePanelChartAreaWidthChange(
                                            sPanelInfo,
                                            width,
                                        ),
                                    refreshData: () => {
                                        void boardPanels.refreshPanelData(sPanelInfo);
                                    },
                                    refreshTime: () => {
                                        void boardPanels.refreshPanelTime(sPanelInfo);
                                    },
                                    reloadPanelEdit: boardPanels.reloadPanelEdit,
                                    onToggleRaw: () =>
                                        togglePanelRawMode(
                                            sPanelInfo,
                                            boardPanels.reloadRawMode,
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
                            pOnAppendPanel={pOnAppendPanel}
                            pAvailableSourceTableNames={pAvailableSourceTableNames}
                        />
                    )}
                </Page.ContentBlock>
            </Page.Body>
            {sIsHelpModalOpen && (
                <Modal.Root
                    isOpen={true}
                    onClose={() => setIsHelpModalOpen(false)}
                    closeOnEscape
                    closeOnOutsideClick
                >
                    <Modal.Header>
                        <Modal.Title>Help</Modal.Title>
                        <Modal.Close />
                    </Modal.Header>
                    <Modal.Body>
                        <div style={{ display: 'grid', gap: '14px', maxWidth: '720px' }}>
                            {HELP_SECTIONS.map((section) => (
                                <section key={section.title}>
                                    <h3 style={{ margin: '0 0 6px', fontSize: '14px' }}>
                                        {section.title}
                                    </h3>
                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        {section.items.map((item) => (
                                            <li key={item} style={{ marginBottom: '4px' }}>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </Modal.Body>
                </Modal.Root>
            )}
            {sIsTimeRangeModalOpen && (
                <BoardTimeRangeModal
                    boardTimeRange={pInfo.boardTimeRange}
                    onApply={handleApplyBoardTimeRange}
                    onClose={() => setIsTimeRangeModalOpen(false)}
                />
            )}
            {sIsDisplayOverlapModal && (
                <OverlapModal
                    key={sOverlapPanels
                        .map((panel) =>
                            [
                                panel.board.meta.index_key,
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

function formatBoardRangeText(rangeConfig: TimeRangeConfig): string {
    if (
        rangeConfig.start.kind === 'empty' ||
        rangeConfig.end.kind === 'empty'
    ) {
        return '';
    }

    if (
        rangeConfig.start.kind === 'absolute' &&
        rangeConfig.end.kind === 'absolute'
    ) {
        if (
            rangeConfig.start.timestamp <= 0 ||
            rangeConfig.end.timestamp <= 0 ||
            rangeConfig.end.timestamp < rangeConfig.start.timestamp
        ) {
            return '';
        }

        return `${formatTimeValue(rangeConfig.start.timestamp)}~${formatTimeValue(rangeConfig.end.timestamp)}`;
    }

    return `${formatTimeRangeInputValue(rangeConfig.start)}~${formatTimeRangeInputValue(rangeConfig.end)}`;
}

export default TagAnalyzerBoard;
