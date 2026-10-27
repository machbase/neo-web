import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal } from '../components/Modal';
import { useDialogFocus } from '@/components/newBoard/useDialogFocus';

// jsdom lays nothing out, so every element would count as hidden.
let sRectsSpy: jest.SpyInstance;
beforeAll(() => {
    sRectsSpy = jest.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [{}] as unknown as DOMRectList);
});
afterAll(() => sRectsSpy.mockRestore());

/** The page behind the dialog lives in #root, as in the app; dialogs portal to <body>. */
const renderInRoot = (aUi: JSX.Element) => {
    const sRoot = document.createElement('div');
    sRoot.id = 'root';
    document.body.appendChild(sRoot);
    const sResult = render(aUi, { container: sRoot });
    return { ...sResult, cleanupRoot: () => sRoot.remove() };
};

const Page = ({ pAutoFocus = false }: { pAutoFocus?: boolean }) => {
    const [sOpen, setOpen] = useState(false);
    return (
        <>
            <textarea data-testid="editor" onKeyDown={(e) => e.key === 'Tab' && e.preventDefault()} />
            <button type="button" data-testid="open" onClick={() => setOpen(true)}>
                Open
            </button>
            <Modal.Root isOpen={sOpen} onClose={() => setOpen(false)} data-testid="dialog">
                <Modal.Header>
                    <Modal.Title>Save</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <input data-testid="name" autoFocus={pAutoFocus} />
                    <input data-testid="indent" onKeyDown={(e) => e.key === 'Tab' && e.preventDefault()} />
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel data-testid="cancel">Cancel</Modal.Cancel>
                </Modal.Footer>
            </Modal.Root>
        </>
    );
};

const openFrom = (aOpener: HTMLElement) => {
    aOpener.focus();
    fireEvent.click(screen.getByTestId('open'));
};

describe('Modal focus (F-174)', () => {
    let sCleanupRoot = () => {};
    afterEach(() => sCleanupRoot());

    it('takes focus off the page behind it when it opens', () => {
        const r = renderInRoot(<Page />);
        sCleanupRoot = r.cleanupRoot;
        openFrom(screen.getByTestId('editor'));

        expect(screen.getByTestId('dialog')).toContainElement(document.activeElement as HTMLElement);
        expect(document.activeElement).not.toBe(screen.getByTestId('editor'));
    });

    it('leaves focus on an autoFocus field', () => {
        const r = renderInRoot(<Page pAutoFocus />);
        sCleanupRoot = r.cleanupRoot;
        openFrom(screen.getByTestId('editor'));

        expect(document.activeElement).toBe(screen.getByTestId('name'));
    });

    it('brings Tab from the page behind back into the dialog, before the page uses the key', () => {
        const r = renderInRoot(<Page />);
        sCleanupRoot = r.cleanupRoot;
        openFrom(screen.getByTestId('editor'));
        screen.getByTestId('editor').focus();

        fireEvent.keyDown(screen.getByTestId('editor'), { key: 'Tab' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close modal' }));

        screen.getByTestId('editor').focus();
        fireEvent.keyDown(screen.getByTestId('editor'), { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(screen.getByTestId('cancel'));
    });

    it('wraps Tab and Shift+Tab around the ends of the dialog', () => {
        const r = renderInRoot(<Page />);
        sCleanupRoot = r.cleanupRoot;
        openFrom(screen.getByTestId('editor'));

        screen.getByTestId('cancel').focus();
        fireEvent.keyDown(screen.getByTestId('cancel'), { key: 'Tab' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close modal' }));

        fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(screen.getByTestId('cancel'));
    });

    it('leaves Tab to a control inside that uses it, and to the browser in the middle of the dialog', () => {
        const r = renderInRoot(<Page />);
        sCleanupRoot = r.cleanupRoot;
        openFrom(screen.getByTestId('editor'));

        screen.getByTestId('indent').focus();
        fireEvent.keyDown(screen.getByTestId('indent'), { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(screen.getByTestId('indent'));

        screen.getByTestId('name').focus();
        expect(fireEvent.keyDown(screen.getByTestId('name'), { key: 'Tab' })).toBe(true);
    });

    it('gives focus back to what had it before the dialog opened once it closes', async () => {
        const r = renderInRoot(<Page pAutoFocus />);
        sCleanupRoot = r.cleanupRoot;
        openFrom(screen.getByTestId('editor'));

        fireEvent.click(screen.getByTestId('cancel'));
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('editor')));
    });

    it('keeps focus where closing the dialog put it', async () => {
        const Closer = () => {
            const [sOpen, setOpen] = useState(true);
            return (
                <>
                    <button type="button" data-testid="elsewhere" />
                    <Modal.Root isOpen={sOpen} onClose={() => setOpen(false)} data-testid="dialog">
                        <button
                            type="button"
                            data-testid="done"
                            onClick={() => {
                                setOpen(false);
                                screen.getByTestId('elsewhere').focus();
                            }}
                        />
                    </Modal.Root>
                </>
            );
        };
        const r = renderInRoot(<Closer />);
        sCleanupRoot = r.cleanupRoot;

        fireEvent.click(screen.getByTestId('done'));
        await new Promise((aResolve) => requestAnimationFrame(aResolve));
        expect(document.activeElement).toBe(screen.getByTestId('elsewhere'));
    });

    it('still starts a New tab dialog without autoFocus on its first field', () => {
        const NewTabDialog = () => {
            useDialogFocus('nb-dialog');
            return (
                <Modal.Root isOpen onClose={() => {}} data-testid="nb-dialog">
                    <Modal.Header>
                        <Modal.Title>Widget</Modal.Title>
                        <Modal.Close />
                    </Modal.Header>
                    <Modal.Body>
                        <button type="button" data-testid="first-field" />
                    </Modal.Body>
                </Modal.Root>
            );
        };
        const r = renderInRoot(<NewTabDialog />);
        sCleanupRoot = r.cleanupRoot;

        expect(document.activeElement).toBe(screen.getByTestId('first-field'));
    });
});
