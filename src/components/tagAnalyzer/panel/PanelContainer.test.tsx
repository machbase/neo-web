import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerSeriesConfigFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import PanelContainer, {
    type PanelContainerBoardActions,
    type PanelContainerPanelActions,
} from './PanelContainer';
import type { PanelChartHandle } from '../domain/PanelChartModel';
import type {
    PanelHeaderActions,
    PanelMarkupHandlers,
    PanelNavigateState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
    PanelRangeHandlers,
} from './PanelTypes';
import type { PanelInfo } from '../domain/PanelModel';
import type { FetchedTimeBoundaryRange, TimeRangeMs } from '../time/TimeTypes';
import {
    resolvePanelTimeRange,
} from './PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../fetch/TimeBoundaryRangeResolver';
import { parseTimeRangeConfigFromBoundaryValues } from '../time/TimeBoundaryParser';
import { loadPanelChartState } from '../chartData/PanelChartDataLoader';

let mockAttachChartHandleDuringRender = true;

jest.mock('../chartData/PanelChartDataLoader', () => ({
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
    const MockPanelHeader = ({
        pHeaderActions,
        pOverlayModeActions,
    }: {
        pHeaderActions: Pick<
            PanelHeaderActions,
            | 'onToggleRaw'
            | 'onToggleOverlap'
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
                <button type="button" onClick={pHeaderActions.onToggleOverlap}>
                    overlap-toggle
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

jest.mock('../chart/PanelChartBody', () => {
    const MockPanelBody = ({
        pChartAreaRef,
        pChartApiRef,
        pIsRaw,
        pOverlayModeState,
        pNavigateState,
        pRangeHandlers,
        pMarkupHandlers,
        pOnSelection,
    }: {
        pChartAreaRef: MutableRefObject<HTMLDivElement | null>;
        pChartApiRef: MutableRefObject<PanelChartHandle | null>;
        pIsRaw: boolean;
        pOverlayModeState: PanelOverlayModeState;
        pNavigateState: PanelNavigateState;
        pRangeHandlers: PanelRangeHandlers;
        pMarkupHandlers: PanelMarkupHandlers;
        pOnSelection: (event: { min: number; max: number }) => void;
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
                            pOnSelection({ min: 123, max: 456 });
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

jest.mock('../chart/PanelChartFooter', () => {
    const MockPanelFooter = ({
        pNavigatorRange,
    }: {
        pNavigatorRange: TimeRangeMs;
    }) => {
        return (
            <div data-testid="panel-footer">
                <div data-testid="navigator-range">
                    {`${pNavigatorRange.startTime}-${pNavigatorRange.endTime}`}
                </div>
            </div>
        );
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
const toastWarningMock = jest
    .spyOn(Toast, 'warning')
    .mockImplementation(() => undefined);
const createPanelContainerBoardActions = (): PanelContainerBoardActions => ({
    onPersistPanelState: jest.fn(),
    onSavePanel: jest.fn(),
    onSetGlobalTimeRange: jest.fn(),
    onRegisterPanelCommands: jest.fn(() => jest.fn()),
});
const createPanelContainerPanelActions = (): PanelContainerPanelActions => ({
    onToggleOverlapSelection: jest.fn(),
    onUpdateOverlapSelection: jest.fn(),
    onDeletePanel: jest.fn(),
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
        globalTimeRange: undefined,
        rollupTableList: [],
    },
    overlapState: {
        isSelected: false,
        isAnchor: false,
    },
    boardActions: createPanelContainerBoardActions(),
    panelActions: createPanelContainerPanelActions(),
});

describe('PanelContainer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAttachChartHandleDuringRender = true;

        resolvePanelTimeRangeMock.mockImplementation(
            async () => createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
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
            expect(sProps.boardActions.onPersistPanelState).toHaveBeenCalled();
        });

        const sLatestPersistCall = jest
            .mocked(sProps.boardActions.onPersistPanelState)
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

    it('selects overlap using the live visible panel range', async () => {
        const sProps = createProps(
            createTagAnalyzerPanelInfoFixture({
                time: {
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                },
            }),
        );
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(screen.getByTestId('panel-range')).toHaveTextContent('300-450');
        });
        expect(screen.getByTestId('navigator-range')).toHaveTextContent('100-200');

        fireEvent.click(screen.getByText('overlap-toggle'));

        expect(sProps.panelActions.onToggleOverlapSelection).toHaveBeenCalledWith(
            300,
            450,
            false,
        );
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
                    'main',
                );
            });
        } finally {
            sClientWidthSpy.mockRestore();
        }
    });

    it('zooms the panel range to the limited returned data range', async () => {
        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'second', IntervalValue: 5 },
            limitedDataRange: { startTime: 120, endTime: 160 },
        });
        const sProps = createProps(
            createTagAnalyzerPanelInfoFixture({
                time: {
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                },
            }),
        );

        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('panel-range')).toHaveTextContent('120-160');
        });
        expect(screen.getByTestId('navigator-range')).toHaveTextContent('100-200');
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
                    startTime: 500,
                    endTime: 800,
                },
                [],
                'main',
            );
        });
        expect(loadPanelChartStateMock).toHaveBeenNthCalledWith(
            3,
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
            'navigator',
        );
    });

    it('refresh-data reloads main chart data from the visible panel range', async () => {
        // Keeps refresh-data aligned with zoom/range-change y-axis scaling.
        const sProps = createProps(
            createTagAnalyzerPanelInfoFixture({
                time: {
                    useTimeKeeper: true,
                    timeKeeper: {
                        panelRange: { startTime: 10, endTime: 20 },
                        navigatorRange: { startTime: 5, endTime: 25 },
                    },
                },
            }),
        );
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();

        fireEvent.click(screen.getByText('refresh-data'));

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenNthCalledWith(
                1,
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
                expect.any(Number),
                false,
                {
                    startTime: 10,
                    endTime: 20,
                },
                [],
                'main',
            );
        });
        expect(loadPanelChartStateMock).toHaveBeenNthCalledWith(
            2,
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            expect.any(Number),
            false,
            {
                startTime: 5,
                endTime: 25,
            },
            [],
            'navigator',
        );
    });

    it('refresh-data zooms to the limited range returned by the main query', async () => {
        const sProps = createProps(
            createTagAnalyzerPanelInfoFixture({
                time: {
                    useTimeKeeper: true,
                    timeKeeper: {
                        panelRange: { startTime: 10, endTime: 20 },
                        navigatorRange: { startTime: 5, endTime: 25 },
                    },
                },
            }),
        );
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });
        loadPanelChartStateMock.mockClear();
        loadPanelChartStateMock
            .mockResolvedValueOnce({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: 'second', IntervalValue: 5 },
                isLimitReached: true,
                limitedDataRange: { startTime: 12, endTime: 18 },
            })
            .mockResolvedValueOnce({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: 'second', IntervalValue: 5 },
            });

        fireEvent.click(screen.getByText('refresh-data'));

        await waitFor(() => {
            expect(screen.getByTestId('panel-range')).toHaveTextContent('12-18');
        });
        expect(toastWarningMock).toHaveBeenCalledWith(
            'Only limit amount was displayed.',
            undefined,
        );
        expect(screen.getByTestId('navigator-range')).toHaveTextContent('5-25');
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
                'main',
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
                'main',
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

    it('keeps navigation sampling separate when loading raw data from the raw toggle', async () => {
        // Confirms raw mode does not silently enable navigator sampling.
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
                        enabled: false,
                    }),
                }),
                expect.any(Object),
                expect.any(Number),
                true,
                {
                    startTime: 10,
                    endTime: 20,
                },
                [],
                'main',
            );
        });
        expect(loadPanelChartStateMock).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            expect.objectContaining({
                sampling: expect.objectContaining({
                    enabled: false,
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
            'navigator',
        );
        expect(sProps.boardActions.onSavePanel).not.toHaveBeenCalled();
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
        expect(sProps.boardActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('highlight-toggle'));
        expect(screen.getByTestId('panel-highlight')).toHaveTextContent('true');
        fireEvent.click(screen.getByText('save-highlight'));
        expect(screen.getByTestId('panel-highlight')).toHaveTextContent('false');
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
        expect(sProps.boardActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.boardActions.onSavePanel).toHaveBeenCalledWith(
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
        expect(sProps.boardActions.onSavePanel).not.toHaveBeenCalled();
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

        expect(sProps.boardActions.onSavePanel).toHaveBeenCalledWith(
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

        expect(jest.mocked(sProps.boardActions.onSavePanel).mock.calls.at(-1)).toEqual([
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
        expect(sProps.boardActions.onSavePanel).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Annotation series'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Annotation time'), {
            target: { value: '2026-04-24 10:11:12.345' },
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
        fireEvent.click(screen.getByLabelText('Clip annotation to panel range'));
        fireEvent.click(screen.getByText('change-range'));

        await waitFor(() => {
            expect(screen.getByTestId('panel-range')).toHaveTextContent('300-450');
        });
        expect(screen.getByLabelText('Annotation fill color')).toHaveValue('#22c55e');
        expect(screen.getByLabelText('Annotation text color')).toHaveValue('#f8fafc');
        expect(screen.getByLabelText('Clip annotation to panel range')).toBeChecked();

        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.boardActions.onSavePanel).toHaveBeenCalledWith(
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
                                        startTime: Date.UTC(2026, 3, 24, 10, 11, 12, 345),
                                        endTime: Date.UTC(2026, 3, 24, 10, 11, 12, 345),
                                    },
                                    fillColor: '#22c55e',
                                    textColor: '#f8fafc',
                                    clip: true,
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
        expect(sProps.boardActions.onSavePanel).not.toHaveBeenCalled();
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
                clip: true,
            },
        ];
        const sProps = createProps(sPanelInfo);
        render(<PanelContainer {...sProps} />);

        await waitFor(() => {
            expect(loadPanelChartStateMock).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText('open-annotation-editor'));

        const sAnnotationInput = screen.getByDisplayValue('note');
        expect(screen.getByLabelText('Clip annotation to panel range')).toBeChecked();
        fireEvent.change(sAnnotationInput, { target: { value: 'Steady state' } });
        fireEvent.change(screen.getByLabelText('Annotation fill color'), {
            target: { value: '#0ea5e9' },
        });
        fireEvent.change(screen.getByLabelText('Annotation text color'), {
            target: { value: '#111827' },
        });
        fireEvent.click(screen.getByLabelText('Clip annotation to panel range'));
        fireEvent.click(screen.getByText('Apply'));

        expect(sProps.boardActions.onSavePanel).toHaveBeenCalledWith(
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





