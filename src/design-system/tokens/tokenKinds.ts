// What every theme token is for, and what may paint what in which state (tokens/README, "Colour
// architecture"). styleRules.test.ts holds every colour in the app's styles to these rules.
//
// A token has one kind. A style paints one of four things — a background, a glyph (text, an icon),
// a line, an SVG shape — in one state, and the kinds it may take for that are fixed below. A part of
// the screen with its own state tokens (the side panel's rows, the console's lines…) takes those, not
// the shared ones.

export type TokenKind =
    | 'surface' // a background area: the frame, content, panels, raised, a part's own background, a dialog, a menu
    | 'field' // a field's fill: inputs, selects, list boxes, a disabled field
    | 'hover' // what the pointer is over, shared or a part's
    | 'selection' // a selected item, a part's selected row, selected under the pointer
    | 'glyph' // text and icons
    | 'line' // borders, dividers, tracks
    | 'focus' // the focus ring and the line of an active thing
    | 'accent' // the accent and its steps, a part's marker
    | 'fill' // a filled control: buttons, switches, scrollbar thumbs
    | 'signal' // a colour that says something: success, warning, error, status, a match
    | 'overlay' // the backdrop and shadows
    | 'constant' // black and white
    | 'content' // a colour that names a thing: the file-type icons
    | 'scalar'; // not a colour

export const TOKEN_KINDS: Record<TokenKind, readonly string[]> = {
    surface: [
        'bg-primary', 'bg-secondary', 'bg-header', 'bg-elevated', 'bg-panel', 'sub-tab-active-bg', 'bg-canvas',
        'gnb-bg', 'tabbar-bg', 'tabbar-active-bg', 'side-bg', 'side-header-bg', 'console-bg', 'console-body-bg', 'table-header-bg',
        'table-stripe-bg', 'dialog-bg', 'menu-bg', 'tooltip-bg', 'scrollbar-track-bg',
    ],
    field: ['field-bg', 'field-disabled-bg'],
    hover: [
        'hover-bg', 'list-hover-bg', 'toolbar-hover-bg', 'gnb-hover-bg', 'tabbar-hover-bg', 'side-hover-bg',
        'console-hover-bg', 'table-row-hover-bg', 'menu-item-hover-bg', 'switch-hover-bg', 'scrollbar-hover-thumb',
    ],
    selection: ['selected-bg', 'selected-hover-bg', 'active-bg', 'side-selected-bg', 'console-selected-bg', 'table-row-selected-bg'],
    glyph: [
        'text-primary', 'text-secondary', 'text-tertiary', 'text-disabled', 'text-muted', 'text-icon', 'selected-text', 'active-text',
        'text-on-accent', 'side-text', 'side-text-muted', 'side-icon', 'console-text', 'console-text-muted', 'console-tab-text', 'console-icon', 'tabbar-active-text',
        'tabbar-inactive-text', 'table-header-text', 'table-row-number-text', 'field-icon', 'dialog-title-text',
        'menu-item-icon', 'tooltip-text', 'gnb-icon', 'gnb-active-icon', ],
    line: [
        'border-color-default', 'border-color-strong', 'scrollbar-border', 'menu-border', 'dialog-border', 'tooltip-border', 'field-border', 'field-error-border', 'switch-border', ],
    focus: ['border-color-focus', 'border-color-active'],
    accent: ['accent-main', 'accent-hover', 'accent-light', 'accent-dark', 'accent-text', 'gnb-marker', 'tabbar-marker', 'console-marker'],
    fill: [
        'button-primary-bg', 'button-danger-bg', 'neutral-main', 'success-fill', 'button-disabled-bg', 'switch-bg',
        'switch-thumb', 'switch-active-thumb', 'scrollbar-thumb',
    ],
    signal: [
        'success-main', 'success-text', 'error-main', 'error-text', 'warning-main', 'warning-text', 'info-main', 'event-match-main',
        'status-none', ],
    overlay: ['bg-backdrop', 'menu-shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl'],
    constant: ['color-black', 'color-white'],
    content: [
        'icon-folder', 'icon-folder-git', 'icon-folder-git-mark', 'icon-folder-public', 'icon-sql', 'icon-tql', 'icon-taz', 'icon-taz-gray',
        'icon-wrk', 'icon-md', 'icon-json', 'icon-csv', 'icon-doc', 'icon-image', 'icon-svg', 'icon-shell', 'icon-powershell', 'icon-new',
        'icon-html', 'icon-css', 'icon-js', 'icon-dsh',
    ],
    scalar: ['radius-scale', 'fx-cursor'],
};

