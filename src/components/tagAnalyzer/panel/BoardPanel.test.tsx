import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerSeriesConfigFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import type {
    BoardChartState,
    BoardPanelActions,
} from '../utils/boardTypes';
import type {
    PanelActionHandlers,
    PanelChartRefs,
    PanelChartHandlers,
    PanelNavigateState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import {
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from '../utils/time/PanelTimeRangeResolver';
import { resolveTimeBoundaryRanges } from '../utils/time/TimeBoundaryRangeResolver';
import { normalizeStoredTimeRangeBoundary } from '../utils/time/StoredTimeRangeAdapter';
import { loadPanelChartState } from '../utils/fetch/PanelChartStateLoader';
import BoardPanel from './BoardPanel';

// Used by PanelContainer tests to type mock header props.
type MockHeaderProps = {
    pActionHandlers: Pick<PanelActionHandlers, 'onToggleHighlight' | 'onToggleAnnotation'>;
    pRefreshHandlers: {
        onRefreshData: () => void | Promise<void>;
        onRefreshTime: () => void | Promise<void>;
    };
};

// Used by PanelContainer tests to type mock body props.
type MockBodyProps = {
    pChartRefs: PanelChartRefs;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pOnHighlightSelection: (startTime: number, endTime: number) => void;
};

jest.mock('../utils/fetch/PanelChartStateLoader', () => ({
    loadPanelChartState: jest.fn(),
}));

jest.mock('../utils/time/PanelTimeRangeResolver', () => {
    const sActual = jest.requireActual('../utils/time/PanelTimeRangeResolver');
    return {
        ...sActual,
        resolveInitialPanelRange: jest.fn(),
        resolveResetTimeRange: jest.fn(),
    };
});

jest.mock('../utils/time/TimeBoundaryRangeResolver', () => ({
    resolveTimeBoundaryRanges: jest.fn(),
}));

jest.mock('./BoardPanelHeader', () => {
    /**
     * Renders the mocked panel header used by the container tests.
     * Intent: Keep the container test focused on header handler wiring instead of header layout.
     * @param pRefreshHandlers The mocked refresh handlers passed from PanelContainer.
     * @returns The mocked panel header element.
     */
    const MockPanelHeader = ({ pActionHandlers, pRefreshHandlers }: MockHeaderProps) => {
        return (
            <div data-testid="panel-header">
                <button type="button" onClick={pActionHandlers.onToggleHighlight}>
                    highlight-toggle
                </button>
                <button type="button" onClick={pActionHandlers.onToggleAnnotation}>
                    annotation-toggle
                </button>
                <button type="button" onClick={pRefreshHandlers.onRefreshData}>
                    refresh-data
                </button>
                <button type="button" onClick={pRefreshHandlers.onRefreshTime}>
                    refresh-time
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
     * @param pChartRefs The chart refs passed from PanelContainer.
     * @param pPanelState The panel-local state passed from PanelContainer.
     * @param pNavigateState The current navigate state passed from PanelContainer.
     * @param pChartHandlers The chart handlers passed from PanelContainer.
     * @returns The mocked panel body element.
     */
    const MockPanelBody = ({
        pChartRefs,
        pPanelState,
        pNavigateState,
        pChartHandlers,
        pOnHighlightSelection,
    }: MockBodyProps) => {
        pChartRefs.chartWrap.current = {
            setPanelRange: jest.fn(),
            getVisibleSeries: jest.fn(() => []),
            getHighlightIndexAtClientPosition: jest.fn(() => undefined),
        };

        return (
            <div ref={pChartRefs.areaChart} data-testid="panel-body">
                <div data-testid="panel-raw">{String(pPanelState.isRaw)}</div>
                <div data-testid="panel-range">
                    {`${pNavigateState.panelRange.startTime}-${pNavigateState.panelRange.endTime}`}
                </div>
                <button
                    type="button"
                    onClick={() =>
                        pChartHandlers.onSetExtremes({
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
                        if (pPanelState.isHighlightActive) {
                            pOnHighlightSelection(123, 456);
                        }
                    }}
                >
                    save-highlight
                </button>
                <button
                    type="button"
                    onClick={() =>
                        pChartHandlers.onOpenHighlightRename({
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
                        pChartHandlers.onOpenSeriesAnnotationEditor({
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

const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const resolveInitialPanelRangeMock = jest.mocked(resolveInitialPanelRange);
const resolveResetTimeRangeMock = jest.mocked(resolveResetTimeRange);
const resolveTimeBoundaryRangesMock = jest.mocked(resolveTimeBoundaryRanges);

/**
 * Builds the board-panel action spies used by the container tests.
 * Intent: Keep the container test fixtures explicit and reusable across cases.
 * @returns The mocked board-panel actions.
 */
const createBoardPanelActions = (): BoardPanelActions => ({
    onOverlapSelectionChange: jest.fn(),
    onDeletePanel: jest.fn(),
    onPersistPanelState: jest.fn(),
    onSavePanel: jest.fn(),
    onSetGlobalTimeRange: jest.fn(),
    onOpenEditRequest: jest.fn(),
});

/**
 * Builds the board-chart state fixture used by the container tests.
 * Intent: Provide a predictable board state snapshot for each test case.
 * @returns The mocked board-chart state.
 */
const createBoardPanelState = (): BoardChartState => ({
    refreshCount: 0,
    timeBoundaryRanges: null,
    globalTimeRange: undefined,
});

/**
 * Builds the board-chart props used by the focused controller contract tests.
 * Intent: Keep the panel container test setup in one explicit fixture helper.
 * @param panelInfo The panel info override for the test case.
 * @returns The board-chart props for the current test.
 */
const createProps = (panelInfo: PanelInfo | undefined) => ({
    ...(() => {
        const sBoardRange = normalizeStoredTimeRangeBoundary('now-1h', 'now');
        return {
            pBoardContext: {
                id: 'board-1',
                time: {
                    range: sBoardRange.range,
                    rangeConfig: sBoardRange.rangeConfig,
                },
            },
        };
    })(),
    pPanelInfo:
        panelInfo ??
        createTagAnalyzerPanelInfoFixture({
            time: {
                use_time_keeper: true,

                time_keeper: undefined,
            },
        }),
    pIsActiveTab: true,
    pChartBoardState: createBoardPanelState(),
    pChartBoardActions: createBoardPanelActions(),
    pIsSelectedForOverlap: false,
    pIsOverlapAnchor: false,
    pRollupTableList: [],
    pOnToggleOverlapSelection: jest.fn(),
    pOnUpdateOverlapSelection: jest.fn(),
    pOnDeletePanel: jest.fn(),
});

describe('BoardPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        resolveInitialPanelRangeMock.mockResolvedValue(
            createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
        );
        resolveResetTimeRangeMock.mockResolvedValue(
            createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
        );
        resolveTimeBoundaryRangesMock.mockResolvedValue(undefined);
        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
            overflowRange: undefined,
        });
    });

    it('keeps board-only persistence outside the shared runtime controller without touching overlap state for unselected panels', async () => {
        // Confirms ordinary panel range changes no longer bounce through overlap state unless the panel is selected.
        const sProps = createProps(undefined);
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(sProps.pChartBoardActions.onPersistPanelState).toHaveBeenCalled();
        });

        const sLatestPersistCall = jest
            .mocked(sProps.pChartBoardActions.onPersistPanelState)
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
        expect(sProps.pOnUpdateOverlapSelection).not.toHaveBeenCalled();
    });

    it('updates overlap state after a range change only when the panel is selected for overlap', async () => {
        // Confirms selected overlap panels still keep their saved overlap window in sync.
        const sProps = {
            ...createProps(undefined),
            pIsSelectedForOverlap: true,
        };
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(sProps.pOnUpdateOverlapSelection).toHaveBeenCalledWith(300, 450, false);
        });
    });

    it('does not auto-reset the freshly initialized panel when boundary ranges already exist', async () => {
        // Confirms the initial panel load keeps its own visible range instead of immediately jumping to the board range.
        const sProps = {
            ...createProps(undefined),
            pChartBoardState: {
                ...createBoardPanelState(),
                timeBoundaryRanges: {
                    start: { min: 1000, max: 1000 },
                    end: { min: 2000, max: 2000 },
                },
            },
        };
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(resolveResetTimeRangeMock).not.toHaveBeenCalled();
    });

    it('ignores refresh-time when the initial resolver returns the empty range sentinel', async () => {
        // Confirms the refresh-time button does not push an unresolved 0-0 range through the fetch path.
        resolveInitialPanelRangeMock.mockResolvedValue({
            startTime: 0,
            endTime: 0,
        });
        const sProps = createProps(undefined);
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('refresh-time'));
        await Promise.resolve();
        await Promise.resolve();

        expect(loadPanelChartStateMock).not.toHaveBeenCalled();
    });

    it('recalculates boundary ranges before resolving refresh-time', async () => {
        // Confirms refresh-time uses the initial-load resolver with fresh boundary data instead of only reusing the board state's stored boundary snapshot.
        const sFreshBoundaryRanges = {
            start: { min: 500, max: 500 },
            end: { min: 800, max: 800 },
        };
        resolveTimeBoundaryRangesMock.mockResolvedValue(sFreshBoundaryRanges);
        resolveInitialPanelRangeMock.mockImplementation(
            async (_boardTime, _panelData, _panelTime, timeBoundaryRanges) => ({
                startTime: timeBoundaryRanges?.start.min ?? 0,
                endTime: timeBoundaryRanges?.end.max ?? 0,
            }),
        );
        const sProps = {
            ...createProps(undefined),
            pChartBoardState: {
                ...createBoardPanelState(),
                timeBoundaryRanges: {
                    start: { min: 100, max: 100 },
                    end: { min: 200, max: 200 },
                },
            },
        };
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('refresh-time'));

        await waitFor(() => {
            expect(resolveTimeBoundaryRangesMock).toHaveBeenCalled();
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

    it('uses the initial resolver instead of the reset resolver when refresh-time is clicked', async () => {
        const sProps = createProps(undefined);
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('refresh-time'));

        await waitFor(() => {
            expect(resolveInitialPanelRangeMock).toHaveBeenCalled();
        });
        expect(resolveResetTimeRangeMock).not.toHaveBeenCalled();
    });

    it('opens the panel context menu on right click', async () => {
        // Confirms the board panel still renders the right-click menu from the container boundary.
        const sProps = createProps(undefined);
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.contextMenu(screen.getByTestId('panel-body'));

        expect(screen.getByText('Refresh data')).toBeInTheDocument();
        expect(screen.getByText('Delete panel')).toBeInTheDocument();
    });

    it('saves a new unnamed highlight into the panel when highlight mode is used', async () => {
        // Confirms highlight selections persist through the board save path instead of staying local-only.
        const sProps = createProps(undefined);
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('save-highlight'));
        expect(sProps.pChartBoardActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('highlight-toggle'));
        fireEvent.click(screen.getByText('save-highlight'));

        expect(sProps.pChartBoardActions.onSavePanel).toHaveBeenCalledWith(
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
                    },
                ],
            }),
        );
    });

    it('renames a highlight through the direct highlight rename popup', async () => {
        // Confirms clicking a saved highlight opens the rename popup directly instead of the panel-wide menu.
        const sProps = createProps(
            createTagAnalyzerPanelInfoFixture({
                highlights: [
                    {
                        text: 'unnamed',
                        timeRange: {
                            startTime: 123,
                            endTime: 456,
                        },
                    },
                ],
            }),
        );
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('open-highlight-rename'));

        const sRenameInput = screen.getByDisplayValue('unnamed');
        fireEvent.change(sRenameInput, { target: { value: 'Batch Window' } });
        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.pChartBoardActions.onSavePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                highlights: [
                    {
                        text: 'Batch Window',
                        timeRange: {
                            startTime: 123,
                            endTime: 456,
                        },
                    },
                ],
            }),
        );
    });

    it('saves a new series annotation into the selected series when annotation mode is used', async () => {
        // Confirms toolbar-driven annotation creation persists into the chosen series.
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
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('annotation-toggle'));
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
        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.pChartBoardActions.onSavePanel).toHaveBeenCalledWith(
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
                                },
                            ],
                        }),
                    ],
                }),
            }),
        );
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
        render(<BoardPanel {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('open-annotation-editor'));

        const sAnnotationInput = screen.getByDisplayValue('note');
        fireEvent.change(sAnnotationInput, { target: { value: 'Steady state' } });
        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.pChartBoardActions.onSavePanel).toHaveBeenCalledWith(
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
                                },
                            ],
                        }),
                    ],
                }),
            }),
        );
    });
});

