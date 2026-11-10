// -----------------------------------------------------------------------------
// WHICH HTML A PACKAGE SHIPS — asked once, remembered
// -----------------------------------------------------------------------------
// Three places need the same two answers:
//
//   side.html  → the package has a panel view, so it may have a pill at all
//   main.html  → the package has an app, so a pill click has a tab to open
//
// They used to ask independently and uncached: `MainContent` fetched `side.html`
// on EVERY app-tab selection, `item.tsx` fetched both on every card click, and
// the panel fetched both again whenever the active pill changed. Clicking
// between two pills therefore re-issued requests whose answers cannot change
// without an install or an uninstall.
//
// The cache is keyed by package name and cleared by the lifecycle commands, which
// are the only things that can add or remove these files (see
// `invalidatePkgHtmlCache` callers). In-flight promises are cached too, so N
// simultaneous askers make ONE request rather than N.

import { checkHtmlExists } from './appTabs';

export interface PkgHtml {
    /** `/public/{name}/main.html` exists — the package has an app view. */
    main: boolean;
    /** `/public/{name}/side.html` exists — the package has a panel view. */
    side: boolean;
}

/**
 * The address a package's page is framed at, with the installed version in it
 * (`/public/{name}/main.html?v=1.13.0`). The server sends these files with a
 * Last-Modified date and no Cache-Control, so a browser may keep showing the page
 * it cached before an update — the old page, against the web UI it is now beside —
 * until it decides that copy is stale. A new version is a new address, so an update
 * shows at once. Without a version (the manifest could not be read) the bare path.
 */
export const pkgPageUrl = (pkgName: string, page: 'main.html' | 'side.html', version: string) =>
    `/public/${pkgName}/${page}${version ? `?v=${encodeURIComponent(version)}` : ''}`;

const cache = new Map<string, Promise<PkgHtml>>();

/**
 * Drops every remembered answer.
 *
 * Called after install / update / uninstall, which are the only operations that
 * can change what a package ships. NOT called on catalog refresh: re-probing
 * every package because the hub list was re-fetched would put the request storm
 * back that this cache exists to remove.
 */
export const invalidatePkgHtmlCache = () => {
    cache.clear();
};

/** Forgets one package — used when only that package changed. */
export const invalidatePkgHtml = (pkgName: string) => {
    cache.delete(pkgName);
};

/**
 * NEVER REJECTS. A package that cannot be reached ships nothing as far as the UI
 * is concerned, and both answers are false — which is the safe reading: no pill,
 * and no tab to open onto a 404.
 */
export const probePkgHtml = (pkgName: string): Promise<PkgHtml> => {
    if (!pkgName) return Promise.resolve({ main: false, side: false });
    const hit = cache.get(pkgName);
    if (hit) return hit;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pending = Promise.all([
        checkHtmlExists(`${origin}/public/${pkgName}/main.html`),
        checkHtmlExists(`${origin}/public/${pkgName}/side.html`),
    ])
        .then(([main, side]) => ({ main, side }))
        .catch(() => ({ main: false, side: false }));

    // A FAILED PROBE MUST NOT BE REMEMBERED AS "ships nothing". `checkHtmlExists`
    // swallows network errors into `false`, so a blip during startup would
    // otherwise pin a perfectly good package to "no pill, no app" until the next
    // install. Only an answer with something in it is worth keeping.
    const entry = pending.then((html) => {
        if (!html.main && !html.side) cache.delete(pkgName);
        return html;
    });
    cache.set(pkgName, entry);
    return entry;
};
