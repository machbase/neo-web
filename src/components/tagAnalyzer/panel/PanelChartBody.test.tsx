import { fireEvent, render, screen } from '@testing-library/react';
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

const mockPanelChartRendererMouseDown = jest.fn();

jest.mock('../chart/PanelChartRenderer', () => {
    const MockPanelChartRenderer = ({ pChartHandlers }: { pChartHandlers: { onSelection: (event: { min: number; max: number }) => void } }) => (
        <div data-testid="panel-chart" onMouseDown={mockPanelChartRendererMouseDown}>
            <button type="button" onClick={() => pChartHandlers.onSelection({ min: 120, max: 180 })}>
                select-range
            </button>
        </div>
    );

    return MockPanelChartRenderer;
});

jest.mock('../boardModal/FFTModal', () => ({
    FFTModal: () => null,
}));

jest.mock('@/design-system/components/Popover', () => ({
    Popover: ({ children }: { children: unknown }) => <div>{children as JSX.Element}</div>,
}));

jest.mock('@/design-system/components', () => {
    const MockButton = ({ children, onClick }: { children?: ReactNode; onClick?: (() => void) | undefined }) => (
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

function createChartBodyProps() {
    const chartData = createTagAnalyzerChartSeriesListFixture();
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
            chartData,
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
        pSetIsFFTModal: jest.fn(),
        pOnDragSelectStateChange: jest.fn(),
        pOnHighlightSelection: jest.fn(),
    };
}

describe('PanelChartBody', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        ['blocks right-button mouse down from reaching the chart surface', 2, 0],
        ['still lets ordinary left-button mouse down reach the chart surface', 0, 1],
    ])('%s', (_name, button, expectedCallCount) => {
        render(<PanelChartBody {...createChartBodyProps()} />);

        fireEvent.mouseDown(screen.getByTestId('panel-chart'), { button: button });
        expect(mockPanelChartRendererMouseDown).toHaveBeenCalledTimes(expectedCallCount);
    });

    it('routes a completed selection into highlight persistence when highlight mode is active', () => {
        const props = createChartBodyProps();
        props.pPanelState = { ...props.pPanelState, isHighlightActive: true };

        render(<PanelChartBody {...props} />);
        fireEvent.click(screen.getByText('select-range'));

        expect(props.pOnHighlightSelection).toHaveBeenCalledWith(120, 180);
        expect(props.pOnDragSelectStateChange).not.toHaveBeenCalled();
    });
});
