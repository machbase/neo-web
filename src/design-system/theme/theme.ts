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
// A theme can also live in the browser: the themes made in the theme builder are kept in this
// browser's localStorage (`neo.themes`, pkg `@local`) — the browser's, whoever signs in on it, as
// the choice is (`neo.theme`), so the sign-in page shows the same theme as the pages after it. Only
// this module reads and writes them: the builder asks for the list, a save or a delete by
// postMessage (REQUESTS FROM A PACKAGE'S APP, below).
//
// A package can hold several themes instead: `"neoTheme": { "index": ["themes.json", …] }`
// names JSON files listing `{ id, label, stylesheet, scheme }` entries. A theme is then told
// apart by package AND stylesheet (`themeKey`), not by package alone. A package whose
// `neoTheme` names neither (`{ "label": "Theme Builder" }`) offers no theme of its own: it is a
// theme package for its app (`main.html`) — the theme builder, which keeps its presets to itself.
//
// The choice is remembered per browser (localStorage) WITH the stylesheet path, and so is the
// stylesheet's text once it has loaded: the next load paints the theme from that copy before
// the first render, with no request between the page and its colours, then links the package's
// stylesheet again (the fresh copy wins and is remembered in turn). If the package was
// uninstalled since, that request fails: the copy is dropped and the dark defaults show; the
// Theme dialog then no longer lists it.
//
// Themes are an experiment: with the server's experiment mode off (`themesEnabled`) the dark
// defaults draw every page, the sign-in page included, an app's requests are refused, and the
// Settings menu has no Theme item. The choice and the browser's themes are kept, and come back
// when experiment mode is on again.

import { EXPERIMENT_CHANGE_EVENT, isExperimentOn, LOCAL_STORAGE_EXPERIMENT_KEY } from '@/hooks/useExperiment';
import { isLoginPicture, LOGIN_PICTURE_MAX_BYTES, readThemePicture, writeThemePicture } from './themePicture';

/** Whether themes are on: only in experiment mode (the flag the server last gave). */
export const themesEnabled = (): boolean => isExperimentOn();
/** Why an app's theme request is refused while themes are off. */
export const THEMES_OFF_REASON = 'themes are only available in experiment mode';

export type ThemeScheme = 'dark' | 'light';

export interface ThemeChoice {
    /** The installed package (`/public/<pkg>/`). */
    pkg: string;
    /** The stylesheet, relative to the package directory. */
    stylesheet: string;
    label: string;
    scheme: ThemeScheme;
    /**
     * The package's version as it was when chosen. It is in the stylesheet's address
     * (themeStylesheetHref): the server sends package files without Cache-Control, so after an
     * update a browser could keep the old stylesheet; a new version is a new address.
     */
    version?: string;
    /**
     * The sign-in page's picture (`neoTheme.loginImage`): an image inside the package, relative to
     * it like the stylesheet. A theme kept in the browser keeps its picture in IndexedDB
     * (themePicture.ts, `LocalTheme.loginImage`), not in the choice.
     */
    loginImage?: string;
}

export const THEME_STORAGE_KEY = 'neo.theme';
/** `{ href, css }`: the chosen stylesheet's text, as last loaded. */
export const THEME_CSS_STORAGE_KEY = 'neo.theme.css';
export const THEME_LINK_ID = 'neo-theme-stylesheet';
export const THEME_CACHED_STYLE_ID = 'neo-theme-cached';
export const THEME_CHANGE_EVENT = 'neo-theme-change';

/** A package name as it appears in `/public/<name>/`: one path segment, nothing that escapes it. */
const SAFE_PKG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** A file inside the package: relative segments, no `..`, no scheme, ending in `.<ext>`. */
const safeFile = (aExt: string) => new RegExp(`^(?!.*(^|\\/)\\.\\.?(\\/|$))[A-Za-z0-9._-]+(\\/[A-Za-z0-9._-]+)*\\.${aExt}$`);
const SAFE_STYLESHEET = safeFile('css');
const SAFE_VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,39}$/;
const SAFE_INDEX = safeFile('json');
/** A picture inside the package; the extension in either case (cameras write `.JPG`). */
const SAFE_LOGIN_IMAGE = new RegExp(safeFile('(?:webp|png|jpe?g|svg)').source, 'i');

