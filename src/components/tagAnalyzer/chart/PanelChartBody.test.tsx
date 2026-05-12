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
    PanelChartState,
    PanelMarkupHandlers,
    PanelNavigateState,
    PanelOverlayModeState,
    PanelRangeHandlers,
} from '../domain/PanelChartModel';
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
    showLoading: jest.Mock;
    hideLoading: jest.Mock;
    containPixel: jest.Mock;
    convertFromPixel: jest.Mock;
    getZr: jest.Mock<MockChartRenderer>;
};

type MockChartRenderer = {
    on: jest.Mock;
    off: jest.Mock;
};

const mockChartMouseDown = jest.fn();
const mockZr: MockChartRenderer = {
    on: jest.fn(),
    off: jest.fn(),
};
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
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    containPixel: jest.fn(() => true),
    convertFromPixel: jest.fn(() => [150, 0]),
    getZr: jest.fn(() => mockZr),
};
let latestChartProps:
    | {
          onChartReady: ((instance: MockChartInstance) => void) | undefined;
          onEvents: Record<string, ((event: unknown) => void) | undefined>;
      }
    | undefined;

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return React.forwardRef((props: {
        onChartReady: ((instance: MockChartInstance) => void) | undefined;
        onEvents: Record<string, ((event: unknown) => void) | undefined>;
    }, ref) => {
        latestChartProps = props;
        const { onChartReady } = props;
        React.useImperativeHandle(ref, () => ({ getEchartsInstance: () => mockInstance }), []);
        React.useEffect(() => void onChartReady?.(mockInstance), [onChartReady]);
        return <div data-testid="mock-echart" onMouseDown={mockChartMouseDown} />;
    });
});

