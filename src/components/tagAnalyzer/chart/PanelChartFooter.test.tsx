import { fireEvent, render, screen } from '@testing-library/react';
import { createPanelFooterPropsFixture } from '../TestData/PanelTestData';
import PanelChartFooter from './PanelChartFooter';

jest.mock('../domain/time/TimeFormatters', () => ({
    formatUtcRangeLabel: jest.fn((value: number) => `T${value}`),
}));

jest.mock('@/design-system/components', () => {
    const MockDesignSystemButton = ({
        onClick,
        toolTipContent,
    }: {
        onClick: (() => void) | undefined;
        toolTipContent?: string;
    }) => (
        <button type="button" onClick={onClick}>
            {toolTipContent ?? 'action'}
        </button>
    );
    MockDesignSystemButton.Group = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    return { Button: MockDesignSystemButton };
});

jest.mock('./PanelChartLayoutMetrics', () => ({
    getChartLayoutMetrics: jest.fn(() => ({
        toolbarTop: 200,
        toolbarHeight: 28,
        sliderTop: 230,
        sliderHeight: 20,
    })),
}));

describe('PanelChartFooter', () => {
    it('shows the navigator range beside the navigator buttons', () => {
        render(<PanelChartFooter {...createPanelFooterPropsFixture({ startTime: 111, endTime: 222 })} />);

        expect(screen.getByText('T111')).toBeInTheDocument();
        expect(screen.getByText('T222')).toBeInTheDocument();
    });

    it('keeps the navigator move buttons wired to the provided actions', () => {
        const sProps = createPanelFooterPropsFixture(undefined);
        render(<PanelChartFooter {...sProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Move navigator backward' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move navigator forward' }));

        expect(sProps.pNavigatorShiftActions.onShiftLeft).toHaveBeenCalledTimes(1);
        expect(sProps.pNavigatorShiftActions.onShiftRight).toHaveBeenCalledTimes(1);
    });

    it('places navigator move buttons beside the navigator slider', () => {
        const { container } = render(<PanelChartFooter {...createPanelFooterPropsFixture(undefined)} />);

        expect(container.querySelector('.navigator-shift-controls')).toHaveStyle({
            top: '231px',
        });
    });

    it('hides navigator controls while the chart is loading', () => {
        render(
            <PanelChartFooter
                {...createPanelFooterPropsFixture({ startTime: 111, endTime: 222 })}
                pIsLoading
            />,
        );

        expect(screen.queryByText('T111')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
