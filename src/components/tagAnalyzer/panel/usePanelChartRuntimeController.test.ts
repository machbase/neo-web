import { act, renderHook } from '@testing-library/react';
import { usePanelChartRuntimeController } from './usePanelChartRuntimeController';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import type { PanelChartHandle } from './PanelTypes';
import { loadPanelChartState } from '../utils/fetch/PanelChartStateLoader';

jest.mock('../utils/fetch/PanelChartStateLoader', () => ({
    loadPanelChartState: jest.fn(),
}));

const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const EMPTY_BOARD_TIME = { kind: 'empty' as const };
const createTimeRange = (startTime: number, endTime: number) => createTagAnalyzerTimeRangeFixture({ startTime, endTime });
const DEFAULT_RANGE = createTimeRange(100, 200);
const EMPTY_LOAD_STATE = { chartData: { datasets: [] }, overflowRange: undefined };
const RANGE_OPTION = { IntervalType: 'sec', IntervalValue: 1 };

function createChartHandle(): PanelChartHandle {
    return {
        setPanelRange: jest.fn(),
        getVisibleSeries: jest.fn(() => []),
        getHighlightIndexAtClientPosition: jest.fn(() => undefined),
    };
}

type UsePanelChartRuntimeControllerParams = Parameters<typeof usePanelChartRuntimeController>[0];

function renderChartRuntimeController(
    overrides: Partial<UsePanelChartRuntimeControllerParams> = {},
) {
    const params: UsePanelChartRuntimeControllerParams = {
        panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
        areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
        chartRef: { current: null },
        rollupTableList: [],
        isRaw: false,
        boardTime: EMPTY_BOARD_TIME,
        onPanelRangeApplied: undefined,
        ...overrides,
    };
    return renderHook(() => usePanelChartRuntimeController(params));
}

function mockLoadPanelChartState(
    rangeOption: { IntervalType: string; IntervalValue: number } = RANGE_OPTION,
) {
    loadPanelChartStateMock.mockResolvedValue({
        ...EMPTY_LOAD_STATE,
        rangeOption,
    });
}

async function changePanelRange(
    result: ReturnType<typeof renderChartRuntimeController>['result'],
    range: { startTime: number; endTime: number },
) {
    await act(async () => {
        await result.current.handlePanelRangeChange({
            min: range.startTime,
            max: range.endTime,
            trigger: 'navigator',
        });
    });
}

async function applyLoadedRanges(
    result: ReturnType<typeof renderChartRuntimeController>['result'],
    panelRange: ReturnType<typeof createTimeRange>,
    navigatorRange: ReturnType<typeof createTimeRange> = panelRange,
) {
    await act(async () => void (await result.current.applyLoadedRanges(panelRange, navigatorRange)));
}

function expectLastLoadRequest(
    range: { startTime: number; endTime: number },
    width: number,
) {
    expect(loadPanelChartStateMock).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        EMPTY_BOARD_TIME,
        width,
        false,
        range,
        [],
    );
}

describe('usePanelChartRuntimeController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('treats slider drags inside the current navigator range as local view changes', async () => {
        const onPanelRangeApplied = jest.fn();
        const chartRef = { current: createChartHandle() };
        const { result } = renderChartRuntimeController({
            chartRef,
            onPanelRangeApplied,
        });

        act(() => {
            result.current.updateNavigateState({
                panelRange: DEFAULT_RANGE,
                navigatorRange: createTimeRange(0, 1000),
            });
        });

        await act(async () => {
            await result.current.handlePanelRangeChange({
                min: 350,
                max: 450,
                trigger: 'navigator',
            });
        });

        expect(result.current.navigateState.panelRange).toEqual({
            startTime: 350,
            endTime: 450,
        });
        expect(onPanelRangeApplied).toHaveBeenCalledWith(
            { startTime: 350, endTime: 450 },
            expect.objectContaining({
                navigatorRange: { startTime: 0, endTime: 1000 },
                isRaw: false,
            }),
        );
        expect(loadPanelChartStateMock).not.toHaveBeenCalled();
    });

    it('refetches data when the visible range width changes', async () => {
        mockLoadPanelChartState();
        const { result } = renderChartRuntimeController();

        act(() => {
            result.current.updateNavigateState({
                panelRange: createTimeRange(0, 1000),
                navigatorRange: createTimeRange(0, 1000),
            });
        });

        await changePanelRange(result, { startTime: 250, endTime: 750 });

        expectLastLoadRequest({ startTime: 250, endTime: 750 }, 800);
        expect(result.current.navigateState.navigatorRange).toEqual({
            startTime: 0,
            endTime: 1000,
        });
    });

    it('refetches when panning outside the loaded data range after a zoom', async () => {
        mockLoadPanelChartState();
        const { result } = renderChartRuntimeController();

        await applyLoadedRanges(result, createTimeRange(0, 2000));
        await changePanelRange(result, { startTime: 250, endTime: 750 });
        await changePanelRange(result, { startTime: 600, endTime: 1100 });

        expect(loadPanelChartStateMock).toHaveBeenCalledTimes(3);
        expectLastLoadRequest({ startTime: 600, endTime: 1100 }, 800);
    });

    it('loads chart data for the navigator range when the overview window changes', async () => {
        const navigatorRange = createTimeRange(0, 1000);
        const panelRange = createTimeRange(100, 200);

        mockLoadPanelChartState({ IntervalType: 'sec', IntervalValue: 5 });

        const { result } = renderChartRuntimeController();

        await applyLoadedRanges(result, panelRange, navigatorRange);

        expectLastLoadRequest(navigatorRange, 800);
        expect(result.current.navigateState.navigatorRange).toEqual(navigatorRange);
        expect(result.current.navigateState.panelRange).toEqual(panelRange);
    });

    it('keeps the last resolved interval when a later refresh returns the empty interval sentinel', async () => {
        loadPanelChartStateMock
            .mockResolvedValueOnce({
                ...EMPTY_LOAD_STATE,
                rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
            })
            .mockResolvedValueOnce({
                ...EMPTY_LOAD_STATE,
                rangeOption: { IntervalType: '', IntervalValue: 0 },
            });

        const { result } = renderChartRuntimeController();

        await applyLoadedRanges(result, DEFAULT_RANGE);
        await act(async () => {
            result.current.setExtremes(createTimeRange(300, 400), createTimeRange(300, 400));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.navigateState.rangeOption).toEqual({
            IntervalType: 'sec',
            IntervalValue: 5,
        });
    });

    it('falls back to chart width 1 when the chart container is missing', async () => {
        mockLoadPanelChartState({ IntervalType: 'sec', IntervalValue: 5 });
        const panelRange = createTimeRange(100, 200);
        const { result } = renderChartRuntimeController({
            areaChartRef: { current: null },
        });

        await applyLoadedRanges(result, panelRange);

        expectLastLoadRequest(panelRange, 1);
    });
});
