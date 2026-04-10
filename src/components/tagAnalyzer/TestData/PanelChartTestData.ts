import type { PanelChartState, PanelNavigateState } from '../panel/PanelTypes';
import type { TimeRange } from '../panel/TagAnalyzerPanelModelTypes';
import {
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
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
};

// Used by PanelChartTestData fixtures to type mock react e charts props.
export type MockReactEChartsProps = {
    onChartReady?: (aInstance: MockChartInstance) => void;
    onEvents: {
        datazoom?: (aEvent: unknown) => void;
        brushSelected?: (aEvent: unknown) => void;
        brushEnd?: (aEvent: unknown) => void;
    };
};

/**
 * Builds a mocked ECharts instance with a default visible zoom window.
 * @returns A mocked chart instance for focused PanelChart tests.
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
});

/**
 * Builds the smallest PanelChart props needed for interaction tests.
 * @param aPanelRange The visible panel range to seed into the mocked navigate state.
 * @returns The minimum chart props used by focused PanelChart tests.
 */
export const createPanelChartPropsFixture = (
    aPanelRange: Partial<TimeRange> = {},
) => ({
    pChartRefs: {
        areaChart: { current: null },
        chartWrap: { current: null },
    },
    pChartState: {
        axes: createTagAnalyzerPanelAxesFixture(),
        display: createTagAnalyzerPanelDisplayFixture({ use_zoom: 'Y' }),
        useNormalize: 'N',
    } as PanelChartState,
    pPanelState: {
        isRaw: false,
        isDragSelectActive: false,
    },
    pNavigateState: {
        chartData: createTagAnalyzerChartSeriesListFixture(),
        panelRange: createTagAnalyzerTimeRangeFixture(aPanelRange),
        navigatorRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1000 }),
        rangeOption: null,
        preOverflowTimeRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 0 }),
    } as PanelNavigateState,
    pChartHandlers: {
        onSetExtremes: jest.fn(),
        onSetNavigatorExtremes: jest.fn(),
        onSelection: jest.fn(),
    },
});
