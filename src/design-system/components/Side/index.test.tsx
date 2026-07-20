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
