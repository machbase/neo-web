// -----------------------------------------------------------------------------
// THEMES — a package that sets the design-system's CSS variables
// -----------------------------------------------------------------------------
// Every colour token is `var(--neo-<name>, <dark default>)` (tokens/_themed.scss). With no
// theme none of the variables is set and the dark defaults draw the screen. A theme is an
// installed package (`/public/<package>/`) whose package.json declares
//
//     "neoTheme": { "label": "Light", "stylesheet": "theme.css", "scheme": "light" }
//
// and whose stylesheet sets the variables it changes on `:root`. Choosing it adds one
// `<link>` to that stylesheet; choosing the default removes it.
//
// The choice is remembered per browser (localStorage) WITH the stylesheet path, and so is the
// stylesheet's text once it has loaded: the next load paints the theme from that copy before
// the first render, with no request between the page and its colours, then links the package's
// stylesheet again (the fresh copy wins and is remembered in turn). If the package was
// uninstalled since, that request fails: the copy is dropped and the dark defaults show; the
// Theme dialog then no longer lists it.

export type ThemeScheme = 'dark' | 'light';

export interface ThemeChoice {
    /** The installed package (`/public/<pkg>/`). */
    pkg: string;
    /** The stylesheet, relative to the package directory. */
    stylesheet: string;
    label: string;
    scheme: ThemeScheme;
}

export const THEME_STORAGE_KEY = 'neo.theme';
/** `{ href, css }`: the chosen stylesheet's text, as last loaded. */
export const THEME_CSS_STORAGE_KEY = 'neo.theme.css';
export const THEME_LINK_ID = 'neo-theme-stylesheet';
export const THEME_CACHED_STYLE_ID = 'neo-theme-cached';
export const THEME_CHANGE_EVENT = 'neo-theme-change';

