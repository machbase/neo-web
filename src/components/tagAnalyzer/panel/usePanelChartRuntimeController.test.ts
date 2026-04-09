import { renderHook, act } from '@testing-library/react';
import { usePanelChartRuntimeController } from './usePanelChartRuntimeController';
import { createTagAnalyzerPanelInfoFixture, createTagAnalyzerTimeRangeFixture } from '../TestData/PanelTestData';
import { loadPanelChartState } from './PanelFetchUtils';
import type { PanelChartHandle } from './TagAnalyzerPanelTypes';

jest.mock('./PanelFetchUtils', () => ({
    loadPanelChartState: jest.fn(),
}));

const loadPanelChartStateMock = jest.mocked(loadPanelChartState);

describe('usePanelChartRuntimeController', () => {
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
            } satisfies PanelChartHandle,
        };

        const { result } = renderHook(() =>
            usePanelChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: sChartRef,
                rollupTableList: [],
                isRaw: false,
                onPanelRangeApplied: sOnPanelRangeApplied,
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
                trigger: 'dataZoom',
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

    it('loads chart data for the navigator range when the overview window changes', async () => {
        // Confirms the loaded chart data follows the slider overview range instead of only the visible panel slice.
        const sNavigatorRange = createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 });
        const sPanelRange = createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 });

        loadPanelChartStateMock.mockResolvedValue({
            chartData: { datasets: [] },
            rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
            overflowRange: null,
        });

        const { result } = renderHook(() =>
            usePanelChartRuntimeController({
                panelInfo: createTagAnalyzerPanelInfoFixture(),
                areaChartRef: { current: { clientWidth: 800 } as HTMLDivElement },
                chartRef: { current: null },
                rollupTableList: [],
                isRaw: false,
            }),
        );

        await act(async () => {
            await result.current.applyLoadedRanges(sPanelRange, sNavigatorRange);
        });

        expect(loadPanelChartStateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                timeRange: sNavigatorRange,
            }),
        );
        expect(result.current.navigateState.navigatorRange).toEqual(sNavigatorRange);
        expect(result.current.navigateState.panelRange).toEqual(sPanelRange);
    });
});
