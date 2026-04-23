import { fireEvent, render, screen } from '@testing-library/react';
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
import ChartBody from './ChartBody';

const mockTimeSeriesChartMouseDown = jest.fn();

jest.mock('./TimeSeriesChart', () => {
    /**
     * Renders a lightweight chart stub so PanelBody tests can inspect mouse event flow.
     * Intent: Keep the test focused on the wrapper event handling instead of ECharts itself.
     * @returns The mocked chart surface.
     */
    const MockTimeSeriesChart = ({
        pChartHandlers,
    }: {
        pChartHandlers: { onSelection: (aEvent: { min: number; max: number }) => void };
    }) => (
        <div data-testid="panel-chart" onMouseDown={mockTimeSeriesChartMouseDown}>
            chart
            <button
                type="button"
                onClick={() => pChartHandlers.onSelection({ min: 120, max: 180 })}
            >
                select-range
            </button>
        </div>
    );

    return MockTimeSeriesChart;
});

jest.mock('../modal/FFTModal', () => ({
    FFTModal: () => null,
}));

jest.mock('@/design-system/components/Popover', () => ({
    Popover: ({ children }: { children: unknown }) => <div>{children as JSX.Element}</div>,
}));

jest.mock('@/design-system/components', () => {
    /**
     * Renders a minimal button for focused PanelBody interaction tests.
     * Intent: Avoid pulling design-system behavior into chart-body mouse event tests.
     * @param props The button props passed from PanelBody.
     * @returns The mocked button element.
     */
    const Button = ({
        children,
        onClick,
    }: {
        children?: unknown;
        onClick?: (() => void) | undefined;
    }) => (
        <button type="button" onClick={onClick}>
            {children as JSX.Element}
        </button>
    );

    const Page = ({ children }: { children?: unknown }) => <div>{children as JSX.Element}</div>;
    Page.DpRow = ({ children }: { children?: unknown }) => <div>{children as JSX.Element}</div>;
    Page.ContentDesc = ({ children }: { children?: unknown }) => (
        <div>{children as JSX.Element}</div>
    );
    Page.ContentText = ({ pContent }: { pContent: string | number }) => <div>{pContent}</div>;
    Page.Space = () => <div />;

    return {
        Button,
        Page,
        Toast: {
            error: jest.fn(),
        },
    };
});

jest.mock('@/assets/icons/Icon', () => ({
    VscChevronLeft: () => <span>left</span>,
    VscChevronRight: () => <span>right</span>,
    Close: () => <span>close</span>,
}));

/**
 * Builds the smallest PanelBody props needed for chart-body mouse handling tests.
 * Intent: Keep the focused tests on the wrapper event behavior without extra panel orchestration.
 * @returns The PanelBody props fixture for the current test.
 */
function createChartBodyProps() {
    return {
        pChartRefs: {
            areaChart: { current: null },
            chartWrap: {
                current: {
                    setPanelRange: jest.fn(),
                    getVisibleSeries: jest.fn(() => []),
                    getHighlightIndexAtClientPosition: jest.fn(() => undefined),
                },
            },
        } as PanelChartRefs,
        pChartState: {
            axes: createTagAnalyzerPanelAxesFixture(undefined),
            display: createTagAnalyzerPanelDisplayFixture({ use_zoom: true }),
            useNormalize: false,
            highlights: [],
        } as PanelChartState,
        pPanelState: {
            isRaw: false,
            isFFTModal: false,
            isHighlightActive: false,
            isDragSelectActive: false,
        } as PanelState,
        pNavigateState: {
            chartData: createTagAnalyzerChartSeriesListFixture(),
            navigatorChartData: createTagAnalyzerChartSeriesListFixture(),
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
        } as PanelChartHandlers,
        pShiftHandlers: {
            onShiftPanelRangeLeft: jest.fn(),
            onShiftPanelRangeRight: jest.fn(),
            onShiftNavigatorRangeLeft: jest.fn(),
            onShiftNavigatorRangeRight: jest.fn(),
        } as PanelShiftHandlers,
        pTagSet: [createTagAnalyzerSeriesConfigFixture(undefined)],
        pSetIsFFTModal: jest.fn(),
        pOnDragSelectStateChange: jest.fn(),
        pOnHighlightSelection: jest.fn(),
    };
}

describe('ChartBody', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('blocks right-button mouse down from reaching the chart surface', () => {
        // Confirms chart-body capture stops the event before ECharts can treat it as a brush drag.
        const sProps = createChartBodyProps();
        render(<ChartBody {...sProps} />);

        fireEvent.mouseDown(screen.getByTestId('panel-chart'), { button: 2 });

        expect(mockTimeSeriesChartMouseDown).not.toHaveBeenCalled();
    });

    it('still lets ordinary left-button mouse down reach the chart surface', () => {
        // Confirms only the right-button path is intercepted.
        const sProps = createChartBodyProps();
        render(<ChartBody {...sProps} />);

        fireEvent.mouseDown(screen.getByTestId('panel-chart'), { button: 0 });

        expect(mockTimeSeriesChartMouseDown).toHaveBeenCalledTimes(1);
    });

    it('routes a completed selection into highlight persistence when highlight mode is active', () => {
        // Confirms highlight mode uses the same drag gesture but skips the stats popup flow.
        const sProps = createChartBodyProps();
        sProps.pPanelState = {
            ...sProps.pPanelState,
            isHighlightActive: true,
        };
        render(<ChartBody {...sProps} />);

        fireEvent.click(screen.getByText('select-range'));

        expect(sProps.pOnHighlightSelection).toHaveBeenCalledWith(120, 180);
        expect(sProps.pOnDragSelectStateChange).not.toHaveBeenCalled();
    });
});

