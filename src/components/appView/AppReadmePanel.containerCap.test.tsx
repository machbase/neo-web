// issue #1570 F-178 — a width saved in a wide window (720) came back as-is after the window shrank
// or the drawer reopened, covering the whole app. The "leave the app 200px" cap must hold on open
// and on every resize, while the saved preference survives for when there is room again.
import { act, render, screen } from '@testing-library/react';
import { AppReadmePanel } from './AppReadmePanel';

jest.mock('@/components/worksheet/Markdown', () => ({
    Markdown: ({ pContents }: { pContents: string }) => <div data-testid="markdown">{pContents}</div>,
}));

let sContainerWidth = 0;
const sOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
const sClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
        configurable: true,
        get() {
            return (this as HTMLElement).classList.contains('app-readme-panel') ? (this as HTMLElement).parentElement : null;
        },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get() {
            return (this as HTMLElement).dataset?.testid === 'app-area' ? sContainerWidth : 0;
        },
    });
});
afterAll(() => {
    if (sOffsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', sOffsetParent);
    if (sClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', sClientWidth);
});
beforeEach(() => window.localStorage.setItem('appReadmePanelWidth', '720'));

const open = () =>
    render(
        <div data-testid="app-area">
            <AppReadmePanel pAppName="neo-pkg-demo" pReadme="# hello" onClose={jest.fn()} />
        </div>
    );
const shownWidth = () => parseInt((screen.getByRole('complementary') as HTMLElement).style.width, 10);

test('reopening in a narrower window leaves the app its 200px', () => {
    sContainerWidth = 768;
    open();
    expect(shownWidth()).toBe(568);
});

test('shrinking the window re-applies the cap, growing it back restores the saved width', () => {
    sContainerWidth = 1500;
    open();
    expect(shownWidth()).toBe(720);

    sContainerWidth = 900;
    act(() => {
        window.dispatchEvent(new Event('resize'));
    });
    expect(shownWidth()).toBe(700);

    sContainerWidth = 1500;
    act(() => {
        window.dispatchEvent(new Event('resize'));
    });
    expect(shownWidth()).toBe(720);
    expect(window.localStorage.getItem('appReadmePanelWidth')).toBe('720');
});
