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
// A theme can also live in the browser: the theme builder saves a user's own themes in
// localStorage (`neo.themes.<user>`, pkg `@local`), so nobody else — another account on the same
// server included — can change them. The choice is kept per user too (`neo.theme.<user>`), with
// the browser's last choice (`neo.theme`) for the sign-in page, before the user is known.
//
// A package can hold several themes instead: `"neoTheme": { "index": ["themes.json", …] }`
// names JSON files listing `{ id, label, stylesheet, scheme }` entries (the theme builder
// package keeps its presets in one and the themes it saves in another). A theme is then told
// apart by package AND stylesheet (`themeKey`), not by package alone.
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
/** A file inside the package: relative segments, no `..`, no scheme, ending in `.<ext>`. */
const safeFile = (aExt: string) => new RegExp(`^(?!.*(^|\\/)\\.\\.?(\\/|$))[A-Za-z0-9._-]+(\\/[A-Za-z0-9._-]+)*\\.${aExt}$`);
const SAFE_STYLESHEET = safeFile('css');
const SAFE_INDEX = safeFile('json');

/** One theme: `{ label, stylesheet, scheme }` from a manifest's `neoTheme` or an index entry. */
export const parseThemeEntry = (aPkg: string, aEntry: unknown): ThemeChoice | null => {
    if ((aPkg !== LOCAL_THEME_PKG && !SAFE_PKG.test(aPkg)) || !aEntry || typeof aEntry !== 'object') return null;
    const { label, stylesheet, scheme } = aEntry as Record<string, unknown>;
    if (typeof stylesheet !== 'string' || !SAFE_STYLESHEET.test(stylesheet)) return null;
    return {
        pkg: aPkg,
        stylesheet,
        label: typeof label === 'string' && label.trim() ? label.trim() : aPkg,
        scheme: scheme === 'light' ? 'light' : 'dark',
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

/** Does this package.json declare a theme — one stylesheet or an index of them? (A theme package has no service.) */
export const declaresTheme = (aPkg: string, aManifest: unknown): boolean => parseThemeManifest(aPkg, aManifest) !== null || (SAFE_PKG.test(aPkg) && themeIndexFiles(aManifest).length > 0);

/** The themes an index file lists: a JSON array of entries (or `{ themes: [...] }`); unusable entries are dropped. */
export const parseThemeIndex = (aPkg: string, aIndex: unknown): ThemeChoice[] => {
    const sList = Array.isArray(aIndex) ? aIndex : aIndex && typeof aIndex === 'object' ? (aIndex as { themes?: unknown }).themes : null;
    if (!Array.isArray(sList)) return [];
    return sList.map((e) => parseThemeEntry(aPkg, e)).filter((t): t is ThemeChoice => t !== null);
};

/** What tells two themes apart: one package can hold several. */
export const themeKey = (aChoice: Pick<ThemeChoice, 'pkg' | 'stylesheet'>) => `${aChoice.pkg}/${aChoice.stylesheet}`;

export const themeStylesheetUrl = (aChoice: ThemeChoice) => `/public/${encodeURIComponent(aChoice.pkg)}/${aChoice.stylesheet.split('/').map(encodeURIComponent).join('/')}`;

// -----------------------------------------------------------------------------
// THEMES IN THE BROWSER — a user's own, saved by the theme builder
// -----------------------------------------------------------------------------

/** The `pkg` of a theme kept in the browser; its `stylesheet` is `<id>.css`. Not a package name (`@`). */
export const LOCAL_THEME_PKG = '@local';
/** `neo.themes.<user>`: the user's own themes, `[{ id, label, scheme, css, swatch?, note? }]`. */
export const LOCAL_THEMES_KEY = 'neo.themes';

export interface LocalTheme {
    id: string;
    label: string;
    scheme: ThemeScheme;
    /** Only `--neo-*` declarations are taken from it (`localThemeCss`). */
    css: string;
    swatch: string[];
    note: string;
}

const SAFE_LOCAL_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;

/** The signed-in user (the token's `sub`), to keep themes per user; null before sign-in. */
export const themeUser = (): string | null => {
    try {
        const sToken = localStorage.getItem('accessToken');
        const sPart = sToken?.split('.')[1];
        if (!sPart) return null;
        const sClaims = JSON.parse(atob(sPart.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
        return typeof sClaims.sub === 'string' && sClaims.sub ? sClaims.sub.toLowerCase() : null;
    } catch {
        return null;
    }
};

/** The user's own themes, validated (localStorage is anyone's to edit). */
export const readLocalThemes = (aUser: string | null = themeUser()): LocalTheme[] => {
    if (!aUser) return [];
    try {
        const sList = JSON.parse(localStorage.getItem(`${LOCAL_THEMES_KEY}.${aUser}`) ?? '[]') as unknown;
        if (!Array.isArray(sList)) return [];
        return sList.flatMap((e): LocalTheme[] => {
            if (!e || typeof e !== 'object') return [];
            const { id, label, scheme, css, swatch, note } = e as Record<string, unknown>;
            if (typeof id !== 'string' || !SAFE_LOCAL_ID.test(id) || typeof css !== 'string' || css.length > 65536) return [];
            return [
                {
                    id,
                    label: typeof label === 'string' && label.trim() ? label.trim() : id,
                    scheme: scheme === 'light' ? 'light' : 'dark',
                    css,
                    swatch: Array.isArray(swatch) ? swatch.filter((c): c is string => typeof c === 'string').slice(0, 8) : [],
                    note: typeof note === 'string' ? note.slice(0, 24) : '',
                },
            ];
        });
    } catch {
        return [];
    }
};

export const localThemeChoice = (aTheme: LocalTheme): ThemeChoice => ({ pkg: LOCAL_THEME_PKG, stylesheet: `${aTheme.id}.css`, label: aTheme.label, scheme: aTheme.scheme });

/**
 * A browser theme's stylesheet, rebuilt from its `--neo-*` declarations only: what is kept in
 * localStorage is not trusted as CSS.
 */
export const localThemeCss = (aCss: string): string => {
    const sDecls: string[] = [];
    const sCode = aCss.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of sCode.matchAll(/--neo-([a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
        if (SAFE_TOKEN.test(m[1]) && SAFE_VALUE.test(m[2].trim())) sDecls.push(`--neo-${m[1]}: ${m[2].trim()};`);
    }
    return `:root { ${sDecls.join(' ')} }`;
};

const userChoiceKey = (aUser: string) => `${THEME_STORAGE_KEY}.${aUser}`;

const parseStored = (aRaw: string | null): ThemeChoice | null | undefined => {
    if (aRaw === null) return undefined;
    try {
        const sValue = JSON.parse(aRaw) as Partial<ThemeChoice> | null;
        return sValue ? parseThemeEntry(String(sValue.pkg ?? ''), sValue) : null;
    } catch {
        return null;
    }
};

/**
 * The remembered choice, validated again: the signed-in user's own (`neo.theme.<user>`, Dark
 * included), else the browser's last (`neo.theme`) — all there is on the sign-in page.
 */
export const readStoredTheme = (): ThemeChoice | null => {
    try {
        const sUser = themeUser();
        const sMine = sUser ? parseStored(localStorage.getItem(userChoiceKey(sUser))) : undefined;
        if (sMine !== undefined) return sMine;
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
        // In the browser: no request, its text is the stylesheet. Before sign-in only the
        // remembered copy is there; a theme its user deleted falls back to the dark defaults.
        const sKey = `local:${aChoice.stylesheet}`;
        const sTheme = readLocalThemes().find((t) => `${t.id}.css` === aChoice.stylesheet);
        // The remembered copy only stands in before sign-in; a signed-in user without it deleted it.
        const sCss = sTheme ? localThemeCss(sTheme.css) : themeUser() ? null : readCachedCss(sKey);
        sOld?.remove();
        if (sCss === null) {
            writeCachedCss(sKey, null);
            applyTheme(null);
            return;
        }
        sRoot.dataset.neoTheme = aChoice.pkg;
        sRoot.dataset.neoScheme = aChoice.scheme;
        sRoot.style.setProperty('color-scheme', aChoice.scheme);
        setCachedStyle(sCss);
        writeCachedCss(sKey, sCss);
        notify(aChoice);
        return;
    }
    const sHref = themeStylesheetUrl(aChoice);
    sRoot.dataset.neoTheme = aChoice.pkg;
    // for CSS that depends on the scheme, not on a colour (see .neo-type-icon in global.scss)
    sRoot.dataset.neoScheme = aChoice.scheme;
    sRoot.style.setProperty('color-scheme', aChoice.scheme);
    const sReload = aOptions?.reload === true;
    if (!sReload && sOld instanceof HTMLLinkElement && (sOld.dataset.href ?? sOld.getAttribute('href')) === sHref) {
        notify(aChoice);
        return;
    }
    if (sReload) writeCachedCss(sHref, null);
    setCachedStyle(readCachedCss(sHref));
    const sLink = document.createElement('link');
    sLink.id = THEME_LINK_ID;
    sLink.rel = 'stylesheet';
    sLink.dataset.href = sHref;
    sLink.href = sReload ? `${sHref}?v=${Date.now()}` : sHref;
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

/** Chooses a theme for the signed-in user and as this browser's last (null: the dark default). */
export const setTheme = (aChoice: ThemeChoice | null, aOptions?: { reload?: boolean }) => {
    try {
        const sUser = themeUser();
        if (sUser) localStorage.setItem(userChoiceKey(sUser), JSON.stringify(aChoice));
        if (aChoice) localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(aChoice));
        else {
            localStorage.removeItem(THEME_STORAGE_KEY);
            localStorage.removeItem(THEME_CSS_STORAGE_KEY);
        }
    } catch {
        // Private mode / quota: the theme still applies for this page.
    }
    applyTheme(aChoice, aOptions);
};

/** Applies the remembered theme. Called before the first render, and after sign-in (the user is known then). */
export const applyStoredTheme = () => applyTheme(readStoredTheme());

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

export const THEME_MESSAGE_TYPE = 'neo-theme';

const fromOwnFrame = (aEvent: MessageEvent) =>
    aEvent.origin === window.location.origin &&
    aEvent.source !== window &&
    Array.from(document.querySelectorAll('iframe')).some((f) => f.contentWindow !== null && f.contentWindow === aEvent.source);

export const handleThemeRequest = (aEvent: MessageEvent) => {
    const sData = aEvent.data as { type?: unknown; action?: unknown; vars?: unknown; scheme?: unknown; choice?: unknown; reload?: unknown } | null;
    if (!sData || typeof sData !== 'object' || sData.type !== THEME_MESSAGE_TYPE || !fromOwnFrame(aEvent)) return;
    const sScheme = sData.scheme === 'light' || sData.scheme === 'dark' ? sData.scheme : undefined;
    if (sData.action === 'preview') {
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

/** Listens for the requests above. Called once at startup; returns the unsubscribe. */
export const listenForThemeRequests = () => {
    window.addEventListener('message', handleThemeRequest);
    return () => window.removeEventListener('message', handleThemeRequest);
};
