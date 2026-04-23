import { act, render, waitFor } from '@testing-library/react';
import {
    createMockChartInstance,
    createPanelChartPropsFixture,
    MockChartInstance,
    MockReactEChartsProps,
} from '../TestData/PanelChartTestData';
import TimeSeriesChart from './TimeSeriesChart';

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

jest.mock('./options/ChartOptionBuilder', () => ({
    buildChartOption: jest.fn((aChartData, aNavigatorRange) => ({
        optionKey: `${aNavigatorRange.startTime}-${aNavigatorRange.endTime}-${aChartData?.length ?? 0}`,
    })),
}));

jest.mock('./options/ChartSeriesOptionBuilder', () => ({
    buildChartSeriesOption: jest.fn(
        (_aChartData, _aDisplay, _aAxes, _aNavigatorChartData, aHoveredLegendSeries) => ({
            series: [{ id: `hover-${aHoveredLegendSeries ?? 'none'}` }],
        }),
    ),
}));

jest.mock('./options/ChartLegendVisibility', () => ({
    buildDefaultVisibleSeriesMap: jest.fn(() => ({ 'temp(avg)': true })),
    buildVisibleSeriesList: jest.fn(() => [{ name: 'temp(avg)', visible: true }]),
}));

jest.mock('./options/ChartInteractionUtils', () => ({
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

/**
 * Returns the mocked panel chart option builder.
 * Intent: Let the chart tests inspect option rebuild behavior without reaching into the module cache manually.
 * @returns The mocked `buildChartOption` function.
 */
const getBuildChartOptionMock = (): jest.Mock =>
    (jest.requireMock('./options/ChartOptionBuilder') as {
        buildChartOption: jest.Mock;
    })
        .buildChartOption;

/**
 * Returns the mocked panel chart series option builder.
 * Intent: Let the chart tests assert hover patch behavior through the mock.
 * @returns The mocked `buildChartSeriesOption` function.
 */
const getBuildChartSeriesOptionMock = (): jest.Mock =>
    (jest.requireMock('./options/ChartSeriesOptionBuilder') as {
        buildChartSeriesOption: jest.Mock;
    })
        .buildChartSeriesOption;

/**
 * Returns the mocked zoom-range extractor.
 * Intent: Let the chart tests control navigator zoom reconstruction deterministically.
 * @returns The mocked `extractDataZoomRange` function.
 */
const getExtractDataZoomRangeMock = (): jest.Mock =>
    (jest.requireMock('./options/ChartInteractionUtils') as {
        extractDataZoomRange: jest.Mock;
    })
        .extractDataZoomRange;

describe('TimeSeriesChart', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestChartProps = undefined;
    });

    it('re-applies the brush cursor after an option-changing rerender while drag zoom is enabled', async () => {
        // Confirms brush mode survives option replacement when the chart rerenders.
        const { rerender } = render(<TimeSeriesChart {...createPanelChartPropsFixture(undefined)} />);

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
            <TimeSeriesChart {...createPanelChartPropsFixture({ startTime: 150, endTime: 250 })} />,
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
        render(<TimeSeriesChart {...sProps} />);

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

    it('routes brush selections to the selection handler while highlight mode is active', () => {
        // Confirms highlight mode reuses brush selection instead of converting the drag into chart zoom.
        const sProps = createPanelChartPropsFixture(undefined);
        render(
            <TimeSeriesChart
                {...sProps}
                pPanelState={{
                    ...sProps.pPanelState,
                    isHighlightActive: true,
                }}
            />,
        );

        sLatestChartProps?.onEvents.brushEnd?.({
            areas: [
                {
                    coordRange: [120, 180],
                },
            ],
        });

        expect(sProps.pChartHandlers.onSelection).toHaveBeenCalledWith({
            min: 120,
            max: 180,
            trigger: undefined,
        });
        expect(sProps.pChartHandlers.onSetExtremes).not.toHaveBeenCalled();
    });

    it('exposes highlight hit testing through the chart handle', async () => {
        // Confirms the outer chart wrapper can ask the chart which saved highlight was clicked.
        const sProps = createPanelChartPropsFixture(undefined);
        sProps.pChartState.highlights = [
            {
                text: 'unnamed',
                timeRange: {
                    startTime: 100,
                    endTime: 200,
                },
            },
        ];

        render(<TimeSeriesChart {...sProps} />);

        await waitFor(() => {
            expect(sProps.pChartRefs.chartWrap.current).not.toBeNull();
        });

        const sAreaChartElement = document.createElement('div');
        Object.defineProperty(sAreaChartElement, 'getBoundingClientRect', {
            value: () => ({
                left: 100,
                top: 50,
                right: 700,
                bottom: 350,
                width: 600,
                height: 300,
                x: 100,
                y: 50,
                toJSON: () => undefined,
            }),
        });
        sProps.pChartRefs.areaChart.current = sAreaChartElement;
        mockInstance.containPixel.mockReturnValue(true);
        mockInstance.convertFromPixel.mockReturnValue([150, 0]);

        expect(
            sProps.pChartRefs.chartWrap.current?.getHighlightIndexAtClientPosition(320, 240),
        ).toBe(0);
    });

    it('syncs external panel-range changes through the chart instance without rebuilding the option', async () => {
        // Confirms parent-driven range updates stay imperative once the structural option is already stable.
        const sProps = createPanelChartPropsFixture(undefined);
        const { rerender } = render(<TimeSeriesChart {...sProps} />);
        const sBuildPanelChartOptionMock = getBuildChartOptionMock();
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
            <TimeSeriesChart
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
        const sBuildPanelChartOptionMock = getBuildChartOptionMock();
        const { rerender } = render(<TimeSeriesChart {...sProps} />);

        await waitFor(() => {
            expect(sBuildPanelChartOptionMock.mock.calls.length).toBeGreaterThan(0);
        });

        const sInitialOptionBuildCount = sBuildPanelChartOptionMock.mock.calls.length;

        rerender(
            <TimeSeriesChart
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
        render(<TimeSeriesChart {...createPanelChartPropsFixture(undefined)} />);

        const sBuildPanelChartOptionMock = getBuildChartOptionMock();
        const sBuildPanelChartSeriesOptionMock = getBuildChartSeriesOptionMock();
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

        render(<TimeSeriesChart {...sProps} />);

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