/** One theme: `{ label, stylesheet, scheme }` from a manifest's `neoTheme` or an index entry. */
export const parseThemeEntry = (aPkg: string, aEntry: unknown): ThemeChoice | null => {
    if ((aPkg !== LOCAL_THEME_PKG && !SAFE_PKG.test(aPkg)) || !aEntry || typeof aEntry !== 'object') return null;
    const { label, stylesheet, scheme, version, loginImage } = aEntry as Record<string, unknown>;
    if (typeof stylesheet !== 'string' || !SAFE_STYLESHEET.test(stylesheet)) return null;
    return {
        pkg: aPkg,
        stylesheet,
        label: typeof label === 'string' && label.trim() ? label.trim() : aPkg,
        scheme: scheme === 'light' ? 'light' : 'dark',
        ...(typeof version === 'string' && SAFE_VERSION.test(version) ? { version } : {}),
        ...(aPkg !== LOCAL_THEME_PKG && typeof loginImage === 'string' && SAFE_LOGIN_IMAGE.test(loginImage) ? { loginImage } : {}),
    };
};

const neoThemeOf = (aManifest: unknown): Record<string, unknown> | null => {
    const sTheme = aManifest && typeof aManifest === 'object' ? (aManifest as { neoTheme?: unknown }).neoTheme : null;
    return sTheme && typeof sTheme === 'object' ? (sTheme as Record<string, unknown>) : null;
};

/** The single theme a package.json's `neoTheme` declares, or null when it declares none (or only an index). */
export const parseThemeManifest = (aPkg: string, aManifest: unknown): ThemeChoice | null => parseThemeEntry(aPkg, neoThemeOf(aManifest));

/** The index files (`neoTheme.index`, a path or a list) a package.json names; unusable paths are dropped. */
export const themeIndexFiles = (aManifest: unknown): string[] => {
    const sIndex = neoThemeOf(aManifest)?.index;
    const sList = Array.isArray(sIndex) ? sIndex : [sIndex];
    return sList.filter((f): f is string => typeof f === 'string' && SAFE_INDEX.test(f));
};

/**
 * Does this package.json declare a theme package — one stylesheet, an index of them, or neither
 * (the theme builder: an app to make themes in)? A theme package has no service.
 */
export const declaresTheme = (aPkg: string, aManifest: unknown): boolean => parseThemeManifest(aPkg, aManifest) !== null || (SAFE_PKG.test(aPkg) && neoThemeOf(aManifest) !== null);

/** The themes an index file lists: a JSON array of entries (or `{ themes: [...] }`); unusable entries are dropped. */
export const parseThemeIndex = (aPkg: string, aIndex: unknown): ThemeChoice[] => {
    const sList = Array.isArray(aIndex) ? aIndex : aIndex && typeof aIndex === 'object' ? (aIndex as { themes?: unknown }).themes : null;
    if (!Array.isArray(sList)) return [];
    return sList.map((e) => parseThemeEntry(aPkg, e)).filter((t): t is ThemeChoice => t !== null);
};

/** What tells two themes apart: one package can hold several. */
export const themeKey = (aChoice: Pick<ThemeChoice, 'pkg' | 'stylesheet'>) => `${aChoice.pkg}/${aChoice.stylesheet}`;

export const themeStylesheetUrl = (aChoice: ThemeChoice) => `/public/${encodeURIComponent(aChoice.pkg)}/${aChoice.stylesheet.split('/').map(encodeURIComponent).join('/')}`;
/** Where the stylesheet is loaded from: its path, with the package's version when the choice has one. */
export const themeStylesheetHref = (aChoice: ThemeChoice) => `${themeStylesheetUrl(aChoice)}${aChoice.version ? `?v=${encodeURIComponent(aChoice.version)}` : ''}`;
/**
 * The sign-in page's picture a package theme names, with the package's version (null: none). A
 * theme kept in the browser keeps its picture in IndexedDB: `localLoginPictureRef`.
 */
