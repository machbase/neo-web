import { render, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { createNewPanelInfo } from '../panel/panelModel';
import { PanelOverlayMode } from './chartRuntime';
import type { ChartSeriesData } from './chartData';
import type { PanelChartHandlers } from './chartModel';
import PanelChart, { type PanelChartHandle } from './PanelChart';

const mockDispatchAction = jest.fn();
const mockSetOption = jest.fn();
const mockClear = jest.fn();
const mockChartInstance = {
    dispatchAction: mockDispatchAction,
    setOption: mockSetOption,
    clear: mockClear,
    getOption: jest.fn(() => ({ dataZoom: [] })),
    hideLoading: jest.fn(),
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
                onChartReadyRef.current(mockChartInstance);
            }, [onChartReadyRef]);

            return React.createElement('div', { 'data-testid': 'echarts' });
        },
    };
});

function createSeries(data: ChartSeriesData['data']): ChartSeriesData {
    return {
        name: 'Series',
        data,
        yAxis: 0,
        marker: undefined,
        color: '#123456',
    };
}

const handlers: PanelChartHandlers = {
    rangeActions: {
        applyMainZoomRange: jest.fn(),
        applyMainNavigatorSelectionRange: jest.fn(),
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

describe('PanelChart brush interaction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
        const reloadedSeries = createSeries([[0, 3], [10, 4]]);
        const baseProps = {
            panelInfo,
            isLoading: false,
            rangeState: {
                mainRange: { start: 0, end: 10 },
                navigatorRange: { start: 0, end: 10 },
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
                    navigatorChartData: [firstSeries],
                }}
            />,
        );

        await waitFor(() => expect(mockSetOption).toHaveBeenCalled());
        jest.clearAllMocks();

        view.rerender(
            <PanelChart
                {...baseProps}
                data={{
                    chartData: [reloadedSeries],
                    navigatorChartData: [reloadedSeries],
                }}
            />,
        );

        await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
        const resetOptionCallIndex = mockSetOption.mock.calls.findIndex(
            (call) => call[1]?.notMerge === true,
        );
        expect(resetOptionCallIndex).toBeGreaterThanOrEqual(0);

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
});
