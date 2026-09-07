import { fireEvent, render, waitFor } from '@testing-library/react';
import type { ComponentProps, MutableRefObject } from 'react';
import { createNewPanelInfo } from '../panel/panelModel';
import { PanelOverlayMode, type PanelChartHandle, type PanelChartHandlers } from './chartInteraction';
import type { ChartSeriesData } from './chartData';
import type { buildChartOption } from './chartOptions';
import PanelChart from './PanelChart';

const mockDispatchAction = jest.fn();
const mockSetOption = jest.fn();
const mockClear = jest.fn();
let mockReadyOptionCalls: unknown[][] = [];
const mockChartInstance = {
    dispatchAction: mockDispatchAction,
    setOption: mockSetOption,
    clear: mockClear,
    containPixel: jest.fn(() => true),
    convertFromPixel: jest.fn(() => [50, 5]),
    getOption: jest.fn(() => ({ dataZoom: [] })),
    getZr: jest.fn(() => ({
        on: jest.fn(),
        off: jest.fn(),
        storage: { getDisplayList: jest.fn(() => []) },
    })),
};

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual<typeof import('react')>('react');

    return {
        __esModule: true,
        default: function MockReactECharts({
            onChartReady,
        }: {
            onChartReady: (instance: unknown) => void;
        }) {
            const onChartReadyRef = React.useRef(onChartReady);

            React.useEffect(() => {
                const readyCallStart = mockSetOption.mock.calls.length;
                onChartReadyRef.current(mockChartInstance);
                mockReadyOptionCalls = mockSetOption.mock.calls.slice(readyCallStart);
            }, [onChartReadyRef]);

            return React.createElement('div', { 'data-testid': 'echarts' });
        },
    };
});

function createSeries(data: ChartSeriesData['data']): ChartSeriesData {
    return {
        name: 'Series',
        echartsName: 'Series',
        data,
        yAxis: 0,
        color: '#123456',
    };
}

const handlers: PanelChartHandlers = {
    rangeActions: {
        setMainRange: jest.fn(),
        shiftMainRangeLeft: jest.fn(),
        shiftMainRangeRight: jest.fn(),
    },
    markupHandlers: {
        onOpenCreateAnnotation: jest.fn(),
        onActivateHighlightEditor: jest.fn(),
        onActivateAnnotationEditor: jest.fn(),
    },
    onHoveredMainSeriesChange: jest.fn(),
    onSelection: jest.fn(),
};

function createProps(): ComponentProps<typeof PanelChart> {
    const panelInfo = createNewPanelInfo([], 'Chart', 'Line');
    panelInfo.display.useZoom = true;
    return {
        panelInfo,
        isLoading: false,
        displayNotice: undefined,
        refs: { chartAreaRef: { current: null }, chartApiRef: { current: null } },
        rangeState: {
            mainRange: { start: 0, end: 100 },
            navigatorRange: { start: -100, end: 200 },
        },
        data: {
            chartData: [createSeries([[0, 1], [50, 3], [100, 2]])],
            navigatorChartData: [createSeries([[-100, 10], [0, 20], [200, 30]])],
        },
        overlayMode: PanelOverlayMode.NO_OVERLAY,
        handlers,
    };
}