export const themeLoginImageSrc = (aChoice: ThemeChoice | null): string | null =>
    aChoice?.loginImage && aChoice.pkg !== LOCAL_THEME_PKG
        ? `/public/${encodeURIComponent(aChoice.pkg)}/${aChoice.loginImage.split('/').map(encodeURIComponent).join('/')}${aChoice.version ? `?v=${encodeURIComponent(aChoice.version)}` : ''}`
        : null;

// -----------------------------------------------------------------------------
// THEMES IN THE BROWSER — a user's own, saved by the theme builder
// -----------------------------------------------------------------------------

/** The `pkg` of a theme kept in the browser; its `stylesheet` is `<id>.css`. Not a package name (`@`). */
export const LOCAL_THEME_PKG = '@local';
/** `neo.themes`: this browser's own themes, `[{ id, label, scheme, css, swatch?, note?, loginImage?, roles?, pinned?, saved? }]`; pictures are in IndexedDB. */
export const LOCAL_THEMES_KEY = 'neo.themes';

export interface LocalTheme {
    id: string;
    label: string;
    scheme: ThemeScheme;
    /** Only `--neo-*` declarations are taken from it (`localThemeCss`). */
    css: string;
    swatch: string[];
    note: string;
    /** It has a sign-in picture: the file itself, in IndexedDB under its id (themePicture.ts). */
    loginImage?: true;
    /** The builder's: the colour roles given their own colour (`surface` → `#1e1e1e`), to edit the theme again. */
    roles?: Record<string, string>;
    /** The builder's: the tokens set by hand (`hover-bg` → value), kept whatever the roles do. */
    pinned?: Record<string, string>;
    /** When it was saved (ms since the epoch). */
    saved?: number;
}

const SAFE_LOCAL_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
/** A colour role's key in the builder (`surface`, `gnbBg`). */
const SAFE_ROLE = /^[a-zA-Z][a-zA-Z0-9]{0,47}$/;
/** `{ key: value }` with keys `aKey` accepts and values that cannot leave a declaration; other pairs dropped. */
const safeMap = (aValue: unknown, aKey: RegExp): Record<string, string> | undefined => {
    if (!aValue || typeof aValue !== 'object' || Array.isArray(aValue)) return undefined;
    const sOut: Record<string, string> = {};
    for (const [k, v] of Object.entries(aValue).slice(0, 512)) {
        if (aKey.test(k) && typeof v === 'string' && SAFE_VALUE.test(v.trim())) sOut[k] = v.trim();
    }
    return sOut;
};

/** One saved theme, validated — as read back and as the builder hands it to be saved; null: unusable. */
const parseLocalTheme = (aEntry: unknown): LocalTheme | null => {
    if (!aEntry || typeof aEntry !== 'object') return null;
    const { id, label, scheme, css, swatch, note, loginImage, roles, pinned, saved } = aEntry as Record<string, unknown>;
    if (typeof id !== 'string' || !SAFE_LOCAL_ID.test(id) || typeof css !== 'string' || css.length > 65536) return null;
    const sRoles = safeMap(roles, SAFE_ROLE);
    const sPinned = safeMap(pinned, SAFE_TOKEN);
    return {
        id,
        label: typeof label === 'string' && label.trim() ? label.trim() : id,
        scheme: scheme === 'light' ? 'light' : 'dark',
        css,
        swatch: Array.isArray(swatch) ? swatch.filter((c): c is string => typeof c === 'string').slice(0, 8) : [],
        note: typeof note === 'string' ? note.slice(0, 24) : '',
        // the picture itself is not in the entry (an older builder's text picture is left behind)
        ...(loginImage === true ? { loginImage: true as const } : {}),
        ...(sRoles ? { roles: sRoles } : {}),
        ...(sPinned ? { pinned: sPinned } : {}),
        ...(typeof saved === 'number' && Number.isFinite(saved) ? { saved } : {}),
    };
};

/** This browser's own themes, validated (localStorage is anyone's to edit). */
export const readLocalThemes = (): LocalTheme[] => {
    try {
        const sList = JSON.parse(localStorage.getItem(LOCAL_THEMES_KEY) ?? '[]') as unknown;
        if (!Array.isArray(sList)) return [];
        return sList.map(parseLocalTheme).filter((t): t is LocalTheme => t !== null);
    } catch {
        return [];
    }
};

export type LocalThemeResult = { ok: true; theme: LocalTheme } | { ok: false; reason: string };

