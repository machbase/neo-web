import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { Side } from './index';

describe('SideVersion', () => {
    const originalOpen = window.open;
    const renderSideVersion = (props: Omit<ComponentProps<typeof Side.Root>, 'children'>) => {
        return render(<Side.Root {...props}>content</Side.Root>);
    };

    beforeEach(() => {
        window.open = jest.fn();
    });

    afterEach(() => {
        window.open = originalOpen;
    });

    test('renders current version without status indicator', () => {
        renderSideVersion({ pServer: { version: 'v8.5.2' } });

        expect(screen.getByText('Machbase-neo')).toBeInTheDocument();
        expect(screen.getByText('v8.5.2')).toBeInTheDocument();
        expect(screen.queryByText('latest')).not.toBeInTheDocument();
    });

    test('renders latest indicator', () => {
        renderSideVersion({ pServer: { version: 'v8.5.6' }, pNeoUpdateStatus: { state: 'latest', currentVersion: 'v8.5.6', latestVersion: 'v8.5.6' } });

        expect(screen.getByText('latest')).toBeInTheDocument();
    });

    test('renders update chip with the new version', () => {
        renderSideVersion({
            pServer: { version: 'v8.5.2' },
            pNeoUpdateStatus: { state: 'update-available', currentVersion: 'v8.5.2', latestVersion: 'v8.5.6' },
        });

        // chip carries only the new version (v8.5.6); the current version (v8.5.2) stays as plain text
        expect(screen.getByText('v8.5.6')).toBeInTheDocument();
        expect(screen.queryByText('Update v8.5.6')).not.toBeInTheDocument();
    });

    test('opens Neo home on click', () => {
        renderSideVersion({ pServer: { version: 'v8.5.2' } });

        fireEvent.click(screen.getByRole('button', { name: /Machbase-neo v8.5.2/ }));

        expect(window.open).toHaveBeenCalledWith('https://docs.machbase.com/neo/releases/', '_blank', 'noopener,noreferrer');
    });
});

// issue #1570 F-180, F-103 — the side panels' shared failed-read line
describe('Side.LoadError', () => {
    test('with earlier data: says it was not refreshed and how old the data on screen is', () => {
        const sAt = new Date(2026, 9, 27, 18, 24, 33).getTime();
        render(<Side.LoadError pReason="Network Error" pLastLoadedAt={sAt} pOnRetry={jest.fn()} />);

        expect(screen.getByRole('alert')).toHaveTextContent('Not refreshed · Network Error · as of 18:24:33');
        expect(screen.getByRole('alert')).toHaveAttribute('title', 'Network Error\nShowing the list read at 18:24:33');
    });

    test('without earlier data: says it could not load', () => {
        render(<Side.LoadError pReason="internal server error" pOnRetry={jest.fn()} />);

        expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load · internal server error");
        expect(screen.getByRole('alert')).not.toHaveTextContent('as of');
    });

    test('Retry calls the panel refresh, and is disabled while a read is in flight', () => {
        const sRetry = jest.fn();
        const { rerender } = render(<Side.LoadError data-testid="x-load-error" pReason="r" pOnRetry={sRetry} />);
        fireEvent.click(screen.getByTestId('x-load-error-retry'));
        expect(sRetry).toHaveBeenCalledTimes(1);

        rerender(<Side.LoadError data-testid="x-load-error" pReason="r" pRetrying pOnRetry={sRetry} />);
        expect(screen.getByTestId('x-load-error-retry')).toBeDisabled();
    });
});
