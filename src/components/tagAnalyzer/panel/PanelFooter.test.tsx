import { fireEvent, render, screen } from '@testing-library/react';
import { createPanelFooterPropsFixture } from '../TestData/PanelTestData';
import PanelFooter from './PanelFooter';

jest.mock('@/utils/helpers/date', () => ({
    changeUtcToText: jest.fn((aValue: number) => `T${aValue}`),
}));

jest.mock('@/design-system/components', () => ({
    Button: ({ onClick }: { onClick?: () => void }) => (
        <button type="button" onClick={onClick}>
            action
        </button>
    ),
}));

jest.mock('./PanelZoomControls', () => ({
    __esModule: true,
    default: () => <div data-testid="panel-zoom-controls" />,
}));

jest.mock('./PanelEChartUtil', () => ({
    PANEL_CHART_HEIGHT: 300,
    getPanelChartLayoutMetrics: jest.fn(() => ({
        toolbarTop: 200,
        toolbarHeight: 28,
    })),
}));

describe('PanelFooter', () => {
    it('shows the visible panel range beside the navigator buttons', () => {
        // Confirms the footer labels reflect the main chart window the user is currently reading.
        render(<PanelFooter {...createPanelFooterPropsFixture({ startTime: 111, endTime: 222 })} />);

        expect(screen.getByText('T111')).toBeInTheDocument();
        expect(screen.getByText('T222')).toBeInTheDocument();
    });

    it('keeps the navigator move buttons wired to the provided handlers', () => {
        // Confirms the footer still forwards the left and right navigator button clicks.
        const sProps = createPanelFooterPropsFixture();
        render(<PanelFooter {...sProps} />);

        const sButtons = screen.getAllByRole('button');
        fireEvent.click(sButtons[0]);
        fireEvent.click(sButtons[1]);

        expect(sProps.pShiftHandlers.onShiftNavigatorRangeLeft).toHaveBeenCalledTimes(1);
        expect(sProps.pShiftHandlers.onShiftNavigatorRangeRight).toHaveBeenCalledTimes(1);
    });
});
