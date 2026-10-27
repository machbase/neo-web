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
// The choice is remembered per browser (localStorage) WITH the stylesheet path, so the next
// load applies it before the first paint — no manifest request stands between the page and
// its colours. If the package was uninstalled since, the stylesheet 404s and the dark
// defaults show; the Theme dialog then no longer lists it.

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
export const THEME_LINK_ID = 'neo-theme-stylesheet';
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

/**
 * Puts the document in `aChoice` (null: the dark default). The change event fires once the
 * stylesheet has loaded (or failed), so listeners that read resolved colours — the editor,
 * which takes hex values, not variables — read the new ones.
 */
export const applyTheme = (aChoice: ThemeChoice | null) => {
    const sRoot = document.documentElement;
    const sOld = document.getElementById(THEME_LINK_ID);
    if (!aChoice) {
        sOld?.remove();
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
    const sLink = document.createElement('link');
    sLink.id = THEME_LINK_ID;
    sLink.rel = 'stylesheet';
    sLink.href = sHref;
    const sDone = () => {
        // The old sheet stays until the new one is in, so the switch shows no dark frame.
        if (sOld && sOld !== sLink) sOld.remove();
        notify(aChoice);
    };
    sLink.addEventListener('load', sDone, { once: true });
    sLink.addEventListener('error', sDone, { once: true });
    // Last in <head>: after every app stylesheet, though nothing else sets --neo-* anyway.
    document.head.appendChild(sLink);
    if (sOld) sOld.removeAttribute('id');
};

/** Chooses a theme for this browser (null: the dark default). */
export const setTheme = (aChoice: ThemeChoice | null) => {
    try {
        if (aChoice) localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(aChoice));
        else localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
        // Private mode / quota: the theme still applies for this page.
    }
    applyTheme(aChoice);
};

/** Applies the remembered theme. Called once before the first render. */
export const applyStoredTheme = () => applyTheme(readStoredTheme());

/** The scheme in force: what a component that cannot read CSS variables needs to know. */
export const currentScheme = (): ThemeScheme => (document.documentElement.style.getPropertyValue('color-scheme') === 'light' ? 'light' : 'dark');
