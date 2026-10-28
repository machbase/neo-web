// The list of theme variables, read from the token sources themselves.
//
// Every themable token is declared once, `$name: themed(name, <dark default>);`, in
// tokens/_colors.scss and tokens/_shadows.scss. The build publishes that list as
// `/web/ui/theme-tokens.json` (vite.config.ts) so a theme builder edits exactly the variables
// this build reads, with their dark defaults, and never a copy that drifts.
//
// No imports: vite.config.ts runs this at build time.

export interface ThemeToken {
    /** The variable without its prefix: `bg-primary` is `--neo-bg-primary`. */
    name: string;
    /** The value with no theme — the built-in dark screen. */
    dark: string;
}

export const THEME_TOKENS_FILE = 'theme-tokens.json';

const DECLARATION = /^\$([a-z0-9-]+):\s*(.+?);/gm;
const THEMED = /^themed\(\s*([a-z0-9-]+)\s*,\s*([\s\S]+)\)$/;

/**
 * The tokens the given SCSS sources declare, in order. A default that names another Sass
 * variable (`themed(bg-header, $bg-primary)`) is resolved to that variable's own default.
 */
export const parseThemeTokens = (aSources: string[]): ThemeToken[] => {
    const sValues = new Map<string, string>();
    const sTokens: ThemeToken[] = [];
    const resolve = (aValue: string): string => {
        const sRef = /^\$([a-z0-9-]+)$/.exec(aValue.trim());
        return sRef ? (sValues.get(sRef[1]) ?? aValue.trim()) : aValue.trim();
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
            sTokens.push({ name: sThemed[1], dark: sDark });
        }
    }
    return sTokens;
};
