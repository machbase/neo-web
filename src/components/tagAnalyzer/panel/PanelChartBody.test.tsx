import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerSeriesConfigFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelShiftHandlers,
    PanelState,
} from '../utils/panelRuntimeTypes';
import PanelChartBody from './PanelChartBody';

type MockChartOptionState = {
    dataZoom: Array<{
        startValue: number;
        endValue: number;
    }>;
};

type MockChartInstance = {
    dispatchAction: jest.Mock;
    getOption: jest.Mock<MockChartOptionState>;
    setOption: jest.Mock;
    containPixel: jest.Mock;
    convertFromPixel: jest.Mock;
};

type MockReactEChartsProps = {
    onChartReady: ((instance: MockChartInstance) => void) | undefined;
    onEvents: Record<string, ((event: unknown) => void) | undefined>;
};

const mockChartMouseDown = jest.fn();
const mockInstance: MockChartInstance = {
    dispatchAction: jest.fn(),
    getOption: jest.fn(() => ({
        dataZoom: [
            {
                startValue: 100,
                endValue: 200,
            },
        ],
    })),
    setOption: jest.fn(),
    containPixel: jest.fn(() => true),
    convertFromPixel: jest.fn(() => [150, 0]),
};
let latestChartProps: MockReactEChartsProps | undefined;

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return React.forwardRef((props: MockReactEChartsProps, ref) => {
        latestChartProps = props;
        React.useImperativeHandle(ref, () => ({ getEchartsInstance: () => mockInstance }), []);
        React.useEffect(() => void props.onChartReady?.(mockInstance), [props.onChartReady]);
        return <div data-testid="mock-echart" onMouseDown={mockChartMouseDown} />;
    });
});

jest.mock('../chart/options/ChartOptionBuilder', () => ({
    buildChartOption: jest.fn((chartInfo) => ({
        optionKey: `${chartInfo.navigatorRange.startTime}-${chartInfo.navigatorRange.endTime}-${chartInfo.mainSeriesData?.length ?? 0}`,
    })),
    buildChartSeriesOption: jest.fn((chartInfo) => ({
        series: chartInfo.mainSeriesData.map(
            (series: { name: string }, seriesIndex: number) => ({
                id: `main-series-${seriesIndex}`,
                name: series.name,
                lineStyle: {
                    width:
                        chartInfo.hoveredLegendSeries === series.name
                            ? chartInfo.display.stroke + 1
                            : chartInfo.display.stroke,
                    opacity:
                        chartInfo.hoveredLegendSeries &&
                        chartInfo.hoveredLegendSeries !== series.name
                            ? 0.18
                            : 1,
                },
                areaStyle: {
                    opacity:
                        chartInfo.hoveredLegendSeries &&
                        chartInfo.hoveredLegendSeries !== series.name
                            ? 0.05
                            : 0,
                },
            }),
        ),
    })),
}));

jest.mock('../chart/options/ChartLegendVisibility', () => ({
    buildDefaultVisibleSeriesMap: jest.fn(() => ({ 'temp(avg)': true })),
    buildVisibleSeriesList: jest.fn(() => [{ name: 'temp(avg)', visible: true }]),
}));

jest.mock('../chart/chartInternal/ChartDataZoomUtils', () => ({
    hasExplicitDataZoomEventRange: jest.fn((params) => {
        const sZoomData = params?.batch?.[0] ?? params;
        return (
            (sZoomData?.startValue !== undefined && sZoomData?.endValue !== undefined) ||
            (sZoomData?.start !== undefined && sZoomData?.end !== undefined)
        );
    }),
    hasExplicitDataZoomOptionRange: jest.fn(
        (params) =>
            (params?.startValue !== undefined && params?.endValue !== undefined) ||
            (params?.start !== undefined && params?.end !== undefined),
    ),
    extractBrushRange: jest.fn((params) => {
        const sRange = params?.areas?.[0]?.coordRange ?? params?.batch?.[0]?.areas?.[0]?.range;
        return sRange
            ? {
                  startTime: Math.floor(Number(sRange[0])),
                  endTime: Math.ceil(Number(sRange[1])),
              }
            : undefined;
    }),
    extractDataZoomEventRange: jest.fn(() => ({ startTime: 100, endTime: 200 })),
    extractDataZoomOptionRange: jest.fn(() => ({ startTime: 100, endTime: 200 })),
}));

