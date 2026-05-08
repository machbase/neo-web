import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerSeriesConfigFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import PanelContainer, {
    type PanelContainerActions,
    type PanelContainerBoardRangeSyncState,
} from './PanelContainer';
import type {
    PanelChartHandle,
    PanelHeaderActions,
    PanelMarkupHandlers,
    PanelNavigateState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
    PanelRangeHandlers,
} from './PanelTypes';
import type { PanelInfo } from '../domain/PanelModel';
import type { FetchedTimeBoundaryRange } from '../time/TimeTypes';
import {
    resolvePanelTimeRange,
} from './PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../fetch/TimeBoundaryRangeResolver';
import { parseTimeRangeConfigFromBoundaryValues } from '../time/TimeBoundaryParser';
import { loadPanelChartState } from '../fetch/PanelChartDataLoader';

let mockAttachChartHandleDuringRender = true;

jest.mock('../fetch/PanelChartDataLoader', () => ({
    loadPanelChartState: jest.fn(),
}));

jest.mock('./PanelTimeRangeResolver', () => {
    const sActual = jest.requireActual('./PanelTimeRangeResolver');
    return {
        ...sActual,
        resolvePanelTimeRange: jest.fn(),
    };
});

jest.mock('../fetch/TimeBoundaryRangeResolver', () => ({
    resolveSeriesTimeBoundaryRanges: jest.fn(),
    resolveTimeBoundaryRanges: jest.fn(),
}));

jest.mock('./PanelHeader', () => {
    /**
     * Renders the mocked panel header used by the container tests.
     * Intent: Keep the container test focused on header handler wiring instead of header layout.
     * @param pHeaderActions The mocked header actions passed from PanelContainer.
     * @param pOverlayModeActions The mocked overlay mode actions passed from PanelContainer.
     * @returns The mocked panel header element.
     */
    const MockPanelHeader = ({
        pHeaderActions,
        pOverlayModeActions,
    }: {
        pHeaderActions: Pick<
            PanelHeaderActions,
            | 'onToggleRaw'
            | 'onRefreshData'
            | 'onRefreshTime'
            | 'onOpenExportCsv'
        >;
        pOverlayModeActions: Pick<
            PanelOverlayModeActions,
            | 'onToggleHighlight'
            | 'onToggleAnnotation'
            | 'onToggleEdit'
        >;
    }) => {
        return (
            <div data-testid="panel-header">
                <button type="button" onClick={pOverlayModeActions.onToggleHighlight}>
                    highlight-toggle
                </button>
                <button type="button" onClick={pOverlayModeActions.onToggleAnnotation}>
                    annotation-toggle
                </button>
                <button type="button" onClick={pOverlayModeActions.onToggleEdit}>
                    edit-toggle
                </button>
                <button type="button" onClick={pHeaderActions.onToggleRaw}>
                    raw-toggle
                </button>
                <button type="button" onClick={pHeaderActions.onRefreshData}>
                    refresh-data
                </button>
                <button type="button" onClick={pHeaderActions.onRefreshTime}>
                    refresh-time
                </button>
                <button type="button" onClick={pHeaderActions.onOpenExportCsv}>
                    export-csv
                </button>
            </div>
        );
    };

    return MockPanelHeader;
});

