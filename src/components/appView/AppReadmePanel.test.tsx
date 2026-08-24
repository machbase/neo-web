import { act, fireEvent, render, screen } from '@testing-library/react';
import { AppReadmePanel } from './AppReadmePanel';
import { README_PANEL_DEFAULT_WIDTH, README_PANEL_MAX_WIDTH, README_PANEL_MIN_WIDTH } from './useReadmePanelWidth';

// The real Markdown component drags in mermaid and a code-block parser; this
// suite is about the drawer's chrome, not about markdown rendering.
jest.mock('@/components/worksheet/Markdown', () => ({
    Markdown: ({ pContents }: { pContents: string }) => <div data-testid="markdown">{pContents}</div>,
}));

// jsdom ships no `PointerEvent`, so `fireEvent.pointerDown` falls back to a bare
// `Event` and `clientX` reaches the handler as `null` — every drag would measure
// as zero pixels and the resize tests would pass or fail for the wrong reason.
// `PointerEvent` extends `MouseEvent` in the browser, which is where the
// coordinates this component reads come from.
beforeAll(() => {
    if (typeof window.PointerEvent !== 'undefined') return;
    class PointerEventPolyfill extends MouseEvent {
        pointerId: number;
        constructor(type: string, params: PointerEventInit = {}) {
            super(type, params);
            this.pointerId = params.pointerId ?? 0;
        }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
});

beforeEach(() => {
    window.localStorage.clear();
    // The drag coalesces its updates into `requestAnimationFrame`, so the test has
    // to be able to run the frame.
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

const setup = (over: Partial<React.ComponentProps<typeof AppReadmePanel>> = {}) => {
    const onClose = jest.fn();
    const utils = render(<AppReadmePanel pAppName="neo-pkg-demo" pReadme="# hello" pVersion="1.0.8" onClose={onClose} {...over} />);
    return { ...utils, onClose };
};

describe('AppReadmePanel', () => {
    test('renders the README source it was given', () => {
        setup();

        expect(screen.getByTestId('markdown')).toHaveTextContent('# hello');
    });

    test('names itself and the package, so a screen reader can tell two open apps apart', () => {
        setup();

        expect(screen.getByRole('complementary', { name: 'neo-pkg-demo README' })).toBeInTheDocument();
        expect(screen.getByText('README')).toBeInTheDocument();
    });

    // The badge says WHICH README this is. The panel reads the installed copy, so
    // the version is the installed one — not whatever the repo's default branch
    // says today.
    test('shows the installed version as a v-prefixed badge', () => {
        setup({ pVersion: '1.0.8' });

        expect(screen.getByText('v1.0.8')).toBeInTheDocument();
    });

    test('does not double the v when the manifest already carries one', () => {
        setup({ pVersion: 'v2.0.0' });

        expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    });

    // An unreadable package.json is not a reason to hide the README; it is a reason
    // to say nothing about the version.
    test('drops the badge entirely when the version is unknown', () => {
        setup({ pVersion: '' });

        expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
        expect(screen.getByTestId('markdown')).toBeInTheDocument();
    });

    test('the close button reports up rather than hiding itself', () => {
        const { onClose } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Close README' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // Head pinned, body scrolls — the same rule the App Store panel follows. A
    // README is long, and the line telling you what you are reading must not
    // scroll away from it.
    test('only the body scrolls', () => {
        const { container } = setup();

        expect(container.querySelector('.app-readme-panel-body')).toBeInTheDocument();
        expect(container.querySelector('.app-readme-panel-head')).toBeInTheDocument();
    });
});

describe('resizing', () => {
    const handle = () => screen.getByRole('separator', { name: 'Resize README panel' });
    const panel = () => screen.getByRole('complementary');
    const widthOf = () => parseInt((panel() as HTMLElement).style.width, 10);

    // `buttons: 1` is not decoration: the drag now ends itself the moment a move
    // arrives with no button held (the orphan guard), so a test that omits it
    // would measure a drag that stops on its first move.
    const drag = (fromX: number, toX: number) => {
        fireEvent.pointerDown(handle(), { clientX: fromX, pointerId: 1, button: 0, buttons: 1 });
        fireEvent.pointerMove(window, { clientX: toX, pointerId: 1, buttons: 1 });
        act(() => {
            jest.advanceTimersByTime(32);
        });
        fireEvent.pointerUp(window, { clientX: toX, pointerId: 1 });
    };

    test('starts at the default width', () => {
        setup();

        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH);
    });

    // The panel is anchored RIGHT, so the edge moving left makes it wider.
    test('dragging the edge left widens it', () => {
        setup();

        drag(900, 800);

        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH + 100);
    });

    test('dragging the edge right narrows it', () => {
        setup();

        drag(900, 960);

        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH - 60);
    });

    test('a drag past the minimum stops at the minimum, not at nothing', () => {
        setup();

        drag(900, 4000);

        expect(widthOf()).toBe(README_PANEL_MIN_WIDTH);
    });

    test('a drag past the maximum stops at the maximum', () => {
        setup();

        drag(900, -4000);

        expect(widthOf()).toBe(README_PANEL_MAX_WIDTH);
    });

    test('a move with no pointer down does nothing — a stray hover is not a drag', () => {
        setup();

        fireEvent.pointerMove(window, { clientX: 100, pointerId: 1, buttons: 1 });
        act(() => {
            jest.advanceTimersByTime(32);
        });

        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH);
    });

    // THE ORPHANED-DRAG BUG. A release the window never heard (the pointer left the
    // browser, a native menu took over) used to leave `dragging` stuck on, and with
    // it the invisible full-window shield — the app then looked fine and responded
    // to nothing. The next move with no button held has to end the drag.
    test('a move with no button held ends the drag and removes the shield', () => {
        const { container } = setup();
        fireEvent.pointerDown(handle(), { clientX: 900, pointerId: 1, button: 0, buttons: 1 });
        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeInTheDocument();

        fireEvent.pointerMove(window, { clientX: 700, pointerId: 1, buttons: 0 });

        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeNull();
    });

    // Alt-tabbing mid-drag releases the button somewhere this window never hears.
    test('losing window focus ends the drag', () => {
        const { container } = setup();
        fireEvent.pointerDown(handle(), { clientX: 900, pointerId: 1, button: 0, buttons: 1 });

        fireEvent.blur(window);

        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeNull();
    });

    // A context menu opening over a half-started drag is the other way to strand it.
    test('a right-click on the handle starts no drag at all', () => {
        const { container } = setup();

        fireEvent.pointerDown(handle(), { clientX: 900, pointerId: 1, button: 2, buttons: 2 });

        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeNull();
    });

    // A panel that forgets its width every time it closes makes the user pay the
    // drag over and over and never keeps the result.
    test('the width survives closing and reopening the panel', () => {
        const { unmount } = setup();
        drag(900, 820);
        const dragged = widthOf();
        unmount();

        setup();

        expect(widthOf()).toBe(dragged);
    });

    test('a corrupt stored width falls back to the default rather than wedging the panel', () => {
        window.localStorage.setItem('appReadmePanelWidth', 'not-a-number');

        setup();

        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH);
    });

    test('arrow keys resize it too, so the handle is not mouse-only', () => {
        setup();

        fireEvent.keyDown(handle(), { key: 'ArrowLeft' });

        expect(widthOf()).toBeGreaterThan(README_PANEL_DEFAULT_WIDTH);

        fireEvent.keyDown(handle(), { key: 'ArrowRight' });
        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH);
    });

    // The shield is what keeps `col-resize` on screen and stops the package's
    // iframe reacting to a gesture that is not for it.
    test('a drag shield covers the frame only while dragging', () => {
        const { container } = setup();
        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeNull();

        fireEvent.pointerDown(handle(), { clientX: 900, pointerId: 1, button: 0, buttons: 1 });
        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeInTheDocument();

        fireEvent.pointerUp(window, { clientX: 900, pointerId: 1 });
        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeNull();
    });

    test('a cancelled pointer (e.g. the OS taking over) ends the drag cleanly', () => {
        const { container } = setup();
        fireEvent.pointerDown(handle(), { clientX: 900, pointerId: 1, button: 0, buttons: 1 });

        fireEvent.pointerCancel(window, { pointerId: 1 });

        expect(container.querySelector('.app-readme-panel-drag-shield')).toBeNull();
    });

    // Many moves in one frame must cost ONE render, not one each: the unthrottled
    // version queued a render per event and the handle fell behind the cursor.
    test('a burst of moves collapses into a single frame update', () => {
        setup();
        fireEvent.pointerDown(handle(), { clientX: 900, pointerId: 1, button: 0, buttons: 1 });

        for (let x = 890; x >= 800; x -= 10) fireEvent.pointerMove(window, { clientX: x, pointerId: 1, buttons: 1 });
        act(() => {
            jest.advanceTimersByTime(32);
        });

        // The LAST position wins, not the first or an average of them.
        expect(widthOf()).toBe(README_PANEL_DEFAULT_WIDTH + 100);
        fireEvent.pointerUp(window, { clientX: 800, pointerId: 1 });
    });
});