jest.mock('@/design-system/components/Popover', () => ({
    Popover: ({ children }: { children: unknown }) => <div>{children as JSX.Element}</div>,
}));

jest.mock('@/design-system/components', () => {
    const MockButton = ({
        children,
        onClick,
    }: {
        children?: ReactNode;
        onClick?: (() => void) | undefined;
    }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    );

    const MockPage = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    MockPage.DpRow = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    MockPage.ContentDesc = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    MockPage.ContentText = ({ pContent }: { pContent: string | number }) => <div>{pContent}</div>;
    MockPage.Space = () => <div />;

    return {
        Button: MockButton,
        Page: MockPage,
        Toast: { error: jest.fn() },
    };
});

jest.mock('@/assets/icons/Icon', () => ({
    VscChevronLeft: () => <span>left</span>,
    VscChevronRight: () => <span>right</span>,
    Close: () => <span>close</span>,
}));

const chartOptionModule = jest.requireMock('../chart/options/ChartOptionBuilder') as {
    buildChartOption: jest.Mock;
    buildChartSeriesOption: jest.Mock;
};
const chartZoomModule = jest.requireMock('../chart/chartInternal/ChartDataZoomUtils') as {
    extractDataZoomEventRange: jest.Mock;
};

type PanelChartBodyProps = Parameters<typeof PanelChartBody>[0];
type PanelChartBodyOverrides = {
    pChartRefs?: PanelChartBodyProps['pChartRefs'];
    pChartState?: Partial<PanelChartBodyProps['pChartState']>;
    pPanelState?: Partial<PanelChartBodyProps['pPanelState']>;
    pNavigateState?: Partial<PanelChartBodyProps['pNavigateState']>;
    pChartHandlers?: Partial<PanelChartBodyProps['pChartHandlers']>;
    pShiftHandlers?: Partial<PanelChartBodyProps['pShiftHandlers']>;
    pTagSet?: PanelChartBodyProps['pTagSet'];
    pOnDragSelectStateChange?: PanelChartBodyProps['pOnDragSelectStateChange'];
    pOnHighlightSelection?: PanelChartBodyProps['pOnHighlightSelection'];
    pOnSelectionStateChange?: PanelChartBodyProps['pOnSelectionStateChange'];
};

const NEXT_PANEL_RANGE = { startTime: 150, endTime: 250 };
const BRUSH_RANGE_PAYLOAD = { areas: [{ coordRange: [120, 180] }] };

function createChartBodyProps(
    overrides: PanelChartBodyOverrides = {},
): PanelChartBodyProps {
    const chartData = createTagAnalyzerChartSeriesListFixture();
    const props: PanelChartBodyProps = {
        pChartRefs: {
            areaChart: { current: null },
            chartWrap: { current: null },
        } as PanelChartRefs,
        pChartState: {
            axes: createTagAnalyzerPanelAxesFixture(undefined),
            display: createTagAnalyzerPanelDisplayFixture({ use_zoom: true }),
            seriesList: [createTagAnalyzerSeriesConfigFixture(undefined)],
            useNormalize: false,
            highlights: [],
        } as PanelChartState,
        pPanelState: {
            isRaw: false,
            isFFTModal: false,
            isHighlightActive: false,
            isAnnotationActive: false,
            isDragSelectActive: false,
        } as PanelState,
        pNavigateState: {
            chartData: chartData,
            navigatorChartData: chartData,
            panelRange: createTagAnalyzerTimeRangeFixture(undefined),
            navigatorRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 }),
            rangeOption: undefined,
            preOverflowTimeRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 0 }),
        } as PanelNavigateState,
        pChartHandlers: {
            onSetExtremes: jest.fn(),
            onSetNavigatorExtremes: jest.fn(),
            onSelection: jest.fn(),
            onOpenHighlightRename: jest.fn(),
            onOpenSeriesAnnotationEditor: jest.fn(),
        } as PanelChartHandlers,
        pShiftHandlers: {
            onShiftPanelRangeLeft: jest.fn(),
            onShiftPanelRangeRight: jest.fn(),
            onShiftNavigatorRangeLeft: jest.fn(),
            onShiftNavigatorRangeRight: jest.fn(),
        } as PanelShiftHandlers,
        pTagSet: [createTagAnalyzerSeriesConfigFixture(undefined)],
        pOnDragSelectStateChange: jest.fn(),
        pOnHighlightSelection: jest.fn(),
        pOnSelectionStateChange: jest.fn(),
    };

    return {
        ...props,
        ...overrides,
        pChartRefs: overrides.pChartRefs ?? props.pChartRefs,
        pChartState: overrides.pChartState
            ? { ...props.pChartState, ...overrides.pChartState }
            : props.pChartState,
        pPanelState: overrides.pPanelState
            ? { ...props.pPanelState, ...overrides.pPanelState }
            : props.pPanelState,
        pNavigateState: overrides.pNavigateState
            ? { ...props.pNavigateState, ...overrides.pNavigateState }
            : props.pNavigateState,
        pChartHandlers: overrides.pChartHandlers
            ? { ...props.pChartHandlers, ...overrides.pChartHandlers }
            : props.pChartHandlers,
        pShiftHandlers: overrides.pShiftHandlers
            ? { ...props.pShiftHandlers, ...overrides.pShiftHandlers }
            : props.pShiftHandlers,
    };
}

