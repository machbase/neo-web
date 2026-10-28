import type { ITheme } from '@xterm/xterm';
import { currentScheme, resolveCssColor } from '@/design-system/theme';

/**
 * ANSI colours readable on a light background (the light editors' terminal palette): xterm's
 * defaults are made for black, and their white and yellow vanish on white.
 */
const LIGHT_ANSI: ITheme = {
    black: '#000000',
    red: '#cd3131',
    green: '#00bc00',
    yellow: '#949800',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#cd3131',
    brightGreen: '#14ce14',
    brightYellow: '#b5ba00',
    brightBlue: '#0451a5',
    brightMagenta: '#bc05bc',
    brightCyan: '#0598bc',
    brightWhite: '#a5a5a5',
};

/**
 * The terminal theme a shell set to "Default" uses: the editors' surface (bg-secondary, as Monaco's
 * editor background) and the theme's text. bg-primary is not a surface: a theme may paint it as the
 * frame colour, which turned the whole terminal into the frame. With no theme loaded that is
 * xterm's own default (black, white text), exactly as before; a light scheme brings ANSI colours
 * that read on light.
 * Resolved to hex — xterm takes colours, not CSS variables.
 */
export const appTerminalTheme = (): ITheme => {
    const sForeground = resolveCssColor('var(--neo-text-primary, #ffffff)', '#ffffff');
    return {
        background: resolveCssColor('var(--neo-bg-secondary, #000000)', '#000000'),
        foreground: sForeground,
        cursor: sForeground,
        ...(currentScheme() === 'light' ? { ...LIGHT_ANSI, selectionBackground: resolveCssColor('var(--neo-bg-active, #add6ff)', '#add6ff') } : {}),
    };
};
