import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';
import { usePanelChartRuntimeController } from '../panel/usePanelChartRuntimeController';
import { resolveEditorTimeBounds } from './PanelEditorUtils';
import EditorChartPreview from './EditorChartPreview';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';

jest.mock('../panel/usePanelChartRuntimeController', () => ({
    usePanelChartRuntimeController: jest.fn(),
}));

jest.mock('./PanelEditorUtils', () => ({
    resolveEditorTimeBounds: jest.fn(),
}));

jest.mock('../panel/PanelChartBody', () => {
    const MockChartBody = () => <div data-testid="chart-body" />;

    return MockChartBody;
});

jest.mock('../panel/PanelChartFooter', () => {
    const MockChartFooter = () => <div data-testid="chart-footer" />;

    return MockChartFooter;
});

jest.mock('@/design-system/components', () => {
    const Button = ({
        onClick,
        toolTipContent,
        icon,
        children,
    }: {
        onClick?: () => void;
        toolTipContent?: string;
        icon?: ReactNode;
        children?: ReactNode;
    }) => (
        <button type="button" onClick={onClick}>
            {toolTipContent ?? children ?? icon}
        </button>
    );

    Button.Group = ({ children }: { children: ReactNode }) => <div>{children}</div>;

    return { Button };
});

describe('EditorChartPreview', () => {
    const usePanelChartRuntimeControllerMock = jest.mocked(usePanelChartRuntimeController);
    const resolveEditorTimeBoundsMock = jest.mocked(resolveEditorTimeBounds);
    const applyLoadedRangesMock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            value: 800,
        });
        usePanelChartRuntimeControllerMock.mockReturnValue({
            navigateState: {
                chartData: [],
                navigatorChartData: [],
                panelRange: EMPTY_TIME_RANGE,
                navigatorRange: EMPTY_TIME_RANGE,
                rangeOption: undefined,
                preOverflowTimeRange: EMPTY_TIME_RANGE,
            },
            refreshPanelData: jest.fn(),
            handlePanelRangeChange: jest.fn(),
            handleNavigatorRangeChange: jest.fn(),
            setExtremes: jest.fn(),
            applyLoadedRanges: applyLoadedRangesMock,
        });
        resolveEditorTimeBoundsMock.mockResolvedValue(
            createTagAnalyzerTimeRangeFixture({ startTime: 300, endTime: 400 }),
        );
    });

    it('recalculates the preview time range when refresh-time is pressed', async () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        render(
            <EditorChartPreview
                pPanelInfo={sPanelInfo}
                pFooterRange={createTagAnalyzerTimeRangeFixture({ startTime: 10, endTime: 20 })}
                pPreviewRange={createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 })}
                pRollupTableList={[]}
            />,
        );

        await waitFor(() => {
            expect(applyLoadedRangesMock).toHaveBeenCalledWith(
                {
                    startTime: 100,
                    endTime: 200,
                },
                {
                    startTime: 10,
                    endTime: 20,
                },
            );
        });
        applyLoadedRangesMock.mockClear();

        fireEvent.click(screen.getByText('Refresh time'));

        await waitFor(() => {
            expect(resolveEditorTimeBoundsMock).toHaveBeenCalledWith({
                timeConfig: {
                    range_bgn: sPanelInfo.time.range_bgn,
                    range_end: sPanelInfo.time.range_end,
                    range_config: sPanelInfo.time.range_config,
                },
                tag_set: sPanelInfo.data.tag_set,
                navigatorRange: {
                    startTime: 10,
                    endTime: 20,
                },
            });
        });
        await waitFor(() => {
            expect(applyLoadedRangesMock).toHaveBeenCalledWith(
                {
                    startTime: 300,
                    endTime: 400,
                },
                {
                    startTime: 10,
                    endTime: 20,
                },
            );
        });
    });
});