function updateChartBodyProps(
    props: PanelChartBodyProps,
    overrides: PanelChartBodyOverrides = {},
): PanelChartBodyProps {
    return {
        ...props,
        ...overrides,
        pChartRefs: overrides.pChartRefs ?? props.pChartRefs,
        pChartState: overrides.pChartState
            ? { ...props.pChartState, ...overrides.pChartState }
            : props.pChartState,
        pPanelState: overrides.pPanelState
            ? { ...props.pPanelState, ...overrides.pPanelState }
            : props.pPanelState,
        pNavigateState: overrides.pNavigateState
            ? { ...props.pNavigateState, ...overrides.pNavigateState }
            : props.pNavigateState,
        pChartHandlers: overrides.pChartHandlers
            ? { ...props.pChartHandlers, ...overrides.pChartHandlers }
            : props.pChartHandlers,
        pShiftHandlers: overrides.pShiftHandlers
            ? { ...props.pShiftHandlers, ...overrides.pShiftHandlers }
            : props.pShiftHandlers,
    };
}

function renderPanelChartBody(
    overrides: PanelChartBodyOverrides = {},
) {
    const props = createChartBodyProps(overrides);
    const view = render(<PanelChartBody {...props} />);

    return {
        ...view,
        props,
        rerenderWith: (nextOverrides: PanelChartBodyOverrides) =>
            view.rerender(
                <PanelChartBody
                    {...updateChartBodyProps(props, nextOverrides)}
                />,
            ),
    };
}

