import { appTerminalTheme } from './appTerminalTheme';

afterEach(() => document.documentElement.style.removeProperty('color-scheme'));

test('no theme: xterm’s own default — black, white text, no palette override', () => {
    expect(appTerminalTheme()).toEqual({ background: '#000000', foreground: '#ffffff', cursor: '#ffffff' });
});

test('a light theme brings ANSI colours that read on light and a light selection', () => {
    document.documentElement.style.setProperty('color-scheme', 'light');
    const sTheme = appTerminalTheme();
    expect(sTheme.white).toBe('#555555');
    expect(sTheme.yellow).toBe('#949800');
    expect(sTheme.selectionBackground).toBeDefined();
});
