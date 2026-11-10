// The list of theme variables, read from the token sources themselves.
//
// Every themable token is declared once, `$name: themed(name, <dark default>);`, in
// tokens/_colors.scss, _shadows.scss, _border-radius.scss (radius-scale) and _effects.scss (fx-cursor).
// The build publishes that list as
// `/web/ui/theme-tokens.json` (vite.config.ts) so a theme builder edits exactly the variables
// this build reads, with their dark defaults, and never a copy that drifts.
//
// No imports: vite.config.ts runs this at build time.

export interface ThemeToken {
    /** The variable without its prefix: `bg-primary` is `--neo-bg-primary`. */
    name: string;
    /** The value with no theme — the built-in dark screen. */
    dark: string;
    /** The token it shows when a theme leaves it unset, when it is defined as another token (`themed(bg-header, $bg-primary)`). */
    fallback?: string;
}

export const THEME_TOKENS_FILE = 'theme-tokens.json';

const DECLARATION = /^\$([a-z0-9-]+):\s*(.+?);/gm;
const THEMED = /^themed\(\s*([a-z0-9-]+)\s*,\s*([\s\S]+)\)$/;

/**
 * The tokens the given SCSS sources declare, in order. A default that names another Sass
 * variable (`themed(bg-header, $bg-primary)`) is resolved to that variable's own default, and one
 * written as a var() with a fallback (`$x: var(--neo-y, #818181)`) to the fallback.
 */
export const parseThemeTokens = (aSources: string[]): ThemeToken[] => {
    const sValues = new Map<string, string>();
    const sTokenOf = new Map<string, string>();
    const sTokens: ThemeToken[] = [];
    const resolve = (aValue: string): string => {
        const sRef = /^\$([a-z0-9-]+)$/.exec(aValue.trim());
        const sValue = sRef ? (sValues.get(sRef[1]) ?? aValue.trim()) : aValue.trim();
        const sVar = /^var\(\s*--[a-z0-9-]+\s*,\s*([\s\S]+)\)$/.exec(sValue);
        return sVar ? resolve(sVar[1]) : sValue;
    };
    for (const sSource of aSources) {
        // Line comments would end up inside a value (`… #00000020); // Switch button active`).
        const sCode = sSource.replace(/\/\/[^\n]*/g, '');
        for (const m of sCode.matchAll(DECLARATION)) {
            const sThemed = THEMED.exec(m[2].trim());
            if (!sThemed) {
                sValues.set(m[1], resolve(m[2]));
                continue;
            }
            const sDark = resolve(sThemed[2]);
            sValues.set(m[1], sDark);
            sTokenOf.set(m[1], sThemed[1]);
            const sRef = /^\$([a-z0-9-]+)$/.exec(sThemed[2].trim());
            const sFallback = sRef ? sTokenOf.get(sRef[1]) : undefined;
            sTokens.push(sFallback ? { name: sThemed[1], dark: sDark, fallback: sFallback } : { name: sThemed[1], dark: sDark });
        }
    }
    return sTokens;
};
