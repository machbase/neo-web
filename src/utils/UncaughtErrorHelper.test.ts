import { UncaughtErrorObserver } from './UncaughtErrorHelper';

// F-24: window.onerror returned true for every error, cancelling the browser's own "Uncaught …" report, and the
// 'Maximum update depth' entry was the console.error wording, not the one window.onerror receives.
describe('UncaughtErrorObserver window.onerror', () => {
    const sWarn = console.warn;
    const sError = console.error;
    let sSetConsoleList: jest.Mock;

    beforeEach(() => {
        sSetConsoleList = jest.fn();
        UncaughtErrorObserver(sSetConsoleList);
    });
    afterEach(() => {
        console.warn = sWarn;
        console.error = sError;
        window.onerror = null;
    });

    const fire = (aMessage: string) => (window.onerror as any)(aMessage, 'app.js', 1, 1, new Error(aMessage));

    it('an ordinary error keeps the browser report and adds a Console line', () => {
        expect(fire('Uncaught Error: x')).toBe(false);
        expect(sSetConsoleList).toHaveBeenCalledTimes(1);
    });
    it.each([
        "Uncaught TypeError: Cannot read properties of null (reading 'getAttribute')",
        "Uncaught TypeError: Cannot read properties of undefined (reading 'findNearestPointBy')",
        'ResizeObserver loop completed with undelivered notifications.',
        'Uncaught Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.',
    ])('a hidden error stays hidden: %s', (aMessage) => {
        expect(fire(aMessage)).toBe(true);
        expect(sSetConsoleList).not.toHaveBeenCalled();
    });
});
