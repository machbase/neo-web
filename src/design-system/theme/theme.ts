// -----------------------------------------------------------------------------
// THEMES — the web UI wears the theme state; the Theme Builder writes it
// -----------------------------------------------------------------------------
// Every colour token is `var(--neo-<name>, <dark default>)` (tokens/_themed.scss). With no theme
// none of the variables is set and the dark defaults draw the screen.
//
// The theme in use is state kept in this browser — the browser's, whoever signs in on it, so the
// sign-in page shows it too — and the Theme Builder package is its one writer:
//
//     localStorage "neo.theme.state" = { v: 1, owner, scheme, theme, set, resolved, tokens, loginImage?, at }
//
// (the Theme Builder's contract/state-v1.md). This module only reads it: it wears the values the theme
// sets (`set`) on the page's :root and lets its own CSS fill every other token (the var() fallbacks),
// so the screen is right whatever token list the builder worked `resolved` out with — `resolved` is
// for package apps, which have no such CSS. The web UI knows nothing of the builder beyond the state:
// it does not keep the user's themes, take requests, or choose a theme itself, and the Settings menu
// has no Theme item (it comes back once packages can add to it).
//
// Writing the state is the notification: the browser fires `storage` in every other page of this
// origin, and the page wears the new state at once (another tab included). An uninstall cannot reach a
// browser's storage, so a state whose owner is no longer installed (`/public/<owner>/package.json`
// gone) is ignored: the dark defaults show.
//
// Themes are an experiment: with the server's experiment mode off (`themesEnabled`) the dark
// defaults draw every page, the sign-in page included. The state is kept, and comes back when
// experiment mode is on again.

import { EXPERIMENT_CHANGE_EVENT, isExperimentOn, LOCAL_STORAGE_EXPERIMENT_KEY } from '@/hooks/useExperiment';

/** Whether themes are on: only in experiment mode (the flag the server last gave). */
export const themesEnabled = (): boolean => isExperimentOn();

export type ThemeScheme = 'dark' | 'light';

/** The theme state's key; the Theme Builder writes it, this module reads it. */
export const THEME_STATE_KEY = 'neo.theme.state';
/** The <style> the values the theme sets are worn by. */
export const THEME_STYLE_ID = 'neo-theme-state';
/** Fired on window after the page wears another theme (or the dark defaults): for code that holds resolved colours. */
export const THEME_CHANGE_EVENT = 'neo-theme-change';

/** A package directory name. */
const SAFE_PKG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** A `--neo-*` name without the prefix. */
const SAFE_TOKEN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A colour or shadow value: nothing that could close the declaration or the rule. */
const SAFE_VALUE = /^[^;{}<>\\]{1,200}$/;
/** A key the Theme Builder keeps a sign-in picture under. */
const SAFE_PICTURE = /^[a-z0-9][a-z0-9-]{0,47}$/;

// -----------------------------------------------------------------------------
// PACKAGES THAT DECLARE A THEME — what the App Store shows of them
// -----------------------------------------------------------------------------

const neoThemeOf = (aManifest: unknown): Record<string, unknown> | null => {
    const sTheme = (aManifest as { neoTheme?: unknown } | null)?.neoTheme;
    return sTheme && typeof sTheme === 'object' && !Array.isArray(sTheme) ? (sTheme as Record<string, unknown>) : null;
};

/** The package declares a theme (`neoTheme` in its package.json): a theme package, which has no service of its own. */
export const declaresTheme = (aPkg: string, aManifest: unknown): boolean => SAFE_PKG.test(aPkg) && neoThemeOf(aManifest) !== null;

// -----------------------------------------------------------------------------
// THE THEME STATE — read, checked, worn
// -----------------------------------------------------------------------------

export interface ThemeState {
    /** The package that wrote it (the Theme Builder). */
    owner: string;
    scheme: ThemeScheme;
    /** What was chosen, for showing it. */
    theme: { pkg: string; stylesheet: string; label: string };
    /** The values the theme sets, by token name (`bg-primary` is `--neo-bg-primary`). */
    set: Record<string, string>;
    /** The sign-in picture, kept by the owner in IndexedDB (themePicture.ts). */
    loginImage?: { picture: string };
    /** When it was written (ms). */
    at: number;
}

/** `{ token: value }` with names and values that cannot leave a declaration; other pairs dropped. */
const safeVars = (aValue: unknown): Record<string, string> | null => {
    if (!aValue || typeof aValue !== 'object' || Array.isArray(aValue)) return null;
    const sOut: Record<string, string> = {};
    for (const [k, v] of Object.entries(aValue).slice(0, 512)) {
        if (SAFE_TOKEN.test(k) && typeof v === 'string' && SAFE_VALUE.test(v.trim())) sOut[k] = v.trim();
    }
    return sOut;
};

/** The state, checked again (storage is anyone's to edit); null: none, or not one this web UI reads. */
export const parseThemeState = (aValue: unknown): ThemeState | null => {
    if (!aValue || typeof aValue !== 'object') return null;
    const s = aValue as Record<string, unknown>;
    if (s.v !== 1 || typeof s.owner !== 'string' || !SAFE_PKG.test(s.owner)) return null;
    const sSet = safeVars(s.set);
    const sTheme = s.theme as Record<string, unknown> | null;
    if (!sSet || !sTheme || typeof sTheme !== 'object') return null;
    const sPicture = (s.loginImage as { picture?: unknown } | null)?.picture;
    return {
        owner: s.owner,
        scheme: s.scheme === 'light' ? 'light' : 'dark',
        theme: {
            pkg: typeof sTheme.pkg === 'string' ? sTheme.pkg : '',
            stylesheet: typeof sTheme.stylesheet === 'string' ? sTheme.stylesheet : '',
            label: typeof sTheme.label === 'string' ? sTheme.label.slice(0, 80) : '',
        },
        set: sSet,
        ...(typeof sPicture === 'string' && SAFE_PICTURE.test(sPicture) ? { loginImage: { picture: sPicture } } : {}),
        at: typeof s.at === 'number' && Number.isFinite(s.at) ? s.at : 0,
    };
};