jest.mock('./PanelChartBody', () => {
    /**
     * Renders the mocked panel body used by the container tests.
     * Intent: Keep the container test focused on chart-shell orchestration instead of chart rendering.
     * @param pChartAreaRef The chart DOM ref passed from PanelContainer.
     * @param pIsRaw The current raw mode flag passed from PanelContainer.
     * @param pOverlayModeState The panel-local overlay mode state passed from PanelContainer.
     * @param pNavigateState The current navigate state passed from PanelContainer.
     * @param pRangeHandlers The range handlers passed from PanelContainer.
     * @param pMarkupHandlers The markup handlers passed from PanelContainer.
     * @returns The mocked panel body element.
     */
    const MockPanelBody = ({
        pChartAreaRef,
        pChartApiRef,
        pIsRaw,
        pOverlayModeState,
        pOverlayModeActions,
        pNavigateState,
        pRangeHandlers,
        pMarkupHandlers,
        pOnHighlightSelection,
    }: {
        pChartAreaRef: MutableRefObject<HTMLDivElement | null>;
        pChartApiRef: MutableRefObject<PanelChartHandle | null>;
        pIsRaw: boolean;
        pOverlayModeState: PanelOverlayModeState;
        pOverlayModeActions: Pick<PanelOverlayModeActions, 'onCloseHighlight'>;
        pNavigateState: PanelNavigateState;
        pRangeHandlers: PanelRangeHandlers;
        pMarkupHandlers: PanelMarkupHandlers;
        pOnHighlightSelection: (startTime: number, endTime: number) => void;
    }) => {
        if (mockAttachChartHandleDuringRender) {
            pChartApiRef.current = {
                setPanelRange: jest.fn(),
                getVisibleSeries: jest.fn(() => []),
                getHighlightIndexAtClientPosition: jest.fn(() => undefined),
            };
        }

        return (
            <div ref={pChartAreaRef} data-testid="panel-body">
                <div data-testid="panel-raw">{String(pIsRaw)}</div>
                <div data-testid="panel-highlight">
                    {String(pOverlayModeState.isHighlightActive)}
                </div>
                <div data-testid="panel-range">
                    {`${pNavigateState.panelRange.startTime}-${pNavigateState.panelRange.endTime}`}
                </div>
                <button
                    type="button"
                    onClick={() =>
                        pRangeHandlers.onPanelRangeChange({
                            min: 300,
                            max: 450,
                            trigger: 'navigator',
                        })
                    }
                >
                    change-range
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (pOverlayModeState.isHighlightActive) {
                            pOnHighlightSelection(123, 456);
                            pOverlayModeActions.onCloseHighlight();
                        }
                    }}
                >
                    save-highlight
                </button>
                <button
                    type="button"
                    onClick={() =>
                        pMarkupHandlers.onOpenCreateAnnotation({
                            timestamp: Date.UTC(2026, 0, 2),
                            position: { x: 260, y: 140 },
                        })
                    }
                >
                    open-create-annotation
                </button>
                <button
                    type="button"
                    onClick={() =>
                        pMarkupHandlers.onActivateHighlightEditor({
                            highlightIndex: 0,
                            position: { x: 120, y: 140 },
                        })
                    }
                >
                    open-highlight-rename
                </button>
                <button
                    type="button"
                    onClick={() =>
                        pMarkupHandlers.onActivateAnnotationEditor({
                            seriesIndex: 0,
                            annotationIndex: 0,
                            position: { x: 240, y: 260 },
                        })
                    }
                >
                    open-annotation-editor
                </button>
            </div>
        );
    };

    return MockPanelBody;
});

jest.mock('./PanelChartFooter', () => {
    /**
     * Renders the mocked panel footer used by the container tests.
     * Intent: Keep the container test focused on control wiring rather than footer layout.
     * @returns The mocked panel footer element.
     */
    const MockPanelFooter = () => {
        return <div data-testid="panel-footer" />;
    };

    return MockPanelFooter;
});

jest.mock('./editor/PanelEditor', () => {
    const MockPanelEditor = ({ pOnClose }: { pOnClose: () => void }) => (
        <div data-testid="panel-editor">
            <button type="button" onClick={pOnClose}>
                discard-editor
            </button>
        </div>
    );

    return MockPanelEditor;
});

const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const resolvePanelTimeRangeMock = jest.mocked(resolvePanelTimeRange);
const resolveSeriesTimeBoundaryRangesMock = jest.mocked(resolveSeriesTimeBoundaryRanges);
const resolveTimeBoundaryRangesMock = jest.mocked(resolveTimeBoundaryRanges);

/**
 * Builds the board-panel action spies used by the container tests.
 * Intent: Keep the container test fixtures explicit and reusable across cases.
 * @returns The mocked board-panel actions.
 */
const createPanelContainerActions = (): PanelContainerActions => ({
    onPersistPanelState: jest.fn(),
    onSavePanel: jest.fn(),
    onSetGlobalTimeRange: jest.fn(),
    onToggleOverlapSelection: jest.fn(),
    onUpdateOverlapSelection: jest.fn(),
    onDeletePanel: jest.fn(),
});

