import { render, waitFor } from '@testing-library/react';
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

jest.mock('./PanelEChartUtil', () => ({
    buildPanelChartOption: jest.fn((aParams) => ({
        optionKey: `${aParams.navigatorRange.startTime}-${aParams.navigatorRange.endTime}-${aParams.chartData?.length ?? 0}`,
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

const getBuildPanelChartOptionMock = (): jest.Mock =>
    (jest.requireMock('./PanelEChartUtil') as { buildPanelChartOption: jest.Mock }).buildPanelChartOption;

describe('PanelChart', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestChartProps = undefined;
    });

    it('re-applies the brush cursor after an option-changing rerender while drag zoom is enabled', async () => {
        // Confirms brush mode survives option replacement when the chart rerenders.
        const { rerender } = render(<PanelChart {...createPanelChartPropsFixture()} />);

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
        rerender(<PanelChart {...createPanelChartPropsFixture({ startTime: 150, endTime: 250 })} />);

        await waitFor(() => {
            const nextBrushActionCount = mockInstance.dispatchAction.mock.calls.filter(
                ([aAction]) => aAction?.type === 'takeGlobalCursor' && aAction?.key === 'brush',
            ).length;

            expect(nextBrushActionCount).toBeGreaterThan(initialBrushActionCount);
        });
    });

    it('does not zoom while the drag brush is still in progress and only commits on brush end', () => {
        // Confirms the zoom commit waits for mouse release instead of a debounced mid-drag update.
        const sProps = createPanelChartPropsFixture();
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
        const sProps = createPanelChartPropsFixture();
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
});
