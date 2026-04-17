import { act, render, waitFor } from '@testing-library/react';
import {
    createMockChartInstance,
    createPanelChartPropsFixture,
    MockChartInstance,
    MockReactEChartsProps,
} from '../TestData/PanelChartTestData';
import PanelChart from './PanelChart';

// The zoom handler reads back the live option tree because ECharts events can omit absolute range values.
const mockInstance: MockChartInstance = createMockChartInstance();

let sLatestChartProps: MockReactEChartsProps | undefined;

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return React.forwardRef((props: MockReactEChartsProps, ref) => {
        sLatestChartProps = props;
        const { onChartReady } = props;

        React.useImperativeHandle(
            ref,
            () => ({
                getEchartsInstance: () => mockInstance,
            }),
            [],
        );

        React.useEffect(() => {
            onChartReady?.(mockInstance);
        }, [onChartReady]);

        return <div data-testid="mock-echart" />;
    });
});

jest.mock('./PanelChartOptions', () => ({
    buildPanelChartOption: jest.fn((aChartData, aNavigatorRange) => ({
        optionKey: `${aNavigatorRange.startTime}-${aNavigatorRange.endTime}-${aChartData?.length ?? 0}`,
    })),
    buildPanelChartSeriesOption: jest.fn(
        (_aChartData, _aDisplay, _aAxes, _aNavigatorChartData, aHoveredLegendSeries) => ({
            series: [{ id: `hover-${aHoveredLegendSeries ?? 'none'}` }],
        }),
    ),
    buildDefaultVisibleSeriesMap: jest.fn(() => ({ 'temp(avg)': true })),
    buildVisibleSeriesList: jest.fn(() => [{ name: 'temp(avg)', visible: true }]),
    extractBrushRange: jest.fn((aParams) => {
        const sRange = aParams?.areas?.[0]?.coordRange ?? aParams?.batch?.[0]?.areas?.[0]?.range;
        if (!sRange) return undefined;

        return {
            startTime: Math.floor(Number(sRange[0])),
            endTime: Math.ceil(Number(sRange[1])),
        };
    }),
    extractDataZoomRange: jest.fn(() => ({ startTime: 100, endTime: 200 })),
}));

const getBuildPanelChartOptionMock = (): jest.Mock =>
    (jest.requireMock('./PanelChartOptions') as { buildPanelChartOption: jest.Mock })
        .buildPanelChartOption;

const getBuildPanelChartSeriesOptionMock = (): jest.Mock =>
    (jest.requireMock('./PanelChartOptions') as { buildPanelChartSeriesOption: jest.Mock })
        .buildPanelChartSeriesOption;

const getExtractDataZoomRangeMock = (): jest.Mock =>
    (jest.requireMock('./PanelChartOptions') as { extractDataZoomRange: jest.Mock })
        .extractDataZoomRange;