/** The state as kept; null when there is none (whether themes are on is not asked here). */
export const readThemeState = (): ThemeState | null => {
    try {
        return parseThemeState(JSON.parse(localStorage.getItem(THEME_STATE_KEY) ?? 'null'));
    } catch {
        return null;
    }
};

/** A state whose owner was found not installed: `owner@at`, so a new state is looked at again. */
let sIgnored: string | null = null;
/** States whose owner was looked for already. */
const sChecked = new Set<string>();
const stateId = (aState: ThemeState) => `${aState.owner}@${aState.at}`;

/** The theme the page should wear now; null: the dark defaults. */
export const themeInUse = (): ThemeState | null => {
    if (!themesEnabled()) return null;
    const sState = readThemeState();
    return sState && stateId(sState) !== sIgnored ? sState : null;
};

/** The sign-in picture of the theme in use, by the key it is kept under; null: the web UI's own. */
export const themeLoginPicture = (): string | null => themeInUse()?.loginImage?.picture ?? null;

let sWorn: string | null = null;

/**
 * Puts the document in the theme in use (or the dark defaults): the values the theme sets on :root,
 * its scheme on <html> (`data-neo-scheme`, `color-scheme`). Fires THEME_CHANGE_EVENT when that
 * changed, so code that holds resolved colours — the editor, charts — reads them again.
 */
export const applyThemeState = () => {
    const sState = themeInUse();
    const sKey = sState ? `${sState.scheme}|${JSON.stringify(sState.set)}` : '';
    if (sKey === sWorn) return;
    sWorn = sKey;
    const sRoot = document.documentElement;
    const sOld = document.getElementById(THEME_STYLE_ID);
    if (!sState) {
        sOld?.remove();
        delete sRoot.dataset.neoScheme;
        sRoot.style.removeProperty('color-scheme');
    } else {
        const sStyle = sOld instanceof HTMLStyleElement ? sOld : document.createElement('style');
        sStyle.id = THEME_STYLE_ID;
        sStyle.textContent = `:root { ${Object.entries(sState.set)
            .map(([k, v]) => `--neo-${k}: ${v};`)
            .join(' ')} }`;
        // last in <head>: after every app stylesheet
        if (!sStyle.isConnected) document.head.appendChild(sStyle);
        sRoot.dataset.neoScheme = sState.scheme;
        sRoot.style.setProperty('color-scheme', sState.scheme);
    }
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: sState ? { scheme: sState.scheme } : null }));
};

/**
 * Looks whether the owner of the state in use is still installed; when it is not (its package.json
 * answers 404) the state is ignored and the dark defaults show. Each state is looked at once;
 * `aPkg`: a package was just uninstalled — look again when it is the owner. A failed request
 * (offline) changes nothing.
 */
export const checkThemeOwner = async (aPkg?: string) => {
    let sState: ThemeState | null = null;
    try {
        sState = themesEnabled() ? readThemeState() : null;
    } catch {
        return;
    }
    if (!sState) return;
    const sId = stateId(sState);
    if (aPkg !== undefined) {
        if (aPkg !== sState.owner) return;
        sChecked.delete(sId);
    }
    if (sChecked.has(sId)) return;
    sChecked.add(sId);
    try {
        const sRes = await fetch(`/public/${encodeURIComponent(sState.owner)}/package.json`, { cache: 'no-store' });
        if (sRes.status === 404) {
            sIgnored = sId;
            applyThemeState();
        }
    } catch {
        sChecked.delete(sId);
    }
};

/** The scheme in force: what a component that cannot read CSS variables needs to know. */
export const currentScheme = (): ThemeScheme => (document.documentElement.style.getPropertyValue('color-scheme') === 'light' ? 'light' : 'dark');

/**
 * Follows the state: another page (the Theme Builder, another tab) wrote it, or experiment mode
 * turned on or off. Called once at startup; returns the unsubscribe.
 */
export const listenForThemeState = () => {
    const sOnStorage = (aEvent: StorageEvent) => {
        if (aEvent.key === null || aEvent.key === THEME_STATE_KEY || aEvent.key === LOCAL_STORAGE_EXPERIMENT_KEY) {
            applyThemeState();
            void checkThemeOwner();
        }
    };
    const sOnExperiment = () => {
        applyThemeState();
        void checkThemeOwner();
    };
    window.addEventListener('storage', sOnStorage);
    window.addEventListener(EXPERIMENT_CHANGE_EVENT, sOnExperiment);
    return () => {
        window.removeEventListener('storage', sOnStorage);
        window.removeEventListener(EXPERIMENT_CHANGE_EVENT, sOnExperiment);
    };
};

/** Tests start from nothing worn and nothing looked at. */
export const resetThemeStateForTests = () => {
    sWorn = null;
    sIgnored = null;
    sChecked.clear();
};