/**
 * Builds the board-chart state fixture used by the container tests.
 * Intent: Provide a predictable board state snapshot for each test case.
 * @returns The mocked board-chart state.
 */
const createPanelContainerBoardRangeSyncState = (): PanelContainerBoardRangeSyncState => ({
    refreshCount: 0,
    timeRefreshCount: 0,
    boardTimeApplyCount: 0,
    globalTimeRange: undefined,
});

const createFetchedTimeBoundaryRange = (
    startTimestamp: number,
    endTimestamp: number,
): FetchedTimeBoundaryRange => ({
    start: {
        min: { kind: 'absolute', timestamp: startTimestamp },
        max: { kind: 'absolute', timestamp: startTimestamp },
    },
    end: {
        min: { kind: 'absolute', timestamp: endTimestamp },
        max: { kind: 'absolute', timestamp: endTimestamp },
    },
});

/**
 * Builds the board-chart props used by the focused controller contract tests.
 * Intent: Keep the panel container test setup in one explicit fixture helper.
 * @param panelInfo The panel info override for the test case.
 * @returns The board-chart props for the current test.
 */
const createProps = (panelInfo: PanelInfo | undefined) => ({
    panelInfo:
        panelInfo ??
        createTagAnalyzerPanelInfoFixture({
            time: {
                useTimeKeeper: true,
                timeKeeper: undefined,
            },
        }),
    boardState: {
        timeRange: parseTimeRangeConfigFromBoundaryValues('now-1h', 'now'),
        isActiveTab: true,
        rangeSyncState: createPanelContainerBoardRangeSyncState(),
        rollupTableList: [],
    },
    overlapState: {
        isSelected: false,
        isAnchor: false,
    },
    panelActions: createPanelContainerActions(),
});

