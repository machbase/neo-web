import { fireEvent, render, screen } from '@testing-library/react';
import { createPanelFooterPropsFixture } from '../TestData/PanelTestData';
import PanelChartFooter from './PanelChartFooter';

jest.mock('@/utils/helpers/date', () => ({
    changeUtcToText: jest.fn((value: number) => `T${value}`),
}));

jest.mock('@/design-system/components', () => {
    const MockDesignSystemButton = ({ onClick }: { onClick: (() => void) | undefined }) => (
        <button type="button" onClick={onClick}>
            action
        </button>
    );
    MockDesignSystemButton.Group = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    return { Button: MockDesignSystemButton };
});

jest.mock('../chart/options/OptionBuildHelpers/ChartOptionConstants', () => ({
    PANEL_CHART_HEIGHT: 300,
}));

jest.mock('../chart/options/OptionBuildHelpers/PanelChartSectionOptionBuilder', () => ({
    getChartLayoutMetrics: jest.fn(() => ({
        toolbarTop: 200,
        toolbarHeight: 28,
    })),
}));

describe('PanelChartFooter', () => {
    it('shows the visible panel range beside the navigator buttons', () => {
        render(<PanelChartFooter {...createPanelFooterPropsFixture({ startTime: 111, endTime: 222 })} />);

        expect(screen.getByText('T111')).toBeInTheDocument();
        expect(screen.getByText('T222')).toBeInTheDocument();
    });

    it('keeps the navigator move buttons wired to the provided handlers', () => {
        const sProps = createPanelFooterPropsFixture(undefined);
        render(<PanelChartFooter {...sProps} />);

        const sButtons = screen.getAllByRole('button');
        fireEvent.click(sButtons[0]);
        fireEvent.click(sButtons[sButtons.length - 1]);

        expect(sProps.pShiftHandlers.onShiftNavigatorRangeLeft).toHaveBeenCalledTimes(1);
        expect(sProps.pShiftHandlers.onShiftNavigatorRangeRight).toHaveBeenCalledTimes(1);
    });
});
