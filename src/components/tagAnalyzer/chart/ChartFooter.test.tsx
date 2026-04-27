import { fireEvent, render, screen } from '@testing-library/react';
import { createPanelFooterPropsFixture } from '../TestData/PanelTestData';
import ChartFooter from './ChartFooter';

jest.mock('@/utils/helpers/date', () => ({
    changeUtcToText: jest.fn((value: number) => `T${value}`),
}));

jest.mock('@/design-system/components', () => {
    /**
     * Renders the mocked design-system button used by the footer tests.
     * Intent: Keep the footer tests focused on handler wiring instead of design-system implementation details.
     * @param onClick The button click handler passed from the footer.
     * @returns The mocked button element.
     */
    const MockDesignSystemButton = ({ onClick }: { onClick: (() => void) | undefined }) => (
        <button type="button" onClick={onClick}>
            action
        </button>
    );
    MockDesignSystemButton.Group = ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    );
    return { Button: MockDesignSystemButton };
});

jest.mock('./options/ChartOptionConstants', () => ({
    PANEL_CHART_HEIGHT: 300,
}));

jest.mock('./options/ChartLayoutMetrics', () => ({
    getChartLayoutMetricsWithLegend: jest.fn(() => ({
        toolbarTop: 200,
        toolbarHeight: 28,
    })),
    getChartLayoutMetricsWithoutLegend: jest.fn(() => ({
        toolbarTop: 200,
        toolbarHeight: 28,
    })),
}));

describe('ChartFooter', () => {
    it('shows the visible panel range beside the navigator buttons', () => {
        // Confirms the footer labels reflect the main chart window the user is currently reading.
        render(
            <ChartFooter {...createPanelFooterPropsFixture({ startTime: 111, endTime: 222 })} />,
        );

        expect(screen.getByText('T111')).toBeInTheDocument();
        expect(screen.getByText('T222')).toBeInTheDocument();
    });

    it('keeps the navigator move buttons wired to the provided handlers', () => {
        // Confirms the footer still forwards the left and right navigator button clicks.
        const sProps = createPanelFooterPropsFixture(undefined);
        render(<ChartFooter {...sProps} />);

        const sButtons = screen.getAllByRole('button');
        fireEvent.click(sButtons[0]);
        fireEvent.click(sButtons[sButtons.length - 1]);

        expect(sProps.pShiftHandlers.onShiftNavigatorRangeLeft).toHaveBeenCalledTimes(1);
        expect(sProps.pShiftHandlers.onShiftNavigatorRangeRight).toHaveBeenCalledTimes(1);
    });
});

