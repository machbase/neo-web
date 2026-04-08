import { render, waitFor } from '@testing-library/react';
import PanelChart from './PanelChart';

// The zoom handler reads back the live option tree because ECharts events can omit absolute range values.
const mockInstance = {
    dispatchAction: jest.fn(),
    getOption: jest.fn(() => ({
        dataZoom: [
            {
                startValue: 100,
                endValue: 200,
            },
        ],
    })),
};

let sLatestChartProps: any;

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return React.forwardRef((props: any, ref) => {
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

jest.mock('./PanelEChartUtil', () => ({
    buildPanelChartOption: jest.fn((aParams) => ({
        optionKey: `${aParams.panelRange.startTime}-${aParams.panelRange.endTime}-${aParams.chartData?.length ?? 0}`,
    })),
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

const createProps = (aPanelRange = { startTime: 100, endTime: 200 }) => ({
    pChartRefs: {
        areaChart: { current: null },
        chartWrap: { current: null },
    },
    pChartState: {
        axes: {},
        display: { use_zoom: 'Y' },
        useNormalize: 'N',
    } as any,
    pPanelState: {
        isRaw: false,
        isDragSelectActive: false,
    },
    pNavigateState: {
        chartData: [
            {
                name: 'temp(avg)',
                data: [[100, 1]],
            },
        ],
        navigatorData: {
            datasets: [
                {
                    name: 'temp(avg)',
                    data: [[100, 1]],
                },
            ],
        },
        panelRange: aPanelRange,
        navigatorRange: { startTime: 0, endTime: 1000 },
        rangeOption: null,
        preOverflowTimeRange: { startTime: 0, endTime: 0 },
    },
    pChartHandlers: {
        onSetExtremes: jest.fn(),
        onSetNavigatorExtremes: jest.fn(),
        onSelection: jest.fn(),
    },
});

describe('PanelChart', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestChartProps = undefined;
    });

    it('re-applies the brush cursor after an option-changing rerender while drag zoom is enabled', async () => {
        const { rerender } = render(<PanelChart {...createProps()} />);

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
        rerender(<PanelChart {...createProps({ startTime: 150, endTime: 250 })} />);

        await waitFor(() => {
            const nextBrushActionCount = mockInstance.dispatchAction.mock.calls.filter(
                ([aAction]) => aAction?.type === 'takeGlobalCursor' && aAction?.key === 'brush',
            ).length;

            expect(nextBrushActionCount).toBeGreaterThan(initialBrushActionCount);
        });
    });

    it('does not zoom while the drag brush is still in progress and only commits on brush end', () => {
        const sProps = createProps();
        render(<PanelChart {...sProps} />);

        sLatestChartProps.onEvents.brushSelected?.({
            areas: [
                {
                    coordRange: [120, 180],
                },
            ],
        });

        expect(sProps.pChartHandlers.onSetExtremes).not.toHaveBeenCalled();

        sLatestChartProps.onEvents.brushEnd?.({
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
});
