import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerSeriesConfigFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import PanelContainer, {
    type PanelContainerBoardActions,
    type PanelContainerBoardState,
} from './PanelContainer';
import type {
    PanelActionHandlers,
    PanelChartRefs,
    PanelChartHandlers,
    PanelNavigateState,
    PanelState,
} from './PanelTypes';
import type { PanelInfo } from '../PanelModelTypes';
import type { FetchedTimeBoundaryRange } from '../time/TimeTypes';
import {
    resolvePanelTimeRange,
} from './PanelTimeRangeResolver';
import { resolveTimeBoundaryRanges } from '../fetch/TimeBoundaryRangeResolver';
import { parseTimeRangeConfigFromBoundaryValues } from './editor/EditorTimeBoundaryParser';
import { loadPanelChartState } from '../fetch/PanelChartStateLoader';

let mockAttachChartHandleDuringRender = true;

jest.mock('../fetch/PanelChartStateLoader', () => ({
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
    resolveTimeBoundaryRanges: jest.fn(),
}));

jest.mock('./PanelHeader', () => {
    /**
     * Renders the mocked panel header used by the container tests.
     * Intent: Keep the container test focused on header handler wiring instead of header layout.
     * @param pRefreshHandlers The mocked refresh handlers passed from PanelContainer.
     * @returns The mocked panel header element.
     */
    const MockPanelHeader = ({
        pActionHandlers,
        pRefreshHandlers,
    }: {
        pActionHandlers: Pick<
            PanelActionHandlers,
            'onToggleHighlight' | 'onToggleAnnotation' | 'onToggleEdit'
        >;
        pRefreshHandlers: {
            onRefreshData: () => void | Promise<void>;
            onRefreshTime: () => void | Promise<void>;
        };
    }) => {
        return (
            <div data-testid="panel-header">
                <button type="button" onClick={pActionHandlers.onToggleHighlight}>
                    highlight-toggle
                </button>
                <button type="button" onClick={pActionHandlers.onToggleAnnotation}>
                    annotation-toggle
                </button>
                <button type="button" onClick={pActionHandlers.onToggleEdit}>
                    edit-toggle
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
    }: {
        pChartRefs: PanelChartRefs;
        pPanelState: PanelState;
        pNavigateState: PanelNavigateState;
        pChartHandlers: PanelChartHandlers;
        pOnHighlightSelection: (startTime: number, endTime: number) => void;
    }) => {
        if (mockAttachChartHandleDuringRender) {
            pChartRefs.chartWrap.current = {
                setPanelRange: jest.fn(),
                getVisibleSeries: jest.fn(() => []),
                getHighlightIndexAtClientPosition: jest.fn(() => undefined),
            };
        }

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

jest.mock('./editor/PanelEditor', () => {
    const MockPanelEditor = () => <div data-testid="panel-editor" />;

    return MockPanelEditor;
});

const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const resolvePanelTimeRangeMock = jest.mocked(resolvePanelTimeRange);
const resolveTimeBoundaryRangesMock = jest.mocked(resolveTimeBoundaryRanges);

/**
 * Builds the board-panel action spies used by the container tests.
 * Intent: Keep the container test fixtures explicit and reusable across cases.
 * @returns The mocked board-panel actions.
 */
const createPanelContainerBoardActions = (): PanelContainerBoardActions => ({
    onPersistPanelState: jest.fn(),
    onSavePanel: jest.fn(),
    onSetGlobalTimeRange: jest.fn(),
});

/**
 * Builds the board-chart state fixture used by the container tests.
 * Intent: Provide a predictable board state snapshot for each test case.
 * @returns The mocked board-chart state.
 */
const createPanelContainerBoardState = (): PanelContainerBoardState => ({
    refreshCount: 0,
    timeBoundaryRanges: null,
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
    ...(() => {
        const sBoardRange = parseTimeRangeConfigFromBoundaryValues('now-1h', 'now');
        return {
            pBoardContext: {
                id: 'board-1',
                time: sBoardRange,
            },
        };
    })(),
        pPanelInfo:
        panelInfo ??
        createTagAnalyzerPanelInfoFixture({
            time: {
                useTimeKeeper: true,
                timeKeeper: undefined,
            },
        }),
    pIsActiveTab: true,
    pChartBoardState: createPanelContainerBoardState(),
    pChartBoardActions: createPanelContainerBoardActions(),
    pIsSelectedForOverlap: false,
    pIsOverlapAnchor: false,
    pRollupTableList: [],
    pOnToggleOverlapSelection: jest.fn(),
    pOnUpdateOverlapSelection: jest.fn(),
    pOnDeletePanel: jest.fn(),
    pTables: [],
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
        resolveTimeBoundaryRangesMock.mockResolvedValue(undefined);
        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
                rangeOption: { IntervalType: 'second', IntervalValue: 5 },
            overflowRange: undefined,
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
        render(<PanelContainer {...sProps} />);

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
                ...createPanelContainerBoardState(),
                timeBoundaryRanges: createFetchedTimeBoundaryRange(1000, 2000),
            },
        };
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
            pChartBoardState: {
                ...createPanelContainerBoardState(),
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

    it('recalculates boundary ranges before resolving refresh-time', async () => {
        // Confirms refresh-time uses the initial-load resolver with fresh boundary data instead of only reusing the board state's stored boundary snapshot.
        const sFreshBoundaryRanges = createFetchedTimeBoundaryRange(500, 800);
        resolveTimeBoundaryRangesMock.mockResolvedValue(sFreshBoundaryRanges);
        resolvePanelTimeRangeMock.mockImplementation(
            async (_boardTime, _panelData, _panelTime, timeBoundaryRanges) => ({
                startTime: timeBoundaryRanges?.start.min.timestamp ?? 0,
                endTime: timeBoundaryRanges?.end.max.timestamp ?? 0,
            }),
        );
        const sProps = {
            ...createProps(undefined),
            pChartBoardState: {
                ...createPanelContainerBoardState(),
                timeBoundaryRanges: createFetchedTimeBoundaryRange(100, 200),
            },
        };
        render(<PanelContainer {...sProps} />);

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
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('refresh-time'));

        await waitFor(() => {
            expect(resolvePanelTimeRangeMock).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                'initialize',
            );
        });
        expect(
            resolvePanelTimeRangeMock.mock.calls.every(([, , , , mode]) => mode === 'initialize'),
        ).toBe(true);
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

        fireEvent.click(screen.getByText('edit-toggle'));
        expect(screen.queryByTestId('panel-editor')).not.toBeInTheDocument();
    });

    it('saves a new unnamed highlight into the panel when highlight mode is used', async () => {
        // Confirms highlight selections persist through the board save path instead of staying local-only.
        const sProps = createProps(undefined);
        render(<PanelContainer {...sProps} />);

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
                        fillColor: '#fdb532',
                        textColor: '#fdb532',
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

        const sRenameInput = screen.getByDisplayValue('unnamed');
        fireEvent.change(sRenameInput, { target: { value: 'Batch Window' } });
        fireEvent.change(screen.getByLabelText('Highlight fill color'), {
            target: { value: '#22c55e' },
        });
        fireEvent.change(screen.getByLabelText('Highlight text color'), {
            target: { value: '#e2e8f0' },
        });
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
        fireEvent.click(screen.getByText('annotation-toggle'));
        fireEvent.change(screen.getByLabelText('Annotation text'), {
            target: { value: 'Steady run' },
        });
        fireEvent.click(screen.getByText('Apply'));

        expect(jest.mocked(sProps.pChartBoardActions.onSavePanel).mock.calls.at(-1)).toEqual([
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
                                },
                            ],
                        }),
                    ],
                }),
            }),
        ]);
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
        render(<PanelContainer {...sProps} />);

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
        render(<PanelContainer {...sProps} />);

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