/** Why a write did not happen, in words the builder can show. */
const writeFailure = (aErr: unknown): string =>
    aErr instanceof DOMException && (aErr.name === 'QuotaExceededError' || aErr.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        ? "this browser's storage for the web UI is full"
        : aErr instanceof Error
          ? aErr.message
          : String(aErr);

/**
 * Saves one of this browser's themes (the builder's entry, validated like the stored ones): over the
 * theme with the same id, in its place, or after the others. `aPicture` is its sign-in picture
 * (a Blob, kept in IndexedDB first), null to take it away, undefined to leave it as it is.
 */
export const saveLocalTheme = async (aEntry: unknown, aPicture?: unknown): Promise<LocalThemeResult> => {
    const sParsed = parseLocalTheme(aEntry);
    if (!sParsed) return { ok: false, reason: 'The theme is not one this web UI can keep.' };
    if (aPicture !== undefined && aPicture !== null && !isLoginPicture(aPicture)) {
        return { ok: false, reason: `The sign-in picture must be a WebP, PNG, JPEG, GIF or AVIF of at most ${LOGIN_PICTURE_MAX_BYTES / 1024 / 1024} MB.` };
    }
    const sHasPicture = aPicture === undefined ? readLocalThemes().some((t) => t.id === sParsed.id && t.loginImage) : aPicture !== null;
    if (aPicture !== undefined) {
        try {
            await writeThemePicture(sParsed.id, aPicture as Blob | null);
        } catch (e) {
            return { ok: false, reason: writeFailure(e) };
        }
    }
    // whether it has a picture is decided here, not by the entry
    const sTheme: LocalTheme = { ...sParsed };
    delete sTheme.loginImage;
    if (sHasPicture) sTheme.loginImage = true;
    // read again after the picture: another save may have ended meanwhile
    const sList = readLocalThemes();
    const sAt = sList.findIndex((t) => t.id === sTheme.id);
    if (sAt < 0) sList.push(sTheme);
    else sList[sAt] = sTheme;
    try {
        localStorage.setItem(LOCAL_THEMES_KEY, JSON.stringify(sList));
    } catch (e) {
        return { ok: false, reason: writeFailure(e) };
    }
    tellFrames();
    return { ok: true, theme: sTheme };
};

/** Deletes one of this browser's themes; the one in use gives way to the dark default. */
export const deleteLocalTheme = (aId: unknown): { ok: true } | { ok: false; reason: string } => {
    if (typeof aId !== 'string' || !SAFE_LOCAL_ID.test(aId)) return { ok: false, reason: 'No such theme.' };
    try {
        localStorage.setItem(LOCAL_THEMES_KEY, JSON.stringify(readLocalThemes().filter((t) => t.id !== aId)));
    } catch (e) {
        return { ok: false, reason: writeFailure(e) };
    }
    // its picture too (a picture left behind is only space: nothing reads it without the entry)
    writeThemePicture(aId, null).catch(() => undefined);
    const sChoice = readStoredTheme();
    // setTheme tells the frames itself
    if (sChoice?.pkg === LOCAL_THEME_PKG && sChoice.stylesheet === `${aId}.css`) setTheme(null);
    else tellFrames();
    return { ok: true };
};

/**
 * The id a browser theme's sign-in picture is kept under (`readThemePicture(id)`), when it has one;
 * null: not a browser theme, or no picture. The sign-in page reads it too: the themes are the
 * browser's, not a user's.
 */
export const localLoginPictureRef = (aChoice: ThemeChoice | null): { id: string } | null => {
    if (aChoice?.pkg !== LOCAL_THEME_PKG) return null;
    const sTheme = readLocalThemes().find((t) => `${t.id}.css` === aChoice.stylesheet);
    return sTheme?.loginImage ? { id: sTheme.id } : null;
};

export const localThemeChoice = (aTheme: LocalTheme): ThemeChoice => ({ pkg: LOCAL_THEME_PKG, stylesheet: `${aTheme.id}.css`, label: aTheme.label, scheme: aTheme.scheme });

/**
 * The `--neo-*` declarations of a theme's stylesheet, by token name (`bg-primary` → its value).
 * Only names and values that cannot close a declaration or a rule are taken: the text is not trusted.
 */
export const themeVarsOf = (aCss: string): Record<string, string> => {
    const sVars: Record<string, string> = {};
    const sCode = aCss.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of sCode.matchAll(/--neo-([a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
        if (SAFE_TOKEN.test(m[1]) && SAFE_VALUE.test(m[2].trim())) sVars[m[1]] = m[2].trim();
    }
    return sVars;
};

/**
 * A browser theme's stylesheet, rebuilt from its `--neo-*` declarations only: what is kept in
 * localStorage is not trusted as CSS.
 */
export const localThemeCss = (aCss: string): string =>
    `:root { ${Object.entries(themeVarsOf(aCss))
        .map(([k, v]) => `--neo-${k}: ${v};`)
        .join(' ')} }`;

const parseStored = (aRaw: string | null): ThemeChoice | null | undefined => {
    if (aRaw === null) return undefined;
    try {
        const sValue = JSON.parse(aRaw) as Partial<ThemeChoice> | null;
        return sValue ? parseThemeEntry(String(sValue.pkg ?? ''), sValue) : null;
    } catch {
        return null;
    }
};

/** This browser's choice (`neo.theme`), validated again; null: the dark default — and always while themes are off. */
export const readStoredTheme = (): ThemeChoice | null => {
    if (!themesEnabled()) return null;
    try {
        return parseStored(localStorage.getItem(THEME_STORAGE_KEY)) ?? null;
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
 *
 * `reload`: the stylesheet itself changed (the theme builder saved over it). The remembered copy
 * is stale and so may the browser's be: link it again with a cache-busting query.
 */
export const applyTheme = (aChoice: ThemeChoice | null, aOptions?: { reload?: boolean }) => {
    if (aChoice && !themesEnabled()) {
        applyTheme(null);
        return;
    }
    const sRoot = document.documentElement;
    const sOld = document.getElementById(THEME_LINK_ID);
    clearThemePreview();
    if (!aChoice) {
        sOld?.remove();
        setCachedStyle(null);
        delete sRoot.dataset.neoTheme;
        delete sRoot.dataset.neoScheme;
        sRoot.style.removeProperty('color-scheme');
        notify(null);
        return;
    }
    if (aChoice.pkg === LOCAL_THEME_PKG) {
        // In the browser: no request, its text is the stylesheet (on the sign-in page too — the
        // themes are the browser's). One deleted since falls back to the dark defaults.
        const sTheme = readLocalThemes().find((t) => `${t.id}.css` === aChoice.stylesheet);
        sOld?.remove();
        if (!sTheme) {
            applyTheme(null);
            return;
        }
        sRoot.dataset.neoTheme = aChoice.pkg;
        sRoot.dataset.neoScheme = aChoice.scheme;
        sRoot.style.setProperty('color-scheme', aChoice.scheme);
        setCachedStyle(localThemeCss(sTheme.css));
        notify(aChoice);
        return;
    }
    // the remembered copy is kept by path; the link loads from the versioned address
    const sHref = themeStylesheetUrl(aChoice);
    const sSrc = themeStylesheetHref(aChoice);
    sRoot.dataset.neoTheme = aChoice.pkg;
    // for CSS that depends on the scheme, not on a colour (the light icon shades in global.scss)
    sRoot.dataset.neoScheme = aChoice.scheme;
    sRoot.style.setProperty('color-scheme', aChoice.scheme);
    const sReload = aOptions?.reload === true;
    if (!sReload && sOld instanceof HTMLLinkElement && (sOld.dataset.src ?? sOld.getAttribute('href')) === sSrc) {
        notify(aChoice);
        return;
    }
    if (sReload) writeCachedCss(sHref, null);
    setCachedStyle(readCachedCss(sHref));
    const sLink = document.createElement('link');
    sLink.id = THEME_LINK_ID;
    sLink.rel = 'stylesheet';
    sLink.dataset.href = sHref;
    sLink.dataset.src = sSrc;
    sLink.href = sReload ? `${sHref}?v=${Date.now()}` : sSrc;
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

/** Chooses this browser's theme (null: the dark default). */
export const setTheme = (aChoice: ThemeChoice | null, aOptions?: { reload?: boolean }) => {
    try {
        if (aChoice) localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(aChoice));
        else {
            localStorage.removeItem(THEME_STORAGE_KEY);
            localStorage.removeItem(THEME_CSS_STORAGE_KEY);
        }
    } catch {
        // Private mode / quota: the theme still applies for this page.
    }
    applyTheme(aChoice, aOptions);
    tellFrames();
};

/**
 * A package was uninstalled: the theme in use that came from its files goes with it, at once — the
 * page does not go on painting a theme whose package is gone, and reinstalling it does not bring
 * the choice back. This browser's own themes (made in the theme builder, kept here) are the user's
 * and stay: they need no package to be drawn.
 */
export const forgetPackageTheme = (aPkg: string) => {
    // the choice as it is kept, experiment mode on or off: a choice kept while themes are off must
    // not point at a package that is gone when they come back on
    let sChoice: ThemeChoice | null = null;
    try {
        sChoice = parseStored(localStorage.getItem(THEME_STORAGE_KEY)) ?? null;
    } catch {
        sChoice = null;
    }
    if (sChoice && sChoice.pkg !== LOCAL_THEME_PKG && sChoice.pkg === aPkg) setTheme(null);
};

/** Applies the remembered theme. Called before the first render, and after sign-in (the user is known then). */
export const applyStoredTheme = () => applyTheme(readStoredTheme());

/**
 * Signed in: the remembered theme's package may have been updated since it was chosen. Reads its
 * version (`aReadVersion`, the installed package.json) and, when it moved, links the stylesheet
 * from the new address and remembers it — the first paint does not wait for this.
 */
export const refreshStoredThemeVersion = async (aReadVersion: (aPkg: string) => Promise<string>) => {
    const sChoice = readStoredTheme();
    if (!sChoice || sChoice.pkg === LOCAL_THEME_PKG) return;
    const sVersion = await aReadVersion(sChoice.pkg).catch(() => '');
    if (!sVersion || !SAFE_VERSION.test(sVersion) || sVersion === sChoice.version) return;
    // chosen again meanwhile: that choice stands
    const sNow = readStoredTheme();
    if (!sNow || themeKey(sNow) !== themeKey(sChoice)) return;
    setTheme({ ...sNow, version: sVersion });
};

/** The scheme in force: what a component that cannot read CSS variables needs to know. */
export const currentScheme = (): ThemeScheme => (document.documentElement.style.getPropertyValue('color-scheme') === 'light' ? 'light' : 'dark');

// -----------------------------------------------------------------------------
// PREVIEW — colours shown on the whole app without choosing (the theme builder's "try it on")
// -----------------------------------------------------------------------------
// A `<style>` after everything else sets the previewed variables on :root; clearing it (or
// choosing any theme) gives the chosen theme back. Nothing is remembered.

export const THEME_PREVIEW_STYLE_ID = 'neo-theme-preview';
/** A token name as the variables use it (`bg-primary` → `--neo-bg-primary`). */
const SAFE_TOKEN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A colour or shadow value: nothing that could close the declaration or the rule. */
const SAFE_VALUE = /^[^;{}<>\\]{1,200}$/;

let sPreviewBase: { scheme: string | undefined; colorScheme: string } | null = null;

export const previewTheme = (aVars: Record<string, unknown>, aScheme?: ThemeScheme) => {
    if (!themesEnabled()) return;
    const sRoot = document.documentElement;
    const sDecls = Object.entries(aVars)
        .filter((e): e is [string, string] => SAFE_TOKEN.test(e[0]) && typeof e[1] === 'string' && SAFE_VALUE.test(e[1].trim()))
        .map(([k, v]) => `--neo-${k}: ${v.trim()};`);
    if (!sPreviewBase) sPreviewBase = { scheme: sRoot.dataset.neoScheme, colorScheme: sRoot.style.getPropertyValue('color-scheme') };
    const sOld = document.getElementById(THEME_PREVIEW_STYLE_ID);
    const sStyle = sOld instanceof HTMLStyleElement ? sOld : document.createElement('style');
    sStyle.id = THEME_PREVIEW_STYLE_ID;
    sStyle.textContent = `:root { ${sDecls.join(' ')} }`;
    // Last in <head>: over the chosen theme's stylesheet.
    document.head.appendChild(sStyle);
    if (aScheme) {
        sRoot.dataset.neoScheme = aScheme;
        sRoot.style.setProperty('color-scheme', aScheme);
    }
    notify(readStoredTheme());
};

export const clearThemePreview = () => {
    const sStyle = document.getElementById(THEME_PREVIEW_STYLE_ID);
    if (!sStyle && !sPreviewBase) return;
    sStyle?.remove();
    const sRoot = document.documentElement;
    if (sPreviewBase) {
        if (sPreviewBase.scheme === undefined) delete sRoot.dataset.neoScheme;
        else sRoot.dataset.neoScheme = sPreviewBase.scheme;
        if (sPreviewBase.colorScheme) sRoot.style.setProperty('color-scheme', sPreviewBase.colorScheme);
        else sRoot.style.removeProperty('color-scheme');
        sPreviewBase = null;
    }
    notify(readStoredTheme());
};

// -----------------------------------------------------------------------------
// REQUESTS FROM A PACKAGE'S APP — the theme builder runs in an app tab (same-origin iframe)
// -----------------------------------------------------------------------------
//   { type: 'neo-theme', action: 'preview', vars: { 'bg-primary': '#fff', … } | null, scheme? }
//   { type: 'neo-theme', action: 'apply', choice: { pkg, stylesheet, label, scheme } | null, reload? }
// Only from a frame of this page on this origin; the choice is validated like a manifest.
//
// This browser's own themes (THEMES IN THE BROWSER) are read and written here only; the builder asks:
//   { type: 'neo-theme', action: 'themes', request }
//   { type: 'neo-theme', action: 'save', request, theme: { id, label, scheme, css, … }, picture?: Blob | null }
//   { type: 'neo-theme', action: 'delete', request, id }
//   { type: 'neo-theme', action: 'picture', request, id }      — a theme's sign-in picture
// and is answered, in the frame that asked, with what it shows:
//   { type: 'neo-theme', action: 'reply', request, ok, reason?, themes, choice, picture?, edit? }
// Whenever they or the choice change — here or in another tab — every frame is told
// { type: 'neo-theme', action: 'changed' } and asks again.
//
// Settings → Theme can ask for one of the user's themes to be opened in the builder (Edit): the
// builder gets it as `edit: { pkg, stylesheet, … }` with its next `themes` answer — the one it asks
// on opening, or after `changed` when it is open already — and it is then forgotten.

export const THEME_MESSAGE_TYPE = 'neo-theme';

/** A message from an iframe of this page on this origin (an app tab), not from the page itself. */
const fromOwnFrame = (aEvent: MessageEvent) =>
    aEvent.origin === window.location.origin &&
    aEvent.source !== window &&
    Array.from(document.querySelectorAll('iframe')).some((f) => f.contentWindow !== null && f.contentWindow === aEvent.source);

/** Tells every frame of this page on this origin that the user's themes or the choice changed. */
const tellFrames = () => {
    document.querySelectorAll('iframe').forEach((f) => {
        try {
            f.contentWindow?.postMessage({ type: THEME_MESSAGE_TYPE, action: 'changed' }, window.location.origin);
        } catch {
            // a frame being torn down
        }
    });
};

/** What the builder shows: this browser's themes and the theme in use. */
const themesState = () => ({ themes: readLocalThemes(), choice: readStoredTheme() });

/** A theme to open in the theme builder: handed over once; one nobody asks for within a minute lapses. */
let sEditRequest: { choice: ThemeChoice; at: number } | null = null;
const EDIT_REQUEST_TTL_MS = 60_000;

/** Asks the theme builder (open now, or about to be) to open this theme. */
export const editInThemeBuilder = (aChoice: ThemeChoice) => {
    sEditRequest = { choice: { pkg: aChoice.pkg, stylesheet: aChoice.stylesheet, label: aChoice.label, scheme: aChoice.scheme }, at: Date.now() };
    tellFrames();
};

const takeEditRequest = (): ThemeChoice | null => {
    const sRequest = sEditRequest;
    sEditRequest = null;
    return sRequest && Date.now() - sRequest.at < EDIT_REQUEST_TTL_MS ? sRequest.choice : null;
};

const reply = (aEvent: MessageEvent, aRequest: unknown, aResult: { ok: boolean; reason?: string; picture?: Blob | null; edit?: ThemeChoice }) => {
    (aEvent.source as Window | null)?.postMessage({ type: THEME_MESSAGE_TYPE, action: 'reply', request: aRequest, ...aResult, ...themesState() }, window.location.origin);
};

export const handleThemeRequest = (aEvent: MessageEvent) => {
    const sData = aEvent.data as { type?: unknown; action?: unknown; vars?: unknown; scheme?: unknown; choice?: unknown; reload?: unknown; request?: unknown; theme?: unknown; id?: unknown; picture?: unknown } | null;
    if (!sData || typeof sData !== 'object' || sData.type !== THEME_MESSAGE_TYPE || !fromOwnFrame(aEvent)) return;
    const sScheme = sData.scheme === 'light' || sData.scheme === 'dark' ? sData.scheme : undefined;
    // the request id goes back as it came: a number or a short string, nothing else
    const sRequest = typeof sData.request === 'number' || (typeof sData.request === 'string' && sData.request.length <= 64) ? sData.request : null;
    if (!themesEnabled()) {
        // a request is answered with why; a preview or a choice is not taken
        if (sData.action === 'themes' || sData.action === 'save' || sData.action === 'delete' || sData.action === 'picture') reply(aEvent, sRequest, { ok: false, reason: THEMES_OFF_REASON });
        return;
    }
    if (sData.action === 'themes') {
        const sEdit = takeEditRequest();
        reply(aEvent, sRequest, sEdit ? { ok: true, edit: sEdit } : { ok: true });
    } else if (sData.action === 'save') {
        // the picture is a Blob as the frame sent it (structured clone); absent: left as it is
        const sPicture = 'picture' in sData ? sData.picture : undefined;
        void saveLocalTheme(sData.theme, sPicture).then((r) => reply(aEvent, sRequest, r.ok ? { ok: true } : r));
    } else if (sData.action === 'picture') {
        const sId = typeof sData.id === 'string' && SAFE_LOCAL_ID.test(sData.id) ? sData.id : null;
        void (sId ? readThemePicture(sId) : Promise.resolve(null)).then((aBlob) => reply(aEvent, sRequest, { ok: true, picture: aBlob }));
    } else if (sData.action === 'delete') {
        reply(aEvent, sRequest, deleteLocalTheme(sData.id));
    } else if (sData.action === 'preview') {
        if (sData.vars && typeof sData.vars === 'object') previewTheme(sData.vars as Record<string, unknown>, sScheme);
        else clearThemePreview();
    } else if (sData.action === 'apply') {
        if (sData.choice === null) {
            setTheme(null);
            return;
        }
        const sChoice = sData.choice && typeof sData.choice === 'object' ? parseThemeEntry(String((sData.choice as { pkg?: unknown }).pkg ?? ''), sData.choice) : null;
        if (sChoice) setTheme(sChoice, { reload: sData.reload === true });
    }
};

/** Experiment mode turned on or off (sign-in, a login check): the page takes the theme, or the dark defaults, at once. */
const onExperimentChange = () => {
    applyStoredTheme();
    tellFrames();
};

/** Another tab saved, deleted or chose a theme, or signed in with experiment mode turned on or off: the frames here ask again. */
const onThemeStorage = (aEvent: StorageEvent) => {
    if (aEvent.key === LOCAL_STORAGE_EXPERIMENT_KEY) onExperimentChange();
    else if (aEvent.key === null || aEvent.key === THEME_STORAGE_KEY || aEvent.key === LOCAL_THEMES_KEY) tellFrames();
};

/** Listens for the requests above, and for experiment mode turning on or off. Called once at startup; returns the unsubscribe. */
export const listenForThemeRequests = () => {
    window.addEventListener('message', handleThemeRequest);
    window.addEventListener('storage', onThemeStorage);
    window.addEventListener(EXPERIMENT_CHANGE_EVENT, onExperimentChange);
    return () => {
        window.removeEventListener('message', handleThemeRequest);
        window.removeEventListener('storage', onThemeStorage);
        window.removeEventListener(EXPERIMENT_CHANGE_EVENT, onExperimentChange);
    };
};