function emitChartEvent(eventName: string, payload: unknown) {
    act(() => {
        latestChartProps?.onEvents?.[eventName]?.(payload);
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

describe('PanelChartBody', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        latestChartProps = undefined;
        chartZoomModule.extractDataZoomEventRange.mockReturnValue({
            startTime: 100,
            endTime: 200,
        });
    });

    it.each([
        ['blocks right-button mouse down from reaching the chart surface', 2, 0],
        ['still lets ordinary left-button mouse down reach the chart surface', 0, 1],
    ])('%s', (_name, button, expectedCallCount) => {
        render(<PanelChartBody {...createChartBodyProps()} />);

        fireEvent.mouseDown(screen.getByTestId('mock-echart'), { button: button });
        expect(mockChartMouseDown).toHaveBeenCalledTimes(expectedCallCount);
    });

    it('routes a completed selection into highlight persistence when highlight mode is active', () => {
        const { props } = renderPanelChartBody({
            pPanelState: { isHighlightActive: true },
        });

        emitChartEvent('brushEnd', BRUSH_RANGE_PAYLOAD);

        expect(props.pOnHighlightSelection).toHaveBeenCalledWith(120, 180);
        expect(props.pOnDragSelectStateChange).not.toHaveBeenCalled();
    });

    it('re-applies the brush cursor after a rerender while drag zoom is enabled', async () => {
        const { rerenderWith } = renderPanelChartBody();

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

    it('zooms the panel range only on brush end when selection mode is off', () => {
        const { props } = renderPanelChartBody();

        emitChartEvent('brushEnd', BRUSH_RANGE_PAYLOAD);

        expect(props.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
            min: 120,
            max: 180,
            trigger: 'brushZoom',
        });
    });

    it('exposes highlight hit testing through the chart handle', async () => {
        const { props } = renderPanelChartBody({
            pChartState: {
                highlights: [
                    {
                        text: 'unnamed',
                        timeRange: { startTime: 100, endTime: 200 },
                    },
                ],
            },
        });

        await waitFor(() => {
            expect(props.pChartRefs.chartWrap.current).not.toBeNull();
        });

        const areaChartElement = document.createElement('div');
        Object.defineProperty(areaChartElement, 'getBoundingClientRect', {
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
        props.pChartRefs.areaChart.current = areaChartElement;
        mockInstance.containPixel.mockReturnValue(true);
        mockInstance.convertFromPixel.mockReturnValue([150, 0]);

        expect(
            props.pChartRefs.chartWrap.current?.getHighlightIndexAtClientPosition(320, 240),
        ).toBe(0);
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
        const { props } = renderPanelChartBody();

        emitChartEvent('click', payload);

        expectedCall
            ? expect(props.pChartHandlers.onOpenSeriesAnnotationEditor).toHaveBeenCalledWith(
                  expectedCall,
              )
            : expect(props.pChartHandlers.onOpenSeriesAnnotationEditor).not.toHaveBeenCalled();
    });

    it('syncs external panel-range changes through the chart instance without rebuilding the option', async () => {
        const { rerenderWith } = renderPanelChartBody();

        await waitForChartOptionBuild();

        const initialOptionBuildCount = chartOptionModule.buildChartOption.mock.calls.length;
        const initialZoomActionCount = getDispatchActionCount('dataZoom');

        mockInstance.getOption.mockReturnValue({
            dataZoom: [{ startValue: 100, endValue: 200 }],
        });

        rerenderWith({ pNavigateState: { panelRange: NEXT_PANEL_RANGE } });

        await waitFor(() => {
            expect(getDispatchActionCount('dataZoom')).toBeGreaterThan(initialZoomActionCount);
        });

        expect(chartOptionModule.buildChartOption).toHaveBeenCalledTimes(initialOptionBuildCount);
        expectDataZoomDispatch(NEXT_PANEL_RANGE);
    });

    it('does not rebuild the option when parent rerenders with equal-value chart config objects', async () => {
        const { props, rerenderWith } = renderPanelChartBody();

        await waitForChartOptionBuild();

        const initialOptionBuildCount = chartOptionModule.buildChartOption.mock.calls.length;

        rerenderWith({
            pChartState: {
                axes: { ...props.pChartState.axes },
                display: { ...props.pChartState.display },
            },
        });

        expect(chartOptionModule.buildChartOption).toHaveBeenCalledTimes(initialOptionBuildCount);
    });

    it('applies legend hover styling imperatively without rebuilding the structural chart option', async () => {
        renderPanelChartBody();

        await waitForChartOptionBuild();

        const initialOptionBuildCount = chartOptionModule.buildChartOption.mock.calls.length;

        emitChartEvent('highlight', { seriesName: 'temp(avg)' });
        expect(chartOptionModule.buildChartSeriesOption).not.toHaveBeenCalled();
        expect(mockInstance.setOption).not.toHaveBeenCalled();

        emitChartEvent('highlight', { seriesName: 'temp(avg)', excludeSeriesId: [] });

        await waitFor(() => {
            const chartInfo = chartOptionModule.buildChartSeriesOption.mock.calls.at(-1)?.[0];
            expect(chartInfo.hoveredLegendSeries).toBe('temp(avg)');
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
            const chartInfo = chartOptionModule.buildChartSeriesOption.mock.calls.at(-1)?.[0];
            expect(chartInfo.hoveredLegendSeries).toBeUndefined();
        });
    });

    it('prefers the live drag payload over stale absolute zoom state while moving the slider window', () => {
        chartZoomModule.extractDataZoomEventRange.mockImplementation((payload) => {
            const sZoomData = payload?.batch?.[0] ?? payload;
            return typeof sZoomData?.start === 'number' && typeof sZoomData?.end === 'number'
                ? { startTime: 350, endTime: 450 }
                : { startTime: 100, endTime: 200 };
        });

        mockInstance.getOption.mockReturnValue({
            dataZoom: [{ startValue: 100, endValue: 200 }],
        });

        const { props } = renderPanelChartBody();

        emitChartEvent('datazoom', { start: 35, end: 45 });

        expect(props.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
            min: 350,
            max: 450,
            trigger: 'navigator',
        });
    });
});
