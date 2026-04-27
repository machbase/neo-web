import { renderHook, act } from '@testing-library/react';
import { useChartRuntimeController } from './useChartRuntimeController';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import type { PanelChartHandle } from '../utils/panelRuntimeTypes';
import { loadPanelChartState } from '../utils/fetch/PanelChartStateLoader';

jest.mock('../utils/fetch/PanelChartStateLoader', () => ({
    loadPanelChartState: jest.fn(),
}));

const loadPanelChartStateMock = jest.mocked(loadPanelChartState);
const EMPTY_BOARD_TIME = { kind: 'empty' as const };

describe('useChartRuntimeController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('treats slider drags inside the current navigator range as local view changes', async () => {
        // Confirms normal slider movement does not trigger a new panel fetch on every drag step.
        const sOnPanelRangeApplied = jest.fn();
        const sChartRef = {
            current: {
                setPanelRange: jest.fn(),
                getVisibleSeries: jest.fn(() => []),
                getHighlightIndexAtClientPosition: jest.fn(() => undefined),
            } satisfies PanelChartHandle,
        };

        const { result } = renderHook(() =>
            useChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: sChartRef,
                rollupTableList: [],
                isRaw: false,
                onPanelRangeApplied: sOnPanelRangeApplied,
                boardTime: EMPTY_BOARD_TIME,
            }),
        );

        act(() => {
            result.current.updateNavigateState({
                panelRange: createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                navigatorRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 }),
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
        expect(sOnPanelRangeApplied).toHaveBeenCalledTimes(1);
        expect(sOnPanelRangeApplied).toHaveBeenCalledWith(
            {
                startTime: 350,
                endTime: 450,
            },
            expect.objectContaining({
                navigatorRange: { startTime: 0, endTime: 1000 },
                isRaw: false,
            }),
        );
        expect(loadPanelChartStateMock).not.toHaveBeenCalled();
    });

    it('refetches data when the visible range width changes (zoom)', async () => {
        // When the panel range width changes without an explicit navigator update,
        // the controller refetches at the new resolution while keeping the navigator size.
        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            overflowRange: undefined,
        });

        const sOnPanelRangeApplied = jest.fn();
        const { result } = renderHook(() =>
            useChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: { current: null },
                rollupTableList: [],
                isRaw: false,
                boardTime: EMPTY_BOARD_TIME,
                onPanelRangeApplied: sOnPanelRangeApplied,
            }),
        );

        // Set up initial state with a broad navigator and panel range.
        act(() => {
            result.current.updateNavigateState({
                panelRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 }),
                navigatorRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 }),
            });
        });

        // Simulate a zoom-in: panel range width shrinks from 1000 to 500.
        await act(async () => {
            await result.current.handlePanelRangeChange({
                min: 250,
                max: 750,
                trigger: 'navigator',
            });
        });

        // Should have refetched with the narrower panel range as the data range.
        expect(loadPanelChartStateMock).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            EMPTY_BOARD_TIME,
            800,
            false,
            { startTime: 250, endTime: 750 },
            [],
        );
        // Navigator should stay at its original width ??only the data range narrows.
        expect(result.current.navigateState.navigatorRange).toEqual({
            startTime: 0,
            endTime: 1000,
        });
    });

    it('refetches when panning outside the loaded data range after a zoom', async () => {
        // After zoom scopes data to a narrow window, panning past its edges triggers a refetch.
        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            overflowRange: undefined,
        });

        const { result } = renderHook(() =>
            useChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: { current: null },
                rollupTableList: [],
                isRaw: false,
                boardTime: EMPTY_BOARD_TIME,
                onPanelRangeApplied: undefined,
            }),
        );

        // Load initial data for a known range (0-2000).
        await act(async () => {
            await result.current.applyLoadedRanges(
                createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 2000 }),
                createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 2000 }),
            );
        });

        expect(loadPanelChartStateMock).toHaveBeenCalledTimes(1);

        // Zoom in: width 2000 ??500 ??triggers refetch ??loaded data now = 250-750.
        await act(async () => {
            await result.current.handlePanelRangeChange({
                min: 250,
                max: 750,
                trigger: 'navigator',
            });
        });

        expect(loadPanelChartStateMock).toHaveBeenCalledTimes(2);

        // Pan same width (500) but past loaded edge (750) ??SHOULD refetch.
        await act(async () => {
            await result.current.handlePanelRangeChange({
                min: 600,
                max: 1100,
                trigger: 'navigator',
            });
        });

        expect(loadPanelChartStateMock).toHaveBeenCalledTimes(3);
        expect(loadPanelChartStateMock).toHaveBeenLastCalledWith(
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            EMPTY_BOARD_TIME,
            800,
            false,
            { startTime: 600, endTime: 1100 },
            [],
        );
    });

    it('loads chart data for the navigator range when the overview window changes', async () => {
        // Confirms the loaded chart data follows the slider overview range instead of only the visible panel slice.
        const sNavigatorRange = createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 });
        const sPanelRange = createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 });

        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
            overflowRange: undefined,
        });

        const { result } = renderHook(() =>
            useChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: { current: null },
                rollupTableList: [],
                isRaw: false,
                boardTime: EMPTY_BOARD_TIME,
                onPanelRangeApplied: undefined,
            }),
        );

        await act(async () => {
            await result.current.applyLoadedRanges(sPanelRange, sNavigatorRange);
        });

        expect(loadPanelChartStateMock).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            EMPTY_BOARD_TIME,
            800,
            false,
            sNavigatorRange,
            [],
        );
        expect(result.current.navigateState.navigatorRange).toEqual(sNavigatorRange);
        expect(result.current.navigateState.panelRange).toEqual(sPanelRange);
    });

    it('keeps the last resolved interval when a later refresh returns the empty interval sentinel', async () => {
        // Confirms refresh flows do not replace a real interval with the loader's empty placeholder.
        loadPanelChartStateMock
            .mockResolvedValueOnce({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
                overflowRange: undefined,
            })
            .mockResolvedValueOnce({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: '', IntervalValue: 0 },
                overflowRange: undefined,
            });

        const { result } = renderHook(() =>
            useChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: { current: null },
                rollupTableList: [],
                isRaw: false,
                boardTime: EMPTY_BOARD_TIME,
                onPanelRangeApplied: undefined,
            }),
        );

        await act(async () => {
            await result.current.applyLoadedRanges(
                createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
            );
        });

        expect(result.current.navigateState.rangeOption).toEqual({
            IntervalType: 'sec',
            IntervalValue: 5,
        });

        await act(async () => {
            result.current.setExtremes(
                createTagAnalyzerTimeRangeFixture({ startTime: 300, endTime: 400 }),
                createTagAnalyzerTimeRangeFixture({ startTime: 300, endTime: 400 }),
            );
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.navigateState.rangeOption).toEqual({
            IntervalType: 'sec',
            IntervalValue: 5,
        });
    });

    it('falls back to chart width 1 when the chart container is missing', async () => {
        // Confirms missing layout measurements are normalized before reaching the loader.
        const sPanelRange = createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 });

        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
            overflowRange: undefined,
        });

        const { result } = renderHook(() =>
            useChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(undefined),
                areaChartRef: { current: null },
                chartRef: { current: null },
                rollupTableList: [],
                isRaw: false,
                boardTime: EMPTY_BOARD_TIME,
                onPanelRangeApplied: undefined,
            }),
        );

        await act(async () => {
            await result.current.applyLoadedRanges(sPanelRange);
        });

        expect(loadPanelChartStateMock).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            EMPTY_BOARD_TIME,
            1,
            false,
            sPanelRange,
            [],
        );
    });
});

