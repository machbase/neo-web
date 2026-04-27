import { act, render, waitFor } from '@testing-library/react';
import {
    createMockChartInstance,
    createPanelChartPropsFixture,
    MockChartInstance,
    MockReactEChartsProps,
} from '../TestData/PanelChartTestData';
import PanelChartRenderer from './PanelChartRenderer';

const mockInstance: MockChartInstance = createMockChartInstance();
let latestChartProps: MockReactEChartsProps | undefined;

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.forwardRef((props: MockReactEChartsProps, ref) => {
        latestChartProps = props;
        React.useImperativeHandle(ref, () => ({ getEchartsInstance: () => mockInstance }), []);
        React.useEffect(() => void props.onChartReady?.(mockInstance), [props.onChartReady]);
        return <div data-testid="mock-echart" />;
    });
});

jest.mock('./options/ChartOptionBuilder', () => ({
    buildChartOption: jest.fn((chartData, _seriesList, navigatorRange) => ({
        optionKey: `${navigatorRange.startTime}-${navigatorRange.endTime}-${chartData?.length ?? 0}`,
    })),
    buildPanelChartSeriesLayers: jest.fn(
        ({ chartData, display, navigatorChartData, hoveredLegendSeries, highlights }) => ({
            yAxisOption: [{ min: 0, max: 100 }],
            highlightOverlaySeries: highlights ?? [],
            highlightLabelSeries: [],
            annotationGuideLineSeries: [],
            annotationLabelSeries: [],
            mainSeries: chartData.map((series: { name: string }, seriesIndex: number) => ({
                id: `main-series-${seriesIndex}`,
                name: series.name,
                lineStyle: {
                    width: hoveredLegendSeries === series.name ? display.stroke + 1 : display.stroke,
                    opacity: hoveredLegendSeries && hoveredLegendSeries !== series.name ? 0.18 : 1,
                },
                areaStyle: {
                    opacity: hoveredLegendSeries && hoveredLegendSeries !== series.name ? 0.05 : 0,
                },
            })),
            navigatorSeries: (navigatorChartData ?? chartData).map((series: { name: string }, seriesIndex: number) => ({
                id: `navigator-series-${seriesIndex}`,
                name: series.name,
                lineStyle: {
                    opacity: hoveredLegendSeries && hoveredLegendSeries !== series.name ? 0.14 : 0.85,
                },
            })),
        }),
    ),
    buildChartSeriesOption: jest.fn((_, __, ___, ____, mainSeries) => ({ series: mainSeries })),
}));

jest.mock('./options/ChartLegendVisibility', () => ({
    buildDefaultVisibleSeriesMap: jest.fn(() => ({ 'temp(avg)': true })),
    buildVisibleSeriesList: jest.fn(() => [{ name: 'temp(avg)', visible: true }]),
}));

jest.mock('./ChartDataZoomUtils', () => ({
    hasExplicitDataZoomEventRange: jest.fn((params) => {
        const zoomData = params?.batch?.[0] ?? params;
        return (zoomData?.startValue !== undefined && zoomData?.endValue !== undefined) || (zoomData?.start !== undefined && zoomData?.end !== undefined);
    }),
    hasExplicitDataZoomOptionRange: jest.fn(
        (params) => (params?.startValue !== undefined && params?.endValue !== undefined) || (params?.start !== undefined && params?.end !== undefined),
    ),
    extractBrushRange: jest.fn((params) => {
        const range = params?.areas?.[0]?.coordRange ?? params?.batch?.[0]?.areas?.[0]?.range;
        return range
            ? {
                  startTime: Math.floor(Number(range[0])),
                  endTime: Math.ceil(Number(range[1])),
              }
            : undefined;
    }),
    extractDataZoomEventRange: jest.fn(() => ({ startTime: 100, endTime: 200 })),
    extractDataZoomOptionRange: jest.fn(() => ({ startTime: 100, endTime: 200 })),
}));

const chartOptionModule = jest.requireMock('./options/ChartOptionBuilder') as {
    buildChartOption: jest.Mock;
    buildChartSeriesOption: jest.Mock;
};
const chartZoomModule = jest.requireMock('./ChartDataZoomUtils') as {
    extractDataZoomEventRange: jest.Mock;
};

type PanelChartRendererProps = Parameters<typeof PanelChartRenderer>[0];
type ChartHandlerKey = 'onSelection' | 'onSetExtremes';
const NEXT_PANEL_RANGE = { startTime: 150, endTime: 250 };
const BRUSH_RANGE_PAYLOAD = { areas: [{ coordRange: [120, 180] }] };

function createPanelChartRendererProps(
    overrides: Partial<PanelChartRendererProps> = {},
): PanelChartRendererProps {
    const props = createPanelChartPropsFixture(undefined);

    return {
        ...props,
        ...overrides,
        pChartState: { ...props.pChartState, ...overrides.pChartState },
        pPanelState: { ...props.pPanelState, ...overrides.pPanelState },
        pNavigateState: { ...props.pNavigateState, ...overrides.pNavigateState },
    };
}

