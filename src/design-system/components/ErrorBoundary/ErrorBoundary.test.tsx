import { fireEvent, render, screen, within } from '@testing-library/react';
import { ErrorBoundary, ErrorCard } from './index';

let sShouldThrow = true;
const Bomb = ({ label }: { label: string }) => {
    if (sShouldThrow) throw new Error(`boom ${label}`);
    return <div>{label} ok</div>;
};

describe('ErrorBoundary', () => {
    let sConsoleError: jest.SpyInstance;

    beforeEach(() => {
        sShouldThrow = true;
        sConsoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        sConsoleError.mockRestore();
    });

    it('keeps the error inside the boundary and leaves siblings rendered', () => {
        render(
            <>
                <ErrorBoundary name="tab:sql:a.sql" variant="tab">
                    <Bomb label="a" />
                </ErrorBoundary>
                <div>sibling</div>
            </>,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('boom a');
        expect(screen.getByText('sibling')).toBeInTheDocument();
    });

    it('logs one line naming the boundary', () => {
        render(
            <ErrorBoundary name="dsh-panel:p1" variant="unit">
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        expect(sConsoleError).toHaveBeenCalledWith('[ErrorBoundary:dsh-panel:p1]', 'boom a');
    });

    it('renders the children again on Retry', () => {
        const onReset = jest.fn();
        render(
            <ErrorBoundary name="x" variant="unit" onReset={onReset}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        sShouldThrow = false;
        fireEvent.click(screen.getByTestId('retry'));

        expect(screen.getByText('a ok')).toBeInTheDocument();
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('clears the error when a reset key changes', () => {
        const { rerender } = render(
            <ErrorBoundary name="x" variant="unit" resetKeys={[1]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        sShouldThrow = false;
        rerender(
            <ErrorBoundary name="x" variant="unit" resetKeys={[2]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        expect(screen.getByText('a ok')).toBeInTheDocument();
    });

    it('stays on the fallback while the reset keys are unchanged', () => {
        const sKeys = [1];
        const { rerender } = render(
            <ErrorBoundary name="x" variant="unit" resetKeys={sKeys}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        sShouldThrow = false;
        rerender(
            <ErrorBoundary name="x" variant="unit" resetKeys={[1]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        expect(screen.getByTestId('error-boundary-x')).toBeInTheDocument();
    });

    it('catches once when the render that throws also changes the reset keys', () => {
        sShouldThrow = false;
        const { rerender } = render(
            <ErrorBoundary name="x" variant="unit" resetKeys={[1]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        sShouldThrow = true;
        rerender(
            <ErrorBoundary name="x" variant="unit" resetKeys={[2]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        expect(screen.getByTestId('error-boundary-x')).toBeInTheDocument();
        expect(sConsoleError.mock.calls.filter(([aFirst]) => aFirst === '[ErrorBoundary:x]')).toHaveLength(1);
    });

    it('shows a one-line card for a row-sized item, with its actions', () => {
        const onClose = jest.fn();
        render(
            <ErrorBoundary name="tab-title:t1" variant="inline" actions={[{ label: 'Close', testId: 'close-tab', onClick: onClose }]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        const sCard = screen.getByTestId('error-boundary-tab-title%3At1');
        expect(sCard).toHaveTextContent("Can't show this item.");
        expect(sCard).toHaveAttribute('title', 'boom a');
        fireEvent.click(within(sCard).getByTestId('close-tab'));
        expect(onClose).toHaveBeenCalledTimes(1);

        sShouldThrow = false;
        fireEvent.click(within(sCard).getByTestId('retry'));
        expect(screen.getByText('a ok')).toBeInTheDocument();
    });

    it('runs the extra actions and reports the error', () => {
        const onClose = jest.fn();
        const onError = jest.fn();
        render(
            <ErrorBoundary name="x" variant="tab" actions={[{ label: 'Close tab', testId: 'close-tab', onClick: onClose }]} onError={onError}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        fireEvent.click(screen.getByTestId('close-tab'));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom a' }));
    });

    it('applies fallbackStyle to the error card only', () => {
        render(
            <ErrorBoundary name="x" variant="region" fallbackStyle={{ width: '100vw' }}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toHaveStyle({ width: '100vw' });
    });

    it('announces a region or tab, but only labels panel and cell cards', () => {
        render(
            <>
                <ErrorBoundary name="t" variant="tab">
                    <Bomb label="a" />
                </ErrorBoundary>
                <ErrorBoundary name="u1" variant="unit">
                    <Bomb label="b" />
                </ErrorBoundary>
                <ErrorBoundary name="u2" variant="unit">
                    <Bomb label="c" />
                </ErrorBoundary>
            </>,
        );

        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(screen.getAllByRole('group', { name: 'Failed to render.' })).toHaveLength(2);
    });

    it('scopes test IDs under a card ID keyed by the encoded name', () => {
        render(
            <ErrorBoundary name="dsh-panel:a/b" variant="unit" actions={[{ label: 'Delete panel', testId: 'delete-panel', onClick: () => undefined }]}>
                <Bomb label="a" />
            </ErrorBoundary>,
        );

        const sCard = screen.getByTestId(`error-boundary-${encodeURIComponent('dsh-panel:a/b')}`);
        expect(within(sCard).getByTestId('retry')).toBeInTheDocument();
        expect(within(sCard).getByTestId('delete-panel')).toBeInTheDocument();
    });

    it('renders a known failure as a card without throwing or logging anything', () => {
        const onDelete = jest.fn();
        render(<ErrorCard name="dsh-panel:p1" variant="unit" title="Can't load this panel." message="saved settings can't be read" actions={[{ label: 'Delete panel', testId: 'delete-panel', onClick: onDelete }]} />);

        const sCard = screen.getByTestId(`error-boundary-${encodeURIComponent('dsh-panel:p1')}`);
        expect(sCard).toHaveTextContent("Can't load this panel.");
        expect(within(sCard).queryByTestId('retry')).not.toBeInTheDocument();
        fireEvent.click(within(sCard).getByTestId('delete-panel'));
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(sConsoleError).not.toHaveBeenCalled();
    });
});
