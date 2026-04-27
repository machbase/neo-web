import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { formatTimeValue } from '@/utils/dashboardUtil';
import TagAnalyzerBoardToolbar from './TagAnalyzerBoardToolbar';

jest.mock('@/assets/icons/Icon', () => ({
    Calendar: () => <span data-testid="calendar-icon" />,
    Save: () => <span data-testid="save-icon" />,
    Refresh: () => <span data-testid="refresh-icon" />,
    SaveAs: () => <span data-testid="save-as-icon" />,
    MdOutlineStackedLineChart: () => <span data-testid="overlap-icon" />,
    LuTimerReset: () => <span data-testid="reset-icon" />,
}));

jest.mock('@/design-system/components', () => {
    /**
     * Renders the mocked page container used in toolbar tests.
     * Intent: Preserve the page wrapper contract without pulling in the full design-system page component.
     * @param {{ children: ReactNode }} props The page children to render.
     * @returns {JSX.Element} The mocked page container.
     */
    const Page = Object.assign(
        ({ children }: { children: ReactNode }) => <div>{children}</div>,
        {
            Header: ({ children }: { children: ReactNode }) => <div>{children}</div>,
            Space: () => null,
        },
    );
    /**
     * Renders the mocked button used in toolbar tests.
     * Intent: Keep button interactions testable without the full design-system button implementation.
     * @param {{ children?: ReactNode; onClick?: () => void | Promise<void>; disabled?: boolean; }} props The mocked button props.
     * @returns {JSX.Element} The mocked button element.
     */
    const Button = Object.assign(
        ({
            children,
            onClick,
            disabled,
        }: {
            children?: ReactNode;
            onClick?: () => void | Promise<void>;
            disabled?: boolean;
        }) => (
            <button type="button" onClick={onClick} disabled={disabled}>
                {children}
            </button>
        ),
        {
            Group: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        },
    );

    return { Button, Page };
});

describe('TagAnalyzerBoardToolbar', () => {
    /**
     * Builds the action handlers used by the toolbar tests.
     * Intent: Give each test a clean set of spies without repeating the handler object shape.
 * @returns {{ onOpenTimeRangeModal: jest.Mock; onRefreshData: jest.Mock; onRefreshTime: jest.Mock; onSave: jest.Mock; onOpenSaveModal: jest.Mock; onOpenOverlapModal: jest.Mock; }} The mocked toolbar action handlers.
 */
    const createActionHandlers = () => ({
        onOpenTimeRangeModal: jest.fn(),
        onRefreshData: jest.fn(),
        onRefreshTime: jest.fn(),
        onSave: jest.fn(),
        onOpenSaveModal: jest.fn(),
        onOpenOverlapModal: jest.fn(),
    });

    it('formats the numeric board range inside the toolbar', () => {
        render(
            <TagAnalyzerBoardToolbar
                pRange={{ min: 1_000, max: 2_000 }}
                pPanelsInfoCount={2}
                pActionHandlers={createActionHandlers()}
            />,
        );

        expect(
            screen.getByText(`${formatTimeValue(1_000)}~${formatTimeValue(2_000)}`),
        ).toBeInTheDocument();
    });

    it('shows the empty-state copy when the numeric board range is unresolved', () => {
        render(
            <TagAnalyzerBoardToolbar
                pRange={{ min: 0, max: 0 }}
                pPanelsInfoCount={0}
                pActionHandlers={createActionHandlers()}
            />,
        );

        expect(screen.getByText('Time range not set')).toBeInTheDocument();
    });

    it('keeps the overlap action disabled until at least one panel is selected', () => {
        const sActions = createActionHandlers();
        render(
            <TagAnalyzerBoardToolbar
                pRange={{ min: 1_000, max: 2_000 }}
                pPanelsInfoCount={0}
                pActionHandlers={sActions}
            />,
        );

        const sDisabledButton = screen
            .getAllByRole('button')
            .find((button) => button.hasAttribute('disabled'));
        expect(sDisabledButton).toBeDefined();

        fireEvent.click(sDisabledButton!);

        expect(sActions.onOpenOverlapModal).not.toHaveBeenCalled();
    });
});