function updatePanelChartRendererProps(
    props: PanelChartRendererProps,
    overrides: Partial<PanelChartRendererProps> = {},
): PanelChartRendererProps {
    return {
        ...props,
        ...overrides,
        pChartState: { ...props.pChartState, ...overrides.pChartState },
        pPanelState: { ...props.pPanelState, ...overrides.pPanelState },
        pNavigateState: { ...props.pNavigateState, ...overrides.pNavigateState },
    };
}

function renderPanelChartRenderer(overrides: Partial<PanelChartRendererProps> = {}) {
    const props = createPanelChartRendererProps(overrides);
    const view = render(<PanelChartRenderer {...props} />);
    return {
        ...view,
        props,
        rerenderWith: (nextOverrides: Partial<PanelChartRendererProps>) =>
            view.rerender(
                <PanelChartRenderer
                    {...updatePanelChartRendererProps(props, nextOverrides)}
                />,
            ),
    };
}

function emitChartEvent(eventName: string, payload: unknown) {
    act(() => {
        (latestChartProps?.onEvents as Record<string, ((value: unknown) => void) | undefined>)?.[
            eventName
        ]?.(payload);
    });
}

function getDispatchActionCount(type: string, key?: string) {
    return mockInstance.dispatchAction.mock.calls.filter(
        ([action]) => action?.type === type && (key === undefined || action?.key === key),
    ).length;
}

async function waitForChartOptionBuild() {
    await waitFor(() => {
        expect(chartOptionModule.buildChartOption).toHaveBeenCalled();
    });
}

function expectDataZoomDispatch(range: typeof NEXT_PANEL_RANGE) {
    expect(mockInstance.dispatchAction).toHaveBeenCalledWith({
        type: 'dataZoom',
        startValue: range.startTime,
        endValue: range.endTime,
    });
}

