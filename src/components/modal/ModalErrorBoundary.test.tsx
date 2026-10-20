import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '@/design-system/components/Modal';
import { Modal as LegacyModal } from '@/components/modal/Modal';

const Bomb = () => {
    throw new Error('boom');
};

// #1547: a dialog that fails to render keeps the failure inside the dialog, and can still be closed.
describe('Modal error boundary', () => {
    let sConsoleError: jest.SpyInstance;

    beforeEach(() => {
        sConsoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        sConsoleError.mockRestore();
    });

    it('shows the card inside the dialog and leaves the page rendered', () => {
        const onClose = jest.fn();
        render(
            <>
                <div>page</div>
                <Modal.Root isOpen onClose={onClose} data-testid="time-range-dialog">
                    <Modal.Body>
                        <Bomb />
                    </Modal.Body>
                </Modal.Root>
            </>,
        );

        expect(screen.getByText('page')).toBeInTheDocument();
        const sCard = screen.getByTestId('error-boundary-dialog%3Atime-range-dialog');
        expect(screen.getByTestId('time-range-dialog')).toContainElement(sCard);

        fireEvent.click(screen.getByTestId('close-dialog'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does the same for the legacy modal', () => {
        const onClose = jest.fn();
        render(
            <>
                <div>page</div>
                <LegacyModal className="value-detail" onOutSideClose={onClose}>
                    <Bomb />
                </LegacyModal>
            </>,
        );

        expect(screen.getByText('page')).toBeInTheDocument();
        expect(screen.getByTestId('error-boundary-dialog%3Avalue-detail')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('close-dialog'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
