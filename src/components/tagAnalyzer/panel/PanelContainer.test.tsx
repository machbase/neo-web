import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import type { BoardPanelActions, TagAnalyzerBoardPanelState } from '../TagAnalyzerTypes';
import type {
    PanelChartRefs,
    PanelNavigateState,
    PanelState,
    TagAnalyzerPanelInfo,
} from './PanelModel';
import { loadPanelChartState } from '../utils/TagAnalyzerFetchUtils';
import { resolveInitialPanelRange, resolveResetTimeRange } from './PanelRangeUtils';
import { normalizeLegacyTimeRangeBoundary } from '../utils/legacy/LegacyUtils';
import PanelContainer from './PanelContainer';

// Used by PanelContainer tests to type mock header props.
type MockHeaderProps = {
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
    pChartHandlers: {
        onSetExtremes: (aEvent: {
            min: number;
            max: number;
            trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
        }) => unknown;
        onSetNavigatorExtremes: (aEvent: {
            min: number;
            max: number;
            trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
        }) => unknown;
    };
};

jest.mock('recoil', () => {
    const sActual = jest.requireActual('recoil');
    return {
        ...sActual,
        useRecoilValue: jest.fn(),
    };
});

jest.mock('../utils/TagAnalyzerFetchUtils', () => ({
    loadPanelChartState: jest.fn(),
}));

jest.mock('./PanelRangeUtils', () => {
    const sActual = jest.requireActual('./PanelRangeUtils');
    return {
        ...sActual,
        resolveInitialPanelRange: jest.fn(),
        resolveResetTimeRange: jest.fn(),
    };
});

jest.mock('./PanelHeader', () => {
    return function MockPanelHeader({ pRefreshHandlers }: MockHeaderProps) {
        return (
            <div data-testid="panel-header">
                <button type="button" onClick={pRefreshHandlers.onRefreshData}>
                    refresh-data
                </button>
                <button type="button" onClick={pRefreshHandlers.onRefreshTime}>
                    refresh-time
                </button>
            </div>
        );
    };
});

jest.mock('./PanelBody', () => {
    return function MockPanelBody({
        pChartRefs,
        pPanelState,
        pNavigateState,
        pChartHandlers,
    }: MockBodyProps) {
        pChartRefs.chartWrap.current = {
            setPanelRange: jest.fn(),
            getVisibleSeries: jest.fn(() => []),
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
            </div>
        );
    };
});

jest.mock('./PanelFooter', () => {
    return function MockPanelFooter() {
        return <div data-testid="panel-footer" />;
    };
});

const useRecoilValueMock = jest.mocked(useRecoilValue);
const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const resolveInitialPanelRangeMock = jest.mocked(resolveInitialPanelRange);
const resolveResetTimeRangeMock = jest.mocked(resolveResetTimeRange);

const createBoardPanelActions = (): BoardPanelActions => ({
    onOverlapSelectionChange: jest.fn(),
    onDeletePanel: jest.fn(),
    onPersistPanelState: jest.fn(),
    onSetGlobalTimeRange: jest.fn(),
    onOpenEditRequest: jest.fn(),
});

const createBoardPanelState = (): Pick<
    TagAnalyzerBoardPanelState,
    'refreshCount' | 'bgnEndTimeRange' | 'globalTimeRange'
> => ({
    refreshCount: 0,
    bgnEndTimeRange: undefined,
    globalTimeRange: undefined,
});

/**
 * Builds the board-chart props used by the focused controller contract tests.
 * @param aPanelInfo The panel info override for the test case.
 * @returns The board-chart props for the current test.
 */
const createProps = (aPanelInfo: TagAnalyzerPanelInfo | undefined) => ({
    ...(() => {
        const sBoardRange = normalizeLegacyTimeRangeBoundary('now-1h', 'now');
        return {
            pBoardContext: {
                id: 'board-1',
                range: sBoardRange.range,
                rangeConfig: sBoardRange.rangeConfig,
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

describe('PanelContainer', () => {
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
            'panel-1',
            expect.objectContaining({
                panelRange: { startTime: 300, endTime: 450 },
            }),
            false,
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
});