describe('PanelChartRenderer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        latestChartProps = undefined;
        chartZoomModule.extractDataZoomEventRange.mockReturnValue({
            startTime: 100,
            endTime: 200,
        });
    });

    it('re-applies the brush cursor after an option-changing rerender while drag zoom is enabled', async () => {
        const { rerenderWith } = renderPanelChartRenderer();

        await waitFor(() => {
            expect(mockInstance.dispatchAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'takeGlobalCursor',
                    key: 'brush',
                }),
            );
        });

        const initialBrushActionCount = getDispatchActionCount('takeGlobalCursor', 'brush');

        rerenderWith({ pNavigateState: { panelRange: NEXT_PANEL_RANGE } });

        await waitFor(() => {
            expect(getDispatchActionCount('takeGlobalCursor', 'brush')).toBeGreaterThan(
                initialBrushActionCount,
            );
        });
    });

    it.each([
        [
            'does not zoom while the drag brush is still in progress and only commits on brush end',
            {},
            'onSetExtremes',
            { min: 120, max: 180, trigger: 'brushZoom' },
        ],
        [
            'routes brush selections to the selection handler while highlight mode is active',
            { pPanelState: { isHighlightActive: true } },
            'onSelection',
            { min: 120, max: 180, trigger: undefined },
        ],
    ])('%s', (_name, overrides, expectedHandler: ChartHandlerKey, expectedPayload) => {
        const { props } = renderPanelChartRenderer(overrides);

        emitChartEvent('brushSelected', BRUSH_RANGE_PAYLOAD);
        expect(props.pChartHandlers.onSetExtremes).not.toHaveBeenCalled();

        emitChartEvent('brushEnd', BRUSH_RANGE_PAYLOAD);

        expect(props.pChartHandlers[expectedHandler]).toHaveBeenCalledWith(expectedPayload);
        if (expectedHandler === 'onSelection') {
            expect(props.pChartHandlers.onSetExtremes).not.toHaveBeenCalled();
        }
    });

    it('exposes highlight hit testing through the chart handle', async () => {
        const { props } = renderPanelChartRenderer();
        props.pChartState.highlights = [
            {
                text: 'unnamed',
                timeRange: { startTime: 100, endTime: 200 },
            },
        ];

        await waitFor(() => {
            expect(props.pChartRefs.chartWrap.current).not.toBeNull();
        });

        const areaChartElement = document.createElement('div');
        Object.defineProperty(areaChartElement, 'getBoundingClientRect', {
            value: () => ({ left: 100, top: 50, right: 700, bottom: 350, width: 600, height: 300, x: 100, y: 50, toJSON: () => undefined }),
        });
        props.pChartRefs.areaChart.current = areaChartElement;
        mockInstance.containPixel.mockReturnValue(true);
        mockInstance.convertFromPixel.mockReturnValue([150, 0]);
        expect(props.pChartRefs.chartWrap.current?.getHighlightIndexAtClientPosition(320, 240)).toBe(0);
    });

    it.each([
        [
            'does not create an annotation when the main series is clicked',
            {
                seriesName: 'temp(avg)',
                event: { event: { clientX: 210, clientY: 120 } },
            },
            undefined,
        ],
        [
            'opens the annotation editor when an annotation label is clicked',
            {
                data: { annotationIndex: 2, seriesIndex: 0 },
                event: { event: { clientX: 260, clientY: 140 } },
            },
            { seriesIndex: 0, annotationIndex: 2, position: { x: 260, y: 140 } },
        ],
    ])('%s', (_name, payload, expectedCall) => {
        const { props } = renderPanelChartRenderer();
        emitChartEvent('click', payload);
        expectedCall
            ? expect(props.pChartHandlers.onOpenSeriesAnnotationEditor).toHaveBeenCalledWith(expectedCall)
            : expect(props.pChartHandlers.onOpenSeriesAnnotationEditor).not.toHaveBeenCalled();
    });

    it.each([
        [
            'syncs external panel-range changes through the chart instance without rebuilding the option',
            () => ({}),
            true,
        ],
        [
            'does not rebuild the option when parent rerenders with equal-value chart config objects',
            (props: PanelChartRendererProps) => ({
                pChartState: {
                    axes: { ...props.pChartState.axes },
                    display: { ...props.pChartState.display },
                },
            }),
            false,
        ],
    ])('%s', async (_name, buildOverrides, waitForZoomAction) => {
        const { props, rerenderWith } = renderPanelChartRenderer();
        await waitForChartOptionBuild();

        const initialOptionBuildCount = chartOptionModule.buildChartOption.mock.calls.length;
        const initialZoomActionCount = getDispatchActionCount('dataZoom');
        mockInstance.getOption.mockReturnValue({ dataZoom: [{ startValue: 100, endValue: 200 }] });
        rerenderWith({ ...buildOverrides(props), pNavigateState: { panelRange: NEXT_PANEL_RANGE } });

        if (waitForZoomAction) {
            await waitFor(() => {
                expect(getDispatchActionCount('dataZoom')).toBeGreaterThan(initialZoomActionCount);
            });
        }

        expect(chartOptionModule.buildChartOption).toHaveBeenCalledTimes(initialOptionBuildCount);
        expectDataZoomDispatch(NEXT_PANEL_RANGE);
    });

    it('applies legend hover styling imperatively without rebuilding the structural chart option', async () => {
        const { props } = renderPanelChartRenderer();
        await waitForChartOptionBuild();

        const initialOptionBuildCount = chartOptionModule.buildChartOption.mock.calls.length;

        emitChartEvent('highlight', { seriesName: 'temp(avg)' });
        expect(chartOptionModule.buildChartOption).toHaveBeenCalledTimes(initialOptionBuildCount);
        expect(chartOptionModule.buildChartSeriesOption).not.toHaveBeenCalled();
        expect(mockInstance.setOption).not.toHaveBeenCalled();

        emitChartEvent('highlight', { seriesName: 'temp(avg)', excludeSeriesId: [] });

        await waitFor(() => {
            const mainSeries = chartOptionModule.buildChartSeriesOption.mock.calls.at(-1)?.[4];
            expect(mainSeries[0].lineStyle.width).toBe(props.pChartState.display.stroke + 1);
        });

        expect(chartOptionModule.buildChartOption).toHaveBeenCalledTimes(initialOptionBuildCount);
        expect(mockInstance.setOption).toHaveBeenLastCalledWith(
            {
                series: expect.arrayContaining([
                    expect.objectContaining({ id: 'main-series-0', name: 'temp(avg)' }),
                ]),
            },
            { lazyUpdate: true },
        );

        emitChartEvent('downplay', { seriesName: 'temp(avg)', excludeSeriesId: [] });

        await waitFor(() => {
            const mainSeries = chartOptionModule.buildChartSeriesOption.mock.calls.at(-1)?.[4];
            expect(mainSeries[0].lineStyle.width).toBe(props.pChartState.display.stroke);
        });
    });

    it('prefers the live drag payload over stale absolute zoom state while moving the slider window', () => {
        chartZoomModule.extractDataZoomEventRange.mockImplementation((payload) => {
            const zoomData = payload?.batch?.[0] ?? payload;
            return typeof zoomData?.start === 'number' && typeof zoomData?.end === 'number'
                ? { startTime: 350, endTime: 450 }
                : { startTime: 100, endTime: 200 };
        });

        mockInstance.getOption.mockReturnValue({
            dataZoom: [{ startValue: 100, endValue: 200 }],
        });

        const { props } = renderPanelChartRenderer();
        emitChartEvent('datazoom', { start: 35, end: 45 });

        expect(props.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
            min: 350,
            max: 450,
            trigger: 'navigator',
        });
    });
});