/** A package name as it appears in `/public/<name>/`: one path segment, nothing that escapes it. */
const SAFE_PKG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** A stylesheet inside the package: relative segments, no `..`, no scheme, ending in .css. */
const SAFE_STYLESHEET = /^(?!.*(^|\/)\.\.?(\/|$))[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*\.css$/;

/** The `neoTheme` field of a package.json, or null when it is missing or unusable. */
export const parseThemeManifest = (aPkg: string, aManifest: unknown): ThemeChoice | null => {
    if (!SAFE_PKG.test(aPkg) || !aManifest || typeof aManifest !== 'object') return null;
    const sTheme = (aManifest as { neoTheme?: unknown }).neoTheme;
    if (!sTheme || typeof sTheme !== 'object') return null;
    const { label, stylesheet, scheme } = sTheme as Record<string, unknown>;
    if (typeof stylesheet !== 'string' || !SAFE_STYLESHEET.test(stylesheet)) return null;
    return {
        pkg: aPkg,
        stylesheet,
        label: typeof label === 'string' && label.trim() ? label.trim() : aPkg,
        scheme: scheme === 'light' ? 'light' : 'dark',
    };
};

export const themeStylesheetUrl = (aChoice: ThemeChoice) => `/public/${encodeURIComponent(aChoice.pkg)}/${aChoice.stylesheet.split('/').map(encodeURIComponent).join('/')}`;

/** The remembered choice, validated again (localStorage is anyone's to edit). */
export const readStoredTheme = (): ThemeChoice | null => {
    try {
        const sRaw = localStorage.getItem(THEME_STORAGE_KEY);
        if (!sRaw) return null;
        const sValue = JSON.parse(sRaw) as Partial<ThemeChoice>;
        return parseThemeManifest(String(sValue.pkg ?? ''), { neoTheme: sValue });
    } catch {
        return null;
    }
};

const notify = (aChoice: ThemeChoice | null) => window.dispatchEvent(new CustomEvent<ThemeChoice | null>(THEME_CHANGE_EVENT, { detail: aChoice }));

const readCachedCss = (aHref: string): string | null => {
    try {
        const sValue = JSON.parse(localStorage.getItem(THEME_CSS_STORAGE_KEY) ?? 'null') as { href?: string; css?: string } | null;
        return sValue && sValue.href === aHref && typeof sValue.css === 'string' ? sValue.css : null;
    } catch {
        return null;
    }
};

const writeCachedCss = (aHref: string, aCss: string | null) => {
    try {
        if (aCss === null) localStorage.removeItem(THEME_CSS_STORAGE_KEY);
        else localStorage.setItem(THEME_CSS_STORAGE_KEY, JSON.stringify({ href: aHref, css: aCss }));
    } catch {
        // Quota: the theme still applies through its link, only not before the first paint.
    }
};

/** The text of a loaded same-origin stylesheet (the package's, served from /public). */
const sheetText = (aLink: HTMLLinkElement): string | null => {
    try {
        const sRules = aLink.sheet?.cssRules;
        return sRules ? Array.from(sRules, (r) => r.cssText).join('\n') : null;
    } catch {
        return null;
    }
};

const setCachedStyle = (aCss: string | null) => {
    const sOld = document.getElementById(THEME_CACHED_STYLE_ID);
    if (aCss === null) {
        sOld?.remove();
        return;
    }
    const sStyle = sOld instanceof HTMLStyleElement ? sOld : document.createElement('style');
    sStyle.id = THEME_CACHED_STYLE_ID;
    sStyle.textContent = aCss;
    if (!sStyle.isConnected) document.head.appendChild(sStyle);
};

/**
 * Puts the document in `aChoice` (null: the dark default). The remembered copy of its stylesheet
 * paints at once; the package's own is linked after it (later in <head>, so it wins), and the
 * change event fires once that has loaded (or failed), so listeners that read resolved colours —
 * the editor, which takes hex values, not variables — read the final ones.
 */
export const applyTheme = (aChoice: ThemeChoice | null) => {
    const sRoot = document.documentElement;
    const sOld = document.getElementById(THEME_LINK_ID);
    if (!aChoice) {
        sOld?.remove();
        setCachedStyle(null);
        delete sRoot.dataset.neoTheme;
        sRoot.style.removeProperty('color-scheme');
        notify(null);
        return;
    }
    const sHref = themeStylesheetUrl(aChoice);
    sRoot.dataset.neoTheme = aChoice.pkg;
    sRoot.style.setProperty('color-scheme', aChoice.scheme);
    if (sOld instanceof HTMLLinkElement && sOld.getAttribute('href') === sHref) {
        notify(aChoice);
        return;
    }
    setCachedStyle(readCachedCss(sHref));
    const sLink = document.createElement('link');
    sLink.id = THEME_LINK_ID;
    sLink.rel = 'stylesheet';
    sLink.href = sHref;
    const sDone = (aLoaded: boolean) => () => {
        // The old sheet stays until the new one is in, so the switch shows no dark frame.
        if (sOld && sOld !== sLink) sOld.remove();
        if (aLoaded) {
            const sCss = sheetText(sLink);
            if (sCss !== null) writeCachedCss(sHref, sCss);
        } else {
            // The package is gone (or unreachable): its remembered copy must not keep painting.
            writeCachedCss(sHref, null);
            setCachedStyle(null);
        }
        notify(aChoice);
    };
    sLink.addEventListener('load', sDone(true), { once: true });
    sLink.addEventListener('error', sDone(false), { once: true });
    // Last in <head>: after every app stylesheet and after the remembered copy.
    document.head.appendChild(sLink);
    if (sOld) sOld.removeAttribute('id');
};

/** Chooses a theme for this browser (null: the dark default). */
export const setTheme = (aChoice: ThemeChoice | null) => {
    try {
        if (aChoice) localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(aChoice));
        else {
            localStorage.removeItem(THEME_STORAGE_KEY);
            localStorage.removeItem(THEME_CSS_STORAGE_KEY);
        }
    } catch {
        // Private mode / quota: the theme still applies for this page.
    }
    applyTheme(aChoice);
};

/** Applies the remembered theme. Called once before the first render. */
export const applyStoredTheme = () => applyTheme(readStoredTheme());

/** The scheme in force: what a component that cannot read CSS variables needs to know. */
export const currentScheme = (): ThemeScheme => (document.documentElement.style.getPropertyValue('color-scheme') === 'light' ? 'light' : 'dark');
