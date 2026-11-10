import { render, screen } from '@testing-library/react';
import { ServiceSummaryChip } from './ServiceSummaryChip';

// jsdom's style parser drops var() colours, so the dot's colour is read from the prop it is given
jest.mock('react-icons/vsc', () => ({
    VscCircleFilled: ({ style }: { style: { color: string } }) => <i data-testid="service-dot" data-color={style.color} />,
}));

describe('ServiceSummaryChip', () => {
    // The dot was the dark panel's green/grey literal: on a light theme the green all but vanished.
    test('the status dot takes the theme tokens, each token\'s one dark value as fallback', () => {
        const { unmount } = render(<ServiceSummaryChip pkgName="a" summary={{ scope: 'a', total: 2, running: 1, errors: [] }} />);
        expect(screen.getByTestId('service-dot')).toHaveAttribute('data-color', 'var(--neo-success-main, #37aa3b)');
        unmount();
        render(<ServiceSummaryChip pkgName="b" summary={{ scope: 'b', total: 2, running: 0, errors: [] }} />);
        expect(screen.getByTestId('service-dot')).toHaveAttribute('data-color', 'var(--neo-status-none, #717171)');
    });
});