export const KIND_OF: Readonly<Record<string, TokenKind>> = Object.fromEntries(
    (Object.entries(TOKEN_KINDS) as [TokenKind, readonly string[]][]).flatMap(([aKind, aTokens]) => aTokens.map((aToken) => [aToken, aKind])),
);

/** What a style paints: a background, a glyph (color, an icon's fill), a line, an SVG drawing's shape. */
export type PaintRole = 'bg' | 'fg' | 'line' | 'shape';
/** The state a rule's selector is for. Keyboard focus and a press look like a hover; an open popup like rest. */
export type PaintState = 'rest' | 'hover' | 'selected' | 'selected-hover' | 'focus' | 'disabled' | 'open';

const REST: TokenKind[] = ['surface', 'field', 'fill', 'accent', 'signal', 'overlay', 'line'];

/**
 * The state matrix. A background at rest is a surface, a field, a filled control, the accent or a
 * signal (a line too: a divider or a track drawn as a box) — never a hover or a selection. Under the
 * pointer it is a hover (a filled control: a step of its own fill, the accent's or a signal's). A
 * selected item is a selection (a toggle or chip: the accent; a tab: the open page's surface), and
 * stays one under the pointer.
 */
export const ALLOWED: Record<PaintRole, Partial<Record<PaintState, readonly TokenKind[]>>> = {
    bg: {
        rest: REST,
        open: REST,
        hover: ['hover', 'fill', 'accent', 'signal', 'selection'],
        selected: ['selection', 'accent', 'fill', 'signal'],
        'selected-hover': ['selection', 'accent', 'fill', 'signal'],
        focus: [...REST, 'hover', 'selection'],
        disabled: ['field', 'fill', 'surface', 'line'],
    },
    // text and an icon's colour: a glyph; a signal or the accent only as their text tokens (TEXT_COLOURS) —
    // a fill's colour is chosen to carry text on it, not to read on the page. An SVG's fill and stroke are a drawing's (see styleRules).
    fg: { rest: ['glyph', 'content'] },
    line: { rest: ['line', 'focus', 'accent', 'signal', 'fill', 'surface'] },
    shape: { rest: ['surface', 'field', 'fill', 'accent', 'signal', 'overlay', 'line', 'glyph', 'content', 'constant', 'focus'] },
};

/**
 * The signal and accent colours made to read on the page: text and icons may take them (besides the
 * glyphs), and they paint nothing else — not a fill, not a line (a status dot or a mark excepted).
 */
export const TEXT_COLOURS: readonly string[] = ['accent-text', 'success-text', 'warning-text', 'error-text', 'event-match-main'];
/** Of those, the ones that are only text: their fills are the -main tokens. */
export const TEXT_ONLY: readonly string[] = ['accent-text', 'success-text', 'warning-text', 'error-text'];

/** Parts of the screen with their own state tokens: a hover or a selection there takes the part's. */
export const PART_STATE_TOKENS: Readonly<Record<string, { prefix: string; hover?: string; selected?: string }>> = {
    GNB: { prefix: 'gnb', hover: 'gnb-hover-bg' },
    'Tab bar': { prefix: 'tabbar', hover: 'tabbar-hover-bg' },
    'Side panel': { prefix: 'side', hover: 'side-hover-bg', selected: 'side-selected-bg' },
    Console: { prefix: 'console', hover: 'console-hover-bg', selected: 'console-selected-bg' },
    Tables: { prefix: 'table', hover: 'table-row-hover-bg', selected: 'table-row-selected-bg' },
};

/** Where a source file draws, for the parts above (a path rule; dialogs and popovers are their own). */
export const PART_OF_FILE: readonly [RegExp, string][] = [
    [/design-system\/components\/GNB\//, 'GNB'],
    [/design-system\/components\/Tabs\/Tab\.module/, 'Tab bar'],
    [/components\/side\/|components\/fileTree\/|design-system\/components\/Side\//, 'Side panel'],
    [/components\/console\//, 'Console'],
    [/design-system\/components\/Table\/|components\/table\//, 'Tables'],
];

/** The part of the screen a token is one of (its own colours), by name — shared tokens are none's. The theme builder groups its token list by this. */
export const PART_OF_TOKEN: readonly [RegExp, string][] = [
    [/^gnb-/, 'GNB'],
    [/^tabbar-/, 'Tab bar'],
    [/^side-/, 'Side panel'],
    [/^console-/, 'Console'],
    [/^table-/, 'Tables'],
    [/^field-/, 'Inputs'],
    [/^dialog-/, 'Dialogs'],
    [/^menu-/, 'Menus'],
    [/^tooltip-/, 'Tooltips'],
];
export const partOfToken = (aName: string): string | null => PART_OF_TOKEN.find(([aRe]) => aRe.test(aName))?.[1] ?? null;