describe('PanelContainer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAttachChartHandleDuringRender = true;

        resolvePanelTimeRangeMock.mockImplementation(
            async (
                _boardTime,
                _panelData,
                _panelTime,
                _timeBoundaryRanges,
                _mode,
            ) => createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
        );
        resolveSeriesTimeBoundaryRangesMock.mockResolvedValue(undefined);
        resolveTimeBoundaryRangesMock.mockResolvedValue(undefined);
        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'second', IntervalValue: 5 },
        });
    });

    it('persists board-only range state without touching overlap state for unselected panels', async () => {
        // Confirms ordinary panel range changes no longer bounce through overlap state unless the panel is selected.
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(sProps.panelActions.onPersistPanelState).toHaveBeenCalled();
        });

        const sLatestPersistCall = jest
            .mocked(sProps.panelActions.onPersistPanelState)
            .mock.calls.at(-1);

        expect(sLatestPersistCall).toEqual([
            expect.objectContaining({
                targetPanelKey: 'panel-1',
                timeInfo: expect.objectContaining({
                    panelRange: { startTime: 300, endTime: 450 },
                }),
                isRaw: false,
            }),
        ]);
        expect(sProps.panelActions.onUpdateOverlapSelection).not.toHaveBeenCalled();
    });

    it('updates overlap state after a range change only when the panel is selected for overlap', async () => {
        // Confirms selected overlap panels still keep their saved overlap window in sync.
        const sProps = {
            ...createProps(undefined),
            overlapState: {
                isSelected: true,
                isAnchor: false,
            },
        };
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(sProps.panelActions.onUpdateOverlapSelection).toHaveBeenCalledWith(300, 450, false);
        });
    });

    it('does not auto-reset the freshly initialized panel before a board time refresh is requested', async () => {
        // Confirms the initial panel load keeps its own visible range until the board emits a time-refresh signal.
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(resolvePanelTimeRangeMock).toHaveBeenCalledTimes(1);
    });

    it('ignores refresh-time when the initial resolver returns the empty range sentinel', async () => {
        // Confirms the refresh-time button does not push an unresolved 0-0 range through the fetch path.
        resolvePanelTimeRangeMock.mockResolvedValue({
            startTime: 0,
            endTime: 0,
        });
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('refresh-time'));
        await Promise.resolve();
        await Promise.resolve();

        expect(loadPanelChartStateMock).not.toHaveBeenCalled();
    });

    it('loads initial chart data even when the first layout width is 0', async () => {
        // Confirms the initial board-panel load does not get stuck behind a zero-width first layout pass.
        const sClientWidthSpy = jest
            .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
            .mockReturnValue(0);

        try {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture({
                time: {
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                },
            });
            const sProps = createProps(sPanelInfo);
            render(<PanelContainer {...sProps} />);

            await waitFor(() => {
                expect(loadPanelChartStateMock).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.any(Object),
                    expect.any(Object),
                    expect.any(Object),
                    1,
                    false,
                    {
                        startTime: 100,
                        endTime: 200,
                    },
                    [],
                );
            });
        } finally {
            sClientWidthSpy.mockRestore();
        }
    });

    it('applies an existing global time range when a new panel mounts before the chart handle is ready', async () => {
        // Confirms newly added panels still adopt the already-selected global time range.
        mockAttachChartHandleDuringRender = false;
        const sProps = {
            ...createProps(
                createTagAnalyzerPanelInfoFixture({
                    time: {
                        useTimeKeeper: false,
                        timeKeeper: undefined,
                    },
                }),
            ),
            boardState: {
                ...createProps(undefined).boardState,
                rangeSyncState: {
                    ...createPanelContainerBoardRangeSyncState(),
                    globalTimeRange: {
                        data: {
                            startTime: 500,
                            endTime: 800,
                        },
                        navigator: {
                            startTime: 450,
                            endTime: 850,
                        },
                        interval: {
                            IntervalType: 'second',
                            IntervalValue: 5,
                        },
                    },
                },
            },
        };

        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenNthCalledWith(
                2,
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Number),
                false,
                {
                    startTime: 450,
                    endTime: 850,
                },
                [],
            );
        });
    });

    it('refresh-time resets the panel to the full series data range', async () => {
        // Confirms refresh-time goes back to first/last data instead of the board's relative window.
        const sFreshBoundaryRanges = createFetchedTimeBoundaryRange(500, 800);
        resolveSeriesTimeBoundaryRangesMock.mockResolvedValue(sFreshBoundaryRanges);
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('refresh-time'));

        await waitFor(() => {
            expect(resolveSeriesTimeBoundaryRangesMock).toHaveBeenCalled();
        });
        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Number),
                false,
                {
                    startTime: 500,
                    endTime: 800,
                },
                [],
            );
        });
    });

    it('refresh-time reloads data even when the full series range is unchanged', async () => {
        // Confirms explicit refresh-time is not treated as a cached no-op.
        resolveSeriesTimeBoundaryRangesMock.mockResolvedValue(
            createFetchedTimeBoundaryRange(100, 200),
        );
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('refresh-time'));

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Number),
                false,
                {
                    startTime: 100,
                    endTime: 200,
                },
                [],
            );
        });
    });

    it('does not reuse the initial resolver when refresh-time is clicked', async () => {
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('refresh-time'));

        await waitFor(() => {
            expect(resolveSeriesTimeBoundaryRangesMock).toHaveBeenCalled();
        });
        expect(resolvePanelTimeRangeMock).toHaveBeenCalledTimes(1);
    });

    it('enables sampling before loading raw data from the raw toggle', async () => {
        // Confirms raw mode does not immediately run an unsampled full-range fetch.
        const sPanelInfo = createTagAnalyzerPanelInfoFixture({
            axes: {
                sampling: {
                    enabled: false,
                },
            },
            time: {
                useTimeKeeper: true,
                timeKeeper: undefined,
            },
        });
        const sProps = createProps(sPanelInfo);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('raw-toggle'));

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                    sampling: expect.objectContaining({
                        enabled: true,
                    }),
                }),
                expect.any(Object),
                expect.any(Number),
                true,
                {
                    startTime: 5,
                    endTime: 25,
                },
                [],
            );
        });
        expect(sProps.panelActions.onSavePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                axes: expect.objectContaining({
                    sampling: expect.objectContaining({
                        enabled: true,
                    }),
                }),
                toolbar: expect.objectContaining({
                    isRaw: true,
                }),
            }),
        );
    });

    it('opens the panel context menu on right click', async () => {
        // Confirms the board panel still renders the right-click menu from the container boundary.
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.contextMenu(screen.getByTestId('panel-body'));

        expect(screen.getByText('Refresh data')).toBeInTheDocument();
        expect(screen.getByText('Delete panel')).toBeInTheDocument();
    });

    it('toggles the inline editor from the panel header edit button', async () => {
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        expect(screen.queryByTestId('panel-editor')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('edit-toggle'));
        expect(screen.getByTestId('panel-editor')).toBeInTheDocument();

        fireEvent.click(screen.getByText('discard-editor'));
        expect(screen.queryByTestId('panel-editor')).not.toBeInTheDocument();
    });

    it('opens the highlight editor before saving a new highlight', async () => {
        // Confirms highlight selections use the same editor flow as later highlight edits.
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('save-highlight'));
        expect(sProps.panelActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('highlight-toggle'));
        expect(screen.getByTestId('panel-highlight')).toHaveTextContent('true');
        fireEvent.click(screen.getByText('save-highlight'));
        expect(screen.getByTestId('panel-highlight')).toHaveTextContent('false');
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
        expect(sProps.panelActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.panelActions.onSavePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                meta: expect.objectContaining({
                    index_key: 'panel-1',
                }),
                highlights: [
                    {
                        text: 'unnamed',
                        timeRange: {
                            startTime: 123,
                            endTime: 456,
                        },
                        fillColor: '#fdb532',
                        textColor: '#fdb532',
                    },
                ],
            }),
        );
    });

    it('removes a temporary highlight when highlight creation is cancelled', async () => {
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('highlight-toggle'));
        fireEvent.click(screen.getByText('save-highlight'));
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Edit highlight')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('open-highlight-rename'));
        expect(screen.queryByText('Edit highlight')).not.toBeInTheDocument();
        expect(sProps.panelActions.onSavePanel).not.toHaveBeenCalled();
    });

    it('edits a highlight through the direct highlight editor', async () => {
        // Confirms clicking a saved highlight opens the same editor used by new highlights.
        const sProps = createProps(
            createTagAnalyzerPanelInfoFixture({
                highlights: [
                    {
                        text: 'unnamed',
                        timeRange: {
                            startTime: 123,
                            endTime: 456,
                        },
                        fillColor: '#fdb532',
                        textColor: '#fdb532',
                    },
                ],
            }),
        );
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('open-highlight-rename'));
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();

        const sRenameInput = screen.getByDisplayValue('unnamed');
        fireEvent.change(sRenameInput, { target: { value: 'Batch Window' } });
        fireEvent.change(screen.getByLabelText('Highlight start time'), {
            target: { value: '200' },
        });
        fireEvent.change(screen.getByLabelText('Highlight end time'), {
            target: { value: '500' },
        });
        fireEvent.change(screen.getByLabelText('Highlight fill color'), {
            target: { value: '#22c55e' },
        });
        fireEvent.change(screen.getByLabelText('Highlight text color'), {
            target: { value: '#e2e8f0' },
        });
        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.panelActions.onSavePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                highlights: [
                    {
                        text: 'Batch Window',
                        timeRange: {
                            startTime: 200,
                            endTime: 500,
                        },
                        fillColor: '#22c55e',
                        textColor: '#e2e8f0',
                    },
                ],
            }),
        );
    });

    it('keeps the locally updated highlights when a later annotation save happens before prop sync', async () => {
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('highlight-toggle'));
        fireEvent.click(screen.getByText('save-highlight'));
        fireEvent.click(screen.getByText('Apply'));
        fireEvent.click(screen.getByText('annotation-toggle'));
        fireEvent.click(screen.getByText('open-create-annotation'));
        fireEvent.change(screen.getByLabelText('Annotation series'), {
            target: { value: '0' },
        });
        fireEvent.change(screen.getByLabelText('Annotation text'), {
            target: { value: 'Steady run' },
        });
        fireEvent.click(screen.getByText('Apply'));

        expect(jest.mocked(sProps.panelActions.onSavePanel).mock.calls.at(-1)).toEqual([
            expect.objectContaining({
                highlights: [
                    {
                        text: 'unnamed',
                        timeRange: {
                            startTime: 123,
                            endTime: 456,
                        },
                        fillColor: '#fdb532',
                        textColor: '#fdb532',
                    },
                ],
                data: expect.objectContaining({
                    tag_set: [
                        expect.objectContaining({
                            annotations: [
                                {
                                    text: 'Steady run',
                                    timeRange: expect.any(Object),
                                    fillColor: '#fff4b8',
                                    textColor: '#161616',
                                },
                            ],
                        }),
                    ],
                }),
            }),
        ]);
    });

    it('saves a new series annotation into the selected series when annotation mode is used', async () => {
        // Confirms annotation mode opens creation from a chart click and persists into the chosen series.
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        sPanelInfo.data.tag_set = [
            createTagAnalyzerSeriesConfigFixture({
                key: 'series-1',
                sourceTagName: 'temp_sensor',
            }),
            createTagAnalyzerSeriesConfigFixture({
                key: 'series-2',
                sourceTagName: 'pressure_sensor',
            }),
        ];
        const sProps = createProps(sPanelInfo);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('annotation-toggle'));
        fireEvent.click(screen.getByText('open-create-annotation'));
        expect(screen.getByText('annotation not selected')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Apply'));
        expect(sProps.panelActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Annotation series'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Annotation year'), {
            target: { value: '2026' },
        });
        fireEvent.change(screen.getByLabelText('Annotation month'), {
            target: { value: '4' },
        });
        fireEvent.change(screen.getByLabelText('Annotation day'), {
            target: { value: '24' },
        });
        fireEvent.change(screen.getByLabelText('Annotation text'), {
            target: { value: 'Compressor spike' },
        });
        fireEvent.change(screen.getByLabelText('Annotation fill color'), {
            target: { value: '#22c55e' },
        });
        fireEvent.change(screen.getByLabelText('Annotation text color'), {
            target: { value: '#f8fafc' },
        });
        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(screen.getByTestId('panel-range')).toHaveTextContent('300-450');
        });
        expect(screen.getByLabelText('Annotation fill color')).toHaveValue('#22c55e');
        expect(screen.getByLabelText('Annotation text color')).toHaveValue('#f8fafc');

        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.panelActions.onSavePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    tag_set: [
                        expect.objectContaining({
                            annotations: [],
                        }),
                        expect.objectContaining({
                            annotations: [
                                {
                                    text: 'Compressor spike',
                                    timeRange: {
                                        startTime: Date.UTC(2026, 3, 24),
                                        endTime: Date.UTC(2026, 3, 24),
                                    },
                                    fillColor: '#22c55e',
                                    textColor: '#f8fafc',
                                },
                            ],
                        }),
                    ],
                }),
            }),
        );
    });

    it('removes a temporary annotation when annotation creation is cancelled', async () => {
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('annotation-toggle'));
        fireEvent.click(screen.getByText('open-create-annotation'));
        expect(screen.getByText('Edit annotation')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Edit annotation')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('open-annotation-editor'));
        expect(screen.queryByText('Edit annotation')).not.toBeInTheDocument();
        expect(sProps.panelActions.onSavePanel).not.toHaveBeenCalled();
    });

    it('edits an existing series annotation through the inline annotation popover', async () => {
        // Confirms clicking a saved annotation opens the editor and saves back into the same series annotation list.
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        sPanelInfo.data.tag_set[0].annotations = [
            {
                text: 'note',
                timeRange: {
                    startTime: 321,
                    endTime: 321,
                },
            },
        ];
        const sProps = createProps(sPanelInfo);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('open-annotation-editor'));

        const sAnnotationInput = screen.getByDisplayValue('note');
        fireEvent.change(sAnnotationInput, { target: { value: 'Steady state' } });
        fireEvent.change(screen.getByLabelText('Annotation fill color'), {
            target: { value: '#0ea5e9' },
        });
        fireEvent.change(screen.getByLabelText('Annotation text color'), {
            target: { value: '#111827' },
        });
        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.panelActions.onSavePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    tag_set: [
                        expect.objectContaining({
                            annotations: [
                                {
                                    text: 'Steady state',
                                    timeRange: {
                                        startTime: 321,
                                        endTime: 321,
                                    },
                                    fillColor: '#0ea5e9',
                                    textColor: '#111827',
                                },
                            ],
                        }),
                    ],
                }),
            }),
        );
    });
});