describe('PanelChart behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReadyOptionCalls = [];
        mockChartInstance.containPixel.mockReturnValue(true);
    });

    it('re-arms drag zoom immediately after resetting reloaded chart data', async () => {
        const chartAreaRef: MutableRefObject<HTMLDivElement | null> = {
            current: null,
        };
        const chartApiRef: MutableRefObject<PanelChartHandle | null> = {
            current: null,
        };
        const panelInfo = createNewPanelInfo([], 'Chart', 'Line');
        const firstSeries = createSeries([[0, 1], [10, 2]]);
        const firstNavigatorSeries = createSeries([[-20, 10], [20, 20]]);
        const reloadedSeries = createSeries([[0, 3], [10, 4]]);
        const reloadedNavigatorSeries = createSeries([[-20, 30], [20, 40]]);
        const baseProps = {
            panelInfo,
            isLoading: false,
            rangeState: {
                mainRange: { start: 0, end: 10 },
                navigatorRange: { start: -20, end: 20 },
            },
            displayNotice: undefined,
            refs: { chartAreaRef, chartApiRef },
            draftHighlight: undefined,
            overlayMode: PanelOverlayMode.NO_OVERLAY,
            handlers,
        };
        const view = render(
            <PanelChart
                {...baseProps}
                data={{
                    chartData: [firstSeries],
                    navigatorChartData: [firstNavigatorSeries],
                }}
            />,
        );

        await waitFor(() => expect(mockSetOption).toHaveBeenCalled());
        expect(mockReadyOptionCalls).toHaveLength(1);
        expect(mockReadyOptionCalls[0]?.[0]).toMatchObject({
            xAxis: [
                { id: 'panel-main-x-axis', min: 0, max: 10 },
                { id: 'panel-navigator-x-axis', min: -20, max: 20 },
                { id: 'panel-navigator-data-x-axis', min: -20, max: 20 },
            ],
            dataZoom: expect.arrayContaining([
                expect.objectContaining({ id: 'panel-slider-data-zoom', startValue: 0, endValue: 10 }),
            ]),
            series: [
                { id: 'main-series-0', data: [[0, 1], [10, 2]] },
                { id: 'navigator-series-0', data: [[-20, 10], [20, 20]] },
            ],
        });
        jest.clearAllMocks();

        view.rerender(
            <PanelChart
                {...baseProps}
                data={{
                    chartData: [reloadedSeries],
                    navigatorChartData: [reloadedNavigatorSeries],
                }}
            />,
        );

        await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
        const resetOptionCallIndex = mockSetOption.mock.calls.findIndex(
            (call) => call[1]?.notMerge === true,
        );
        expect(resetOptionCallIndex).toBeGreaterThanOrEqual(0);
        expect(mockSetOption.mock.calls.filter(([, options]) => options?.notMerge === true)).toHaveLength(1);
        expect(mockSetOption.mock.calls[resetOptionCallIndex][1]).toEqual({ notMerge: true, lazyUpdate: false });
        expect(mockSetOption.mock.calls[resetOptionCallIndex][0]).toMatchObject({
            series: [
                { id: 'main-series-0', data: [[0, 3], [10, 4]] },
                { id: 'navigator-series-0', data: [[-20, 30], [20, 40]] },
            ],
        });

        const clearOrder = mockClear.mock.invocationCallOrder[0];
        const resetOptionOrder =
            mockSetOption.mock.invocationCallOrder[resetOptionCallIndex];
        expect(clearOrder).toBeLessThan(resetOptionOrder);

        const firstActionAfterReset = mockDispatchAction.mock.calls
            .map((call, index) => ({
                action: call[0],
                order: mockDispatchAction.mock.invocationCallOrder[index],
            }))
            .filter(({ order }) => order > resetOptionOrder)
            .sort((left, right) => left.order - right.order)[0];

        expect(firstActionAfterReset?.action).toMatchObject({
            type: 'takeGlobalCursor',
            key: 'brush',
            brushOption: {
                brushType: 'lineX',
                brushMode: 'single',
                xAxisIndex: 0,
            },
        });
    });

    it('updates both ranges without resending cached data or dropping highlight labels', () => {
        const props = createProps();
        props.panelInfo.highlights = [{
            text: 'Reference',
            timeRange: { start: 20, end: 40 },
            fillColor: '#123456',
            textColor: '#fedcba',
        }];
        const view = render(<PanelChart {...props} />);
        jest.clearAllMocks();

        view.rerender(<PanelChart {...props} rangeState={{
            mainRange: { start: 10, end: 90 },
            navigatorRange: { start: -150, end: 250 },
        }} />);

        expect(mockSetOption).toHaveBeenCalledTimes(1);
        const [rangeOption, updateOptions] = mockSetOption.mock.calls[0];
        expect(updateOptions).toEqual({ lazyUpdate: true, replaceMerge: ['series'] });
        const patch = rangeOption as ReturnType<typeof buildChartOption>;
        expect(patch.xAxis).toEqual([
            expect.objectContaining({ min: 10, max: 90 }),
            expect.objectContaining({ min: -150, max: 250 }),
            expect.objectContaining({ min: -150, max: 250 }),
        ]);
        for (const id of ['main-series-0', 'navigator-series-0']) {
            const series = patch.series.find((item) => item.id === id);
            expect(series).toBeDefined();
            expect(series).not.toHaveProperty('data');
        }
        expect(patch.series.find((item) => item.id === 'highlight-labels')?.data).toEqual([
            expect.objectContaining({ highlightIndex: 0, value: [30, expect.any(Number)] }),
        ]);
        expect(mockDispatchAction).toHaveBeenCalledWith({
            type: 'dataZoom', dataZoomId: 'panel-slider-data-zoom', startValue: 10, endValue: 90,
        });
        expect(mockClear).not.toHaveBeenCalled();
        expect(props.data.chartData[0].data).toEqual([[0, 1], [50, 3], [100, 2]]);
        expect(props.data.navigatorChartData[0].data).toEqual([[-100, 10], [0, 20], [200, 30]]);
    });

    it('zooms around the pointer using the latest range and removes the listener on unmount', () => {
        const props = createProps();
        const view = render(<PanelChart {...props} />);
        const chartArea = props.refs.chartAreaRef.current!;
        chartArea.getBoundingClientRect = () => ({ left: 10, top: 20 } as DOMRect);
        const addListener = jest.spyOn(chartArea, 'addEventListener');
        const removeListener = jest.spyOn(chartArea, 'removeEventListener');
        const firstWheel = new WheelEvent('wheel', { clientX: 160, clientY: 100, deltaY: -1, cancelable: true });
        fireEvent(chartArea, firstWheel);
        expect(firstWheel.defaultPrevented).toBe(true);
        expect(mockChartInstance.containPixel).toHaveBeenLastCalledWith({ gridIndex: 0 }, [150, 80]);
        expect(mockChartInstance.convertFromPixel).toHaveBeenLastCalledWith({ xAxisIndex: 0 }, [150, 80]);
        expect(handlers.rangeActions.setMainRange).toHaveBeenCalledTimes(1);
        expect(handlers.rangeActions.setMainRange).toHaveBeenLastCalledWith({ start: 9, end: 91 });

        view.rerender(<PanelChart {...props} rangeState={{
            mainRange: { start: 20, end: 60 },
            navigatorRange: { start: -100, end: 200 },
        }} />);
        const wheelRegistrations = addListener.mock.calls.filter(([event]) => event === 'wheel');
        expect(wheelRegistrations).toHaveLength(1);
        const wheelListener = wheelRegistrations[0][1];
        expect(wheelRegistrations[0][2]).toEqual({ passive: false });
        fireEvent.wheel(chartArea, { clientX: 160, clientY: 100, deltaY: -1 });
        expect(handlers.rangeActions.setMainRange).toHaveBeenCalledTimes(2);
        const zoomedRange = jest.mocked(handlers.rangeActions.setMainRange).mock.calls[1][0];
        expect(zoomedRange.start).toBeCloseTo(25.4);
        expect(zoomedRange.end).toBeCloseTo(58.2);

        removeListener.mockClear();
        view.unmount();
        expect(removeListener.mock.calls.filter(([event]) => event === 'wheel')).toEqual([
            ['wheel', wheelListener],
        ]);
        expect(props.refs.chartApiRef.current).toBeNull();
        const detachedWheel = new WheelEvent('wheel', { deltaY: -1, cancelable: true });
        fireEvent(chartArea, detachedWheel);
        expect(detachedWheel.defaultPrevented).toBe(false);
        expect(handlers.rangeActions.setMainRange).toHaveBeenCalledTimes(2);
        addListener.mockRestore();
        removeListener.mockRestore();
    });

    it('ignores wheel events outside the grid, without movement, or while zoom is disabled', () => {
        const props = createProps();
        const view = render(<PanelChart {...props} />);
        const chartArea = props.refs.chartAreaRef.current!;
        mockChartInstance.containPixel.mockReturnValue(false);
        const outside = new WheelEvent('wheel', { deltaY: -1, cancelable: true });
        fireEvent(chartArea, outside);
        expect(outside.defaultPrevented).toBe(false);

        mockChartInstance.containPixel.mockReturnValue(true);
        const noMovement = new WheelEvent('wheel', { deltaY: 0, cancelable: true });
        fireEvent(chartArea, noMovement);
        expect(noMovement.defaultPrevented).toBe(false);

        for (const overlayMode of [PanelOverlayMode.ANNOTATION, PanelOverlayMode.HIGHLIGHT, PanelOverlayMode.DRAG_SELECT]) {
            view.rerender(<PanelChart {...props} overlayMode={overlayMode} />);
            const wheel = new WheelEvent('wheel', { deltaY: -1, cancelable: true });
            fireEvent(chartArea, wheel);
            expect(wheel.defaultPrevented).toBe(false);
        }
        view.rerender(<PanelChart {...props} panelInfo={{
            ...props.panelInfo, display: { ...props.panelInfo.display, useZoom: false },
        }} />);
        const disabled = new WheelEvent('wheel', { deltaY: -1, cancelable: true });
        fireEvent(chartArea, disabled);
        expect(disabled.defaultPrevented).toBe(false);
        expect(handlers.rangeActions.setMainRange).not.toHaveBeenCalled();
    });

    it('mounts chart interaction only while a range is available', () => {
        const props = createProps();
        const view = render(<PanelChart {...props} rangeState={undefined} />);
        expect(view.queryByTestId('echarts')).not.toBeInTheDocument();
        expect(mockSetOption).not.toHaveBeenCalled();

        view.rerender(<PanelChart {...props} />);
        expect(view.getByTestId('echarts')).toBeInTheDocument();
        expect(props.refs.chartApiRef.current).not.toBeNull();
        view.rerender(<PanelChart {...props} rangeState={undefined} />);
        expect(view.queryByTestId('echarts')).not.toBeInTheDocument();
        expect(props.refs.chartApiRef.current).toBeNull();
        fireEvent.wheel(props.refs.chartAreaRef.current!, { deltaY: -1 });
        expect(handlers.rangeActions.setMainRange).not.toHaveBeenCalled();
    });

    it('blocks right-button mouse-down without blocking normal chart clicks', () => {
        const props = createProps();
        const onMouseDown = jest.fn();
        render(<div onMouseDown={onMouseDown}><PanelChart {...props} /></div>);
        const chartArea = props.refs.chartAreaRef.current!;
        const rightClick = new MouseEvent('mousedown', { button: 2, bubbles: true, cancelable: true });
        fireEvent(chartArea, rightClick);
        expect(rightClick.defaultPrevented).toBe(true);
        expect(onMouseDown).not.toHaveBeenCalled();

        const leftClick = new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true });
        fireEvent(chartArea, leftClick);
        expect(leftClick.defaultPrevented).toBe(false);
        expect(onMouseDown).toHaveBeenCalledTimes(1);
    });
});
