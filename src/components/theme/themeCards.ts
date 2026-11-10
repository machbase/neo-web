// What a card in Settings → Theme shows of a theme: a strip of its main colors — the frame, the
// content, the text, the accent, the lines, success and error — the strip the theme builder shows on
// its start cards (the `swatch` it saves, and the one its presets list).
//
// A theme that lists none (Dark, a theme package's single stylesheet) has its strip worked out from
// its variables the way the page resolves them: the theme's own value, else the token it falls back
// to, else the dark default (theme-tokens.json) — never the theme the page wears.

import { themeStylesheetHref, themeVarsOf, type ThemeChoice } from '@/design-system/theme';
import { THEME_TOKENS_FILE, type ThemeToken } from '@/design-system/theme/themeTokens';

/** The strip's tokens, in its order (the theme builder's SWATCH_TOKENS). */
export const SWATCH_TOKENS = ['bg-primary', 'bg-secondary', 'text-primary', 'accent-main', 'border-color-strong', 'success-main', 'error-main'] as const;

const COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^()]*\))$/i;

const canFetch = () => typeof fetch === 'function';

let sTokens: Promise<ThemeToken[] | null> | null = null;

/** Every theme token with its dark default and the token it falls back to; null when the list cannot be read. */
export const loadThemeTokens = (): Promise<ThemeToken[] | null> => {
    sTokens ??= !canFetch()
        ? Promise.resolve(null)
        : fetch(`/web/ui/${THEME_TOKENS_FILE}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((aList: unknown) =>
                  Array.isArray(aList) ? aList.filter((t): t is ThemeToken => !!t && typeof t.name === 'string' && typeof t.dark === 'string') : null
              )
              .catch(() => null);
    return sTokens;
};

const sSheets = new Map<string, Promise<Record<string, string> | null>>();

/** An installed package's theme, read from its stylesheet (once per address: the version is in it). */
export const loadThemeVars = (aChoice: ThemeChoice): Promise<Record<string, string> | null> => {
    const sHref = themeStylesheetHref(aChoice);
    if (!sSheets.has(sHref)) {
        sSheets.set(
            sHref,
            !canFetch()
                ? Promise.resolve(null)
                : fetch(sHref)
                      .then((r) => (r.ok ? r.text() : null))
                      .then((aCss) => (aCss === null ? null : themeVarsOf(aCss)))
                      .catch(() => null)
        );
    }
    return sSheets.get(sHref)!;
};

/** A theme's strip worked out from its variables (Dark: none); a value that is not a color is left out. */
export const swatchOf = (aTokens: ThemeToken[], aVars: Record<string, string>): string[] => {
    const sByName = new Map(aTokens.map((t) => [t.name, t]));
    const valueOf = (aName: string, aDepth = 0): string | undefined => {
        if (aVars[aName] !== undefined) return aVars[aName];
        const sToken = sByName.get(aName);
        if (!sToken) return undefined;
        return sToken.fallback && aDepth < 8 ? valueOf(sToken.fallback, aDepth + 1) : sToken.dark;
    };
    return SWATCH_TOKENS.map((n) => valueOf(n)).filter((v): v is string => !!v && COLOR.test(v.trim()));
};
