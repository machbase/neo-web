import type {
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
} from '../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import {
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerSeriesConfigFixture,
    createTagAnalyzerTimeRangeFixture,
} from './PanelTestData';

// Used by PanelChartTestData fixtures to type mock chart option state.
export type MockChartOptionState = {
    dataZoom: Array<{
        startValue: number;
        endValue: number;
    }>;
};

// Used by PanelChartTestData fixtures to type mock chart instance.
export type MockChartInstance = {
    dispatchAction: jest.Mock;
    getOption: jest.Mock<MockChartOptionState>;
    setOption: jest.Mock;
    containPixel: jest.Mock;
    convertFromPixel: jest.Mock;
};

// Used by PanelChartTestData fixtures to type mock react e charts props.
export type MockReactEChartsProps = {
    onChartReady: ((instance: MockChartInstance) => void) | undefined;
    onEvents: {
        datazoom: ((event: unknown) => void) | undefined;
        brushSelected: ((event: unknown) => void) | undefined;
        brushEnd: ((event: unknown) => void) | undefined;
        legendselectchanged: ((event: unknown) => void) | undefined;
        highlight: ((event: unknown) => void) | undefined;
        downplay: ((event: unknown) => void) | undefined;
        click: ((event: unknown) => void) | undefined;
        contextmenu: ((event: unknown) => void) | undefined;
    };
};

/**
 * Builds a mocked ECharts instance with a default visible zoom window.
 * Intent: Keep chart-interaction tests focused on predictable chart-instance behavior.
 * @returns {MockChartInstance} A mocked chart instance for focused PanelChart tests.
 */
export const createMockChartInstance = (): MockChartInstance => ({
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
});

/**
 * Builds the smallest PanelChart props needed for interaction tests.
 * Intent: Keep panel-chart tests on the minimal state needed to exercise interactions.
 * @param {Partial<TimeRangeMs>} panelRange The visible panel range to seed into the mocked navigate state.
 * @returns {object} The minimum chart props used by focused PanelChart tests.
 */
export const createPanelChartPropsFixture = (panelRange: Partial<TimeRangeMs> = {}) => ({
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
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: false,
    },
    pNavigateState: {
        chartData: createTagAnalyzerChartSeriesListFixture(),
        navigatorChartData: createTagAnalyzerChartSeriesListFixture(),
        panelRange: createTagAnalyzerTimeRangeFixture(panelRange),
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
    },
});