describe('PanelChart', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestChartProps = undefined;
    });

    it('re-applies the brush cursor after an option-changing rerender while drag zoom is enabled', async () => {
        // Confirms brush mode survives option replacement when the chart rerenders.
        const { rerender } = render(<PanelChart {...createPanelChartPropsFixture(undefined)} />);

        await waitFor(() => {
            expect(mockInstance.dispatchAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'takeGlobalCursor',
                    key: 'brush',
                }),
            );
        });

        const initialBrushActionCount = mockInstance.dispatchAction.mock.calls.filter(
            ([aAction]) => aAction?.type === 'takeGlobalCursor' && aAction?.key === 'brush',
        ).length;

        // Changing the option simulates the `notMerge` rerender that can drop the global brush cursor.
        rerender(
            <PanelChart {...createPanelChartPropsFixture({ startTime: 150, endTime: 250 })} />,
        );

        await waitFor(() => {
            const nextBrushActionCount = mockInstance.dispatchAction.mock.calls.filter(
                ([aAction]) => aAction?.type === 'takeGlobalCursor' && aAction?.key === 'brush',
            ).length;

            expect(nextBrushActionCount).toBeGreaterThan(initialBrushActionCount);
        });
    });

    it('does not zoom while the drag brush is still in progress and only commits on brush end', () => {
        // Confirms the zoom commit waits for mouse release instead of a debounced mid-drag update.
        const sProps = createPanelChartPropsFixture(undefined);
        render(<PanelChart {...sProps} />);

        sLatestChartProps?.onEvents.brushSelected?.({
            areas: [
                {
                    coordRange: [120, 180],
                },
            ],
        });

        expect(sProps.pChartHandlers.onSetExtremes).not.toHaveBeenCalled();

        sLatestChartProps?.onEvents.brushEnd?.({
            areas: [
                {
                    coordRange: [120, 180],
                },
            ],
        });

        expect(sProps.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
            min: 120,
            max: 180,
            trigger: 'brushZoom',
        });
    });

    it('syncs external panel-range changes through the chart instance without rebuilding the option', async () => {
        // Confirms parent-driven range updates stay imperative once the structural option is already stable.
        const sProps = createPanelChartPropsFixture(undefined);
        const { rerender } = render(<PanelChart {...sProps} />);
        const sBuildPanelChartOptionMock = getBuildPanelChartOptionMock();
        let sInitialOptionBuildCount = 0;

        await waitFor(() => {
            expect(sBuildPanelChartOptionMock.mock.calls.length).toBeGreaterThan(0);
        });
        sInitialOptionBuildCount = sBuildPanelChartOptionMock.mock.calls.length;

        const sInitialZoomActionCount = mockInstance.dispatchAction.mock.calls.filter(
            ([aAction]) => aAction?.type === 'dataZoom',
        ).length;

        mockInstance.getOption.mockReturnValue({
            dataZoom: [
                {
                    startValue: 100,
                    endValue: 200,
                },
            ],
        });

        rerender(
            <PanelChart
                {...sProps}
                pNavigateState={{
                    ...sProps.pNavigateState,
                    panelRange: { startTime: 150, endTime: 250 },
                }}
            />,
        );

        await waitFor(() => {
            const sNextZoomActionCount = mockInstance.dispatchAction.mock.calls.filter(
                ([aAction]) => aAction?.type === 'dataZoom',
            ).length;

            expect(sNextZoomActionCount).toBeGreaterThan(sInitialZoomActionCount);
        });

        expect(sBuildPanelChartOptionMock).toHaveBeenCalledTimes(sInitialOptionBuildCount);
        expect(mockInstance.dispatchAction).toHaveBeenCalledWith({
            type: 'dataZoom',
            startValue: 150,
            endValue: 250,
        });
    });

    it('does not rebuild the option when parent rerenders with equal-value chart config objects', async () => {
        // Confirms board-level persistence rerenders do not reset the chart to the full navigator range mid-drag.
        const sProps = createPanelChartPropsFixture(undefined);
        const sBuildPanelChartOptionMock = getBuildPanelChartOptionMock();
        const { rerender } = render(<PanelChart {...sProps} />);

        await waitFor(() => {
            expect(sBuildPanelChartOptionMock.mock.calls.length).toBeGreaterThan(0);
        });

        const sInitialOptionBuildCount = sBuildPanelChartOptionMock.mock.calls.length;

        rerender(
            <PanelChart
                {...sProps}
                pChartState={{
                    ...sProps.pChartState,
                    axes: { ...sProps.pChartState.axes },
                    display: { ...sProps.pChartState.display },
                }}
                pNavigateState={{
                    ...sProps.pNavigateState,
                    panelRange: { startTime: 150, endTime: 250 },
                }}
            />,
        );

        expect(sBuildPanelChartOptionMock).toHaveBeenCalledTimes(sInitialOptionBuildCount);
        expect(mockInstance.dispatchAction).toHaveBeenCalledWith({
            type: 'dataZoom',
            startValue: 150,
            endValue: 250,
        });
    });

    it('applies legend hover styling imperatively without rebuilding the structural chart option', async () => {
        // Confirms legend hover updates series styling in place instead of forcing a full option rebuild.
        render(<PanelChart {...createPanelChartPropsFixture(undefined)} />);

        const sBuildPanelChartOptionMock = getBuildPanelChartOptionMock();
        const sBuildPanelChartSeriesOptionMock = getBuildPanelChartSeriesOptionMock();
        await waitFor(() => {
            expect(sBuildPanelChartOptionMock.mock.calls.length).toBeGreaterThan(0);
        });

        const sInitialOptionBuildCount = sBuildPanelChartOptionMock.mock.calls.length;

        act(() => {
            sLatestChartProps?.onEvents.highlight?.({
                seriesName: 'temp(avg)',
            });
        });

        expect(sBuildPanelChartOptionMock).toHaveBeenCalledTimes(sInitialOptionBuildCount);
        expect(sBuildPanelChartSeriesOptionMock).not.toHaveBeenCalled();
        expect(mockInstance.setOption).not.toHaveBeenCalled();

        act(() => {
            sLatestChartProps?.onEvents.highlight?.({
                seriesName: 'temp(avg)',
                excludeSeriesId: [],
            });
        });

        await waitFor(() => {
            expect(sBuildPanelChartSeriesOptionMock.mock.calls.at(-1)?.[4]).toBe('temp(avg)');
        });
        expect(sBuildPanelChartOptionMock).toHaveBeenCalledTimes(sInitialOptionBuildCount);
        expect(mockInstance.setOption).toHaveBeenLastCalledWith(
            { series: [{ id: 'hover-temp(avg)' }] },
            { lazyUpdate: true },
        );

        act(() => {
            sLatestChartProps?.onEvents.downplay?.({
                seriesName: 'temp(avg)',
                excludeSeriesId: [],
            });
        });

        await waitFor(() => {
            expect(sBuildPanelChartSeriesOptionMock.mock.calls.at(-1)?.[4]).toBeUndefined();
        });
        expect(sBuildPanelChartOptionMock).toHaveBeenCalledTimes(sInitialOptionBuildCount);
        expect(mockInstance.setOption).toHaveBeenLastCalledWith(
            { series: [{ id: 'hover-none' }] },
            { lazyUpdate: true },
        );
    });

    it('prefers the live drag payload over stale absolute zoom state while moving the slider window', () => {
        // Confirms slider drag events stay attached to the cursor instead of reusing stale absolute values from getOption.
        const sProps = createPanelChartPropsFixture(undefined);
        const sExtractDataZoomRangeMock = getExtractDataZoomRangeMock();

        sExtractDataZoomRangeMock.mockImplementation((aPayload) => {
            const sZoomData = aPayload?.batch?.[0] ?? aPayload;

            if (typeof sZoomData?.start === 'number' && typeof sZoomData?.end === 'number') {
                return { startTime: 350, endTime: 450 };
            }

            return { startTime: 100, endTime: 200 };
        });

        mockInstance.getOption.mockReturnValue({
            dataZoom: [
                {
                    startValue: 100,
                    endValue: 200,
                },
            ],
        });

        render(<PanelChart {...sProps} />);

        sLatestChartProps?.onEvents.datazoom?.({
            start: 35,
            end: 45,
        });

        expect(sProps.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
            min: 350,
            max: 450,
            trigger: 'navigator',
        });
    });
});
