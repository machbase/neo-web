import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import {
    createTagAnalyzerPanelInfoFixture,
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
import { loadPanelChartState } from '../utils/fetch/PanelChartDataLoader';
import {
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from '../utils/time/PanelTimeRangeResolver';
import { normalizeLegacyTimeRangeBoundary } from '../utils/legacy/LegacyTimeAdapter';
import BoardPanel from './BoardPanel';

// Used by PanelContainer tests to type mock header props.
type MockHeaderProps = {
    pActionHandlers: Pick<PanelActionHandlers, 'onToggleHighlight'>;
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
    pOnHighlightSelection: (aStartTime: number, aEndTime: number) => void;
};

jest.mock('recoil', () => {
    const sActual = jest.requireActual('recoil');
    return {
        ...sActual,
        useRecoilValue: jest.fn(),
    };
});

jest.mock('../utils/fetch/PanelChartDataLoader', () => ({
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

jest.mock('../chart/ChartBody', () => {
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
            </div>
        );
    };

    return MockPanelBody;
});

jest.mock('../chart/ChartFooter', () => {
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

const useRecoilValueMock = jest.mocked(useRecoilValue);
const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const resolveInitialPanelRangeMock = jest.mocked(resolveInitialPanelRange);
const resolveResetTimeRangeMock = jest.mocked(resolveResetTimeRange);

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
    timeBoundaryRanges: undefined,
    globalTimeRange: undefined,
});

/**
 * Builds the board-chart props used by the focused controller contract tests.
 * Intent: Keep the panel container test setup in one explicit fixture helper.
 * @param aPanelInfo The panel info override for the test case.
 * @returns The board-chart props for the current test.
 */
const createProps = (aPanelInfo: PanelInfo | undefined) => ({
    ...(() => {
        const sBoardRange = normalizeLegacyTimeRangeBoundary('now-1h', 'now');
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
        aPanelInfo ??
        createTagAnalyzerPanelInfoFixture({
            time: {
                use_time_keeper: true,

                time_keeper: undefined,
            },
        }),
    pChartBoardState: createBoardPanelState(),
    pChartBoardActions: createBoardPanelActions(),
    pIsSelectedForOverlap: false,
    pIsOverlapAnchor: false,
    pOnToggleOverlapSelection: jest.fn(),
    pOnUpdateOverlapSelection: jest.fn(),
    pOnDeletePanel: jest.fn(),
});

describe('BoardPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        useRecoilValueMock.mockImplementation((aAtom) => {
            if (aAtom === gSelectedTab) {
                return 'board-1';
            }
            if (aAtom === gRollupTableList) {
                return [];
            }
            return undefined;
        });

        resolveInitialPanelRangeMock.mockResolvedValue(
            createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
        );
        resolveResetTimeRangeMock.mockResolvedValue(
            createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
        );
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
});