jest.mock('./options/ChartOptionBuilder', () => ({
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

jest.mock('./options/ChartLegendVisibility', () => ({
    buildDefaultVisibleSeriesMap: jest.fn(() => ({ 'temp(avg)': true })),
    buildVisibleSeriesList: jest.fn(() => [{ name: 'temp(avg)', visible: true }]),
}));

jest.mock('./chartInternal/ChartDataZoomUtils', () => ({
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

const chartOptionModule = jest.requireMock('./options/ChartOptionBuilder') as {
    buildChartOption: jest.Mock;
    buildChartSeriesOption: jest.Mock;
};
const chartZoomModule = jest.requireMock('./chartInternal/ChartDataZoomUtils') as {
    extractDataZoomEventRange: jest.Mock;
};

type PanelChartBodyOverrides = {
    pChartAreaRef?: Parameters<typeof PanelChartBody>[0]['pChartAreaRef'];
    pChartApiRef?: Parameters<typeof PanelChartBody>[0]['pChartApiRef'];
    pChartState?: Partial<Parameters<typeof PanelChartBody>[0]['pChartState']>;
    pIsRaw?: Parameters<typeof PanelChartBody>[0]['pIsRaw'];
    pOverlayModeState?: Partial<Parameters<typeof PanelChartBody>[0]['pOverlayModeState']>;
    pNavigateState?: Partial<Parameters<typeof PanelChartBody>[0]['pNavigateState']>;
    pIsLoading?: Parameters<typeof PanelChartBody>[0]['pIsLoading'];
    pRangeHandlers?: Partial<Parameters<typeof PanelChartBody>[0]['pRangeHandlers']>;
    pMarkupHandlers?: Partial<Parameters<typeof PanelChartBody>[0]['pMarkupHandlers']>;
    pOnSelection?: Parameters<typeof PanelChartBody>[0]['pOnSelection'];
};

const NEXT_PANEL_RANGE = { startTime: 150, endTime: 250 };
const BRUSH_RANGE_PAYLOAD = { areas: [{ coordRange: [120, 180] }] };

function createChartBodyProps(
    overrides: PanelChartBodyOverrides = {},
): Parameters<typeof PanelChartBody>[0] {
    const chartData = createTagAnalyzerChartSeriesListFixture();
    const props: Parameters<typeof PanelChartBody>[0] = {
        pChartAreaRef: { current: null },
        pChartApiRef: { current: null },
        pChartState: {
            axes: createTagAnalyzerPanelAxesFixture(undefined),
            display: createTagAnalyzerPanelDisplayFixture({ use_zoom: true }),
            seriesList: [createTagAnalyzerSeriesConfigFixture(undefined)],
            useNormalize: false,
            highlights: [],
        } as PanelChartState,
        pIsRaw: false,
        pOverlayModeState: {
            isFFTModal: false,
            isEditing: false,
            isHighlightActive: false,
            isAnnotationActive: false,
            isDragSelectActive: false,
        } as PanelOverlayModeState,
        pNavigateState: {
            chartData: chartData,
            navigatorChartData: chartData,
            panelRange: createTagAnalyzerTimeRangeFixture(undefined),
            navigatorRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 }),
            rangeOption: undefined,
        } as PanelNavigateState,
        pIsLoading: false,
        pRangeHandlers: {
            onPanelRangeChange: jest.fn(),
            onNavigatorRangeChange: jest.fn(),
            onShiftPanelRangeLeft: jest.fn(),
            onShiftPanelRangeRight: jest.fn(),
            onShiftNavigatorRangeLeft: jest.fn(),
            onShiftNavigatorRangeRight: jest.fn(),
        } as PanelRangeHandlers,
        pMarkupHandlers: {
            onOpenCreateAnnotation: jest.fn(),
            onActivateHighlightEditor: jest.fn(),
            onActivateAnnotationEditor: jest.fn(),
        } as PanelMarkupHandlers,
        pOnSelection: jest.fn(),
    };

    return {
        ...props,
        ...overrides,
        pChartAreaRef: overrides.pChartAreaRef ?? props.pChartAreaRef,
        pChartApiRef: overrides.pChartApiRef ?? props.pChartApiRef,
        pChartState: overrides.pChartState
            ? { ...props.pChartState, ...overrides.pChartState }
            : props.pChartState,
        pIsRaw: overrides.pIsRaw ?? props.pIsRaw,
        pOverlayModeState: overrides.pOverlayModeState
            ? { ...props.pOverlayModeState, ...overrides.pOverlayModeState }
            : props.pOverlayModeState,
        pNavigateState: overrides.pNavigateState
            ? { ...props.pNavigateState, ...overrides.pNavigateState }
            : props.pNavigateState,
        pIsLoading: overrides.pIsLoading ?? props.pIsLoading,
        pRangeHandlers: overrides.pRangeHandlers
            ? { ...props.pRangeHandlers, ...overrides.pRangeHandlers }
            : props.pRangeHandlers,
        pMarkupHandlers: overrides.pMarkupHandlers
            ? { ...props.pMarkupHandlers, ...overrides.pMarkupHandlers }
            : props.pMarkupHandlers,
    };
}

function updateChartBodyProps(
    props: Parameters<typeof PanelChartBody>[0],
    overrides: PanelChartBodyOverrides = {},
): Parameters<typeof PanelChartBody>[0] {
    return {
        ...props,
        ...overrides,
        pChartAreaRef: overrides.pChartAreaRef ?? props.pChartAreaRef,
        pChartApiRef: overrides.pChartApiRef ?? props.pChartApiRef,
        pChartState: overrides.pChartState
            ? { ...props.pChartState, ...overrides.pChartState }
            : props.pChartState,
        pIsRaw: overrides.pIsRaw ?? props.pIsRaw,
        pOverlayModeState: overrides.pOverlayModeState
            ? { ...props.pOverlayModeState, ...overrides.pOverlayModeState }
            : props.pOverlayModeState,
        pNavigateState: overrides.pNavigateState
            ? { ...props.pNavigateState, ...overrides.pNavigateState }
            : props.pNavigateState,
        pIsLoading: overrides.pIsLoading ?? props.pIsLoading,
        pRangeHandlers: overrides.pRangeHandlers
            ? { ...props.pRangeHandlers, ...overrides.pRangeHandlers }
            : props.pRangeHandlers,
        pMarkupHandlers: overrides.pMarkupHandlers
            ? { ...props.pMarkupHandlers, ...overrides.pMarkupHandlers }
            : props.pMarkupHandlers,
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

function emitBlankChartClick(payload: unknown) {
    const sClickHandler = mockZr.on.mock.calls.find(
        ([eventName]) => eventName === 'click',
    )?.[1] as ((event: unknown) => void) | undefined;

    act(() => {
        sClickHandler?.(payload);
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
        mockInstance.containPixel.mockReturnValue(true);
        mockInstance.convertFromPixel.mockImplementation(() => [150, 0]);
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

    it('routes a completed brush range through the selection callback', () => {
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isHighlightActive: true },
        });

        emitChartEvent('brushEnd', BRUSH_RANGE_PAYLOAD);

        expect(props.pOnSelection).toHaveBeenCalledWith({
            min: 120,
            max: 180,
            trigger: undefined,
        });
    });

    it.each([
        ['highlight', { isHighlightActive: true }, 'Drag to create highlight'],
        ['annotation', { isAnnotationActive: true }, 'Click to create annotation'],
    ])(
        'shows a cursor hint while %s creation mode is active',
        (_modeName, pOverlayModeState, expectedHint) => {
            renderPanelChartBody({ pOverlayModeState });

            const chartBody = screen.getByTestId('mock-echart').parentElement;
            expect(chartBody).not.toBeNull();

            fireEvent.mouseMove(chartBody as HTMLElement, { clientX: 48, clientY: 64 });

            expect(screen.getByText(expectedHint)).toBeTruthy();
        },
    );

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

        expect(props.pRangeHandlers.onPanelRangeChange).toHaveBeenCalledWith({
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
                        fillColor: '#fdb532',
                        textColor: '#fdb532',
                    },
                ],
            },
        });

        await waitFor(() => {
        expect(props.pChartApiRef.current).not.toBeNull();
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
        props.pChartAreaRef.current = areaChartElement;
        mockInstance.containPixel.mockReturnValue(true);
        mockInstance.convertFromPixel.mockReturnValue([150, 0]);

        expect(
            props.pChartApiRef.current?.getHighlightIndexAtClientPosition(320, 240),
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
        [
            'opens the annotation editor when an ECharts label click only provides series id and data index',
            {
                seriesId: 'annotation-label-series-0',
                dataIndex: 2,
                event: { event: { clientX: 260, clientY: 140 } },
            },
            { seriesIndex: 0, annotationIndex: 2, position: { x: 260, y: 140 } },
        ],
        [
            'opens the clipped annotation editor when ECharts only provides series id and data index',
            {
                seriesId: 'annotation-label-series-0-clipped',
                dataIndex: 2,
                event: { event: { clientX: 260, clientY: 140 } },
            },
            { seriesIndex: 0, annotationIndex: 2, position: { x: 260, y: 140 } },
        ],
    ])('%s', (_name, payload, expectedCall) => {
        const { props } = renderPanelChartBody();

        emitChartEvent('click', payload);

        expectedCall
            ? expect(props.pMarkupHandlers.onActivateAnnotationEditor).toHaveBeenCalledWith(
                  expectedCall,
              )
            : expect(props.pMarkupHandlers.onActivateAnnotationEditor).not.toHaveBeenCalled();
        expect(props.pMarkupHandlers.onOpenCreateAnnotation).not.toHaveBeenCalled();
    });

    it('opens the create annotation popover at the clicked chart time when annotation mode is active', () => {
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('click', {
            seriesName: 'temp(avg)',
            event: { event: { clientX: 260, clientY: 140 } },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 150,
            position: { x: 260, y: 140 },
        });
        expect(props.pMarkupHandlers.onActivateAnnotationEditor).not.toHaveBeenCalled();
    });

    it('uses the ECharts axisValue timestamp for annotation clicks when it is available', () => {
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('click', {
            axisValue: 175,
            event: { event: { clientX: 260, clientY: 140 } },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 175,
            position: { x: 260, y: 140 },
        });
    });

    it('keeps the clicked ECharts series selected for annotation creation', () => {
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('click', {
            axisValue: 175,
            seriesIndex: 1,
            event: { event: { clientX: 260, clientY: 140 } },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 175,
            seriesIndex: 1,
            position: { x: 260, y: 140 },
        });
    });

    it('converts ECharts zr click coordinates into an annotation timestamp', () => {
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('click', {
            event: {
                zrX: 160,
                zrY: 90,
                event: { clientX: 260, clientY: 140 },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 150,
            position: { x: 260, y: 140 },
        });
    });

    it('uses the latest axis-pointer timestamp for ECharts annotation clicks', () => {
        mockInstance.convertFromPixel.mockReturnValue(Number.NaN);
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('updateAxisPointer', {
            axesInfo: [{ axisDim: 'x', axisIndex: 0, value: 190 }],
        });
        emitChartEvent('click', {
            event: {
                zrX: 160,
                zrY: 90,
                event: { clientX: 260, clientY: 140 },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 190,
            position: { x: 260, y: 140 },
        });
    });

    it('falls back to grid conversion when ECharts x-axis click conversion returns NaN', () => {
        mockInstance.convertFromPixel.mockImplementation((finder) =>
            'gridIndex' in finder ? [180, 12] : Number.NaN,
        );
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('click', {
            event: {
                zrX: 160,
                zrY: 90,
                event: { clientX: 260, clientY: 140 },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 180,
            position: { x: 260, y: 140 },
        });
    });

    it('clears the latest axis-pointer timestamp when the pointer leaves the chart', () => {
        mockInstance.convertFromPixel.mockImplementation((finder) =>
            'gridIndex' in finder ? [180, 12] : Number.NaN,
        );
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        emitChartEvent('updateAxisPointer', {
            axesInfo: [{ axisDim: 'x', axisIndex: 0, value: 190 }],
        });
        emitChartEvent('globalout', {});
        emitChartEvent('click', {
            event: {
                zrX: 160,
                zrY: 90,
                event: { clientX: 260, clientY: 140 },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 180,
            position: { x: 260, y: 140 },
        });
    });

    it('keeps the blank-chart annotation click listener attached and gates it by annotation mode', async () => {
        const { props, rerenderWith } = renderPanelChartBody();

        await waitFor(() => {
            expect(mockZr.on).toHaveBeenCalledWith('click', expect.any(Function));
        });

        emitBlankChartClick({
            offsetX: 160,
            offsetY: 90,
            event: { clientX: 260, clientY: 140 },
        });
        expect(props.pMarkupHandlers.onOpenCreateAnnotation).not.toHaveBeenCalled();

        rerenderWith({ pOverlayModeState: { isAnnotationActive: true } });
        emitBlankChartClick({
            offsetX: 160,
            offsetY: 90,
            event: { clientX: 260, clientY: 140 },
        });

        expect(mockZr.off).not.toHaveBeenCalled();
        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 150,
            position: { x: 260, y: 140 },
        });
    });

    it('creates an annotation from a zrender blank-click payload using zr coordinates', async () => {
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        await waitFor(() => {
            expect(mockZr.on).toHaveBeenCalledWith('click', expect.any(Function));
        });

        emitBlankChartClick({
            zrX: 160,
            zrY: 90,
            event: {
                event: {
                    clientX: 260,
                    clientY: 140,
                },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 150,
            position: { x: 260, y: 140 },
        });
    });

    it('falls back to grid conversion when blank-click x-axis conversion returns NaN', async () => {
        mockInstance.convertFromPixel.mockImplementation((finder) =>
            'gridIndex' in finder ? [180, 12] : Number.NaN,
        );
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        await waitFor(() => {
            expect(mockZr.on).toHaveBeenCalledWith('click', expect.any(Function));
        });

        emitBlankChartClick({
            zrX: 160,
            zrY: 90,
            event: {
                event: {
                    clientX: 260,
                    clientY: 140,
                },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 180,
            position: { x: 260, y: 140 },
        });
    });

    it('uses the latest axis-pointer timestamp for blank chart clicks', async () => {
        mockInstance.convertFromPixel.mockReturnValue(Number.NaN);
        const { props } = renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        await waitFor(() => {
            expect(mockZr.on).toHaveBeenCalledWith('click', expect.any(Function));
        });

        emitChartEvent('updateAxisPointer', {
            axesInfo: [{ axisDim: 'x', axisIndex: 0, value: 190 }],
        });
        emitBlankChartClick({
            zrX: 160,
            zrY: 90,
            event: {
                event: {
                    clientX: 260,
                    clientY: 140,
                },
            },
        });

        expect(props.pMarkupHandlers.onOpenCreateAnnotation).toHaveBeenCalledWith({
            timestamp: 190,
            position: { x: 260, y: 140 },
        });
    });

    it('turns off brush zoom while annotation placement mode is active', async () => {
        renderPanelChartBody({
            pOverlayModeState: { isAnnotationActive: true },
        });

        await waitFor(() => {
            expect(mockInstance.dispatchAction).toHaveBeenCalledWith({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {
                    brushType: false,
                    brushMode: undefined,
                    xAxisIndex: undefined,
                },
            });
        });
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

    it('uses the ECharts loading overlay while panel data is loading', async () => {
        const { rerenderWith } = renderPanelChartBody({
            pIsLoading: true,
        });

        await waitFor(() => {
            expect(mockInstance.showLoading).toHaveBeenCalledWith('default', {
                text: 'Loading...',
            });
        });

        rerenderWith({ pIsLoading: false });

        await waitFor(() => {
            expect(mockInstance.hideLoading).toHaveBeenCalled();
        });
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

        expect(props.pRangeHandlers.onPanelRangeChange).toHaveBeenCalledWith({
            min: 350,
            max: 450,
            trigger: 'navigator',
        });
    });
});
