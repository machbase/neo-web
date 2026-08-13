import request from '@/api/core';
import type { PkgVersionInfo } from '@/utils/version/utils';

/** Get pkgs list */
export const getSearchPkgs = (name?: string | undefined, possible: number | undefined = 100) => {
    let sParameter: string = '';
    if (!name) sParameter = 'search';
    else sParameter = `search?name=${name}&possibles=${possible}`;
    return request({
        method: 'GET',
        url: `/api/pkgs/${sParameter}`,
    });
};
/** Update request pkgs */
export const getPkgsSync = () => {
    return request({
        method: 'GET',
        url: `/api/pkgs/update`,
    });
};

// issue #1438 — the hub publishes two files.
//
//   packages.json      non-experiment packages ONLY. The LEGACY VIEW: builds that
//                      predate the experiment gate read this and nothing else, so a
//                      package still under validation can never reach them.
//   packages-all.json  every package, each carrying its `experiment` flag.
//
// This client reads packages-all.json and filters locally. That is deliberately ONE
// fetch rather than a merge of both files: raw.githubusercontent caches each file
// independently (max-age=300), so merging would let a package in transition appear
// in both responses (duplicate card, duplicate React key) or in neither (card
// silently missing) for up to five minutes.
const PKG_HUB_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages.json';
const PKG_HUB_ALL_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages-all.json';

// issue #1452 — offline hardening of the hub leg.
//
// On an air-gapped server `fetch` to raw.githubusercontent does not fail fast: it
// hangs until the browser's own connect timeout (tens of seconds on some proxy
// setups), and there is no way to shorten that other than aborting it ourselves.
/** Per-request abort deadline. Both hub urls get their own budget. */
export const HUB_FETCH_TIMEOUT_MS = 4000;
/**
 * How long the hub leg stays "known down" after a complete failure.
 *
 * The App Store re-runs the whole catalog build on a 500ms search debounce, so
 * without this every keystroke would pay the abort deadline twice (all + legacy
 * fallback) before the local sources could render. The window is deliberately
 * much longer than the debounce and shorter than a plausible "I plugged the
 * network back in" gap; a manual Refresh clears it outright via
 * `resetPkgHubBackoff`.
 *
 * NOTE: `navigator.onLine` is NOT part of this decision and must never be. A
 * machine on a corporate LAN reports online while GitHub is unreachable, and a
 * VPN-only host can report offline while the hub is proxied and fine. The only
 * signal that means anything here is whether the fetch itself succeeded.
 */
export const HUB_FAILURE_BACKOFF_MS = 30000;
/** Thrown (not fetched) while the backoff window is open. */
export const HUB_BACKOFF_MESSAGE = 'pkg hub unreachable (backoff)';

let hubBackoffUntil = 0;

/**
 * Drop the failure backoff so the very next call hits the network again.
 *
 * Wired to the catalog's explicit Refresh button: an unprompted retry storm is
 * what the backoff exists to prevent, but a user who just reconnected and
 * pressed Refresh is asking for exactly one retry and must not be told to wait.
 * Also used by tests to isolate the module-level window.
 */
export const resetPkgHubBackoff = () => {
    hubBackoffUntil = 0;
};

/** True while the hub is being skipped because a recent attempt failed. */
export const isPkgHubBackedOff = () => Date.now() < hubBackoffUntil;

// Exported for issue #1452 (offline catalog): the local-archive index publishes
// entries in exactly this shape, and `onpremCatalog.ts` aliases this type rather
// than restating it so the two cannot drift apart.
export interface PkgHubEntry {
    name: string;
    description: string;
    version?: string;
    icon?: string;
    docs?: string;
    homepage?: string;
    github: {
        organization: string;
        repo: string;
        full_name: string;
        html_url: string;
        default_branch: string;
        language: string;
        license: GITHUB_LICENSE | null;
        stargazers_count: number;
        forks_count: number;
    };
    // Migration: hub will switch from `pushed_at` to `released_at`. Accept both
    // until rollout completes.
    released_at?: string;
    pushed_at?: string;
    // issue #1369: per-version minServer map. Present on the migrated hub schema.
    // The top-level `version`/`released_at` above stay as a mirror of the latest
    // entry for transition-window compatibility with the pre-versions[] code path.
    versions?: PkgVersionInfo[];
    // issue #1438: catalog visibility gate. Only ever true in packages-all.json.
    // The legacy view publishes it as `false` on every entry (its entry schema is
    // identical by design), and a hub that predates the gate omits it entirely —
    // both are falsy, which the checks below read as "always visible".
    experiment?: boolean;
}

/**
 * Map a catalog entry (hub OR local archive, issue #1452) to the card model.
 *
 * Exported so the offline merge reuses this exact function. Writing a second
 * mapper for local entries is the trap: the only place `entry.description`
 * reaches the UI is `github.description` below — the source entry has the field
 * at the top level, the card model has it nested. A hand-rolled mapper that
 * copies `github` across verbatim leaves `github.description` undefined, and
 * `AppStore/index.tsx:101` (and `usePkgCommand.ts:163`) call
 * `pkg.github.description.toLowerCase()` with no guard, so the catalog renders
 * fine and then throws a TypeError the moment anyone types in the search box.
 */
export const mapHubEntry = (entry: PkgHubEntry): APP_INFO => {
    // Transition window: a hub still on the old single-`version` shape has no
    // versions[]. Synthesize a one-element list with an empty minServer (no
    // constraint → always eligible) so downstream eligibility logic is uniform.
    const versions: PkgVersionInfo[] =
        Array.isArray(entry.versions) && entry.versions.length > 0
            ? entry.versions.map((v) => ({ version: v.version, minServer: v.minServer ?? '', released_at: v.released_at }))
            : entry.version
              ? [{ version: entry.version, minServer: '', released_at: entry.released_at ?? entry.pushed_at }]
              : [];
    return {
        name: entry.name,
        icon: entry.icon,
        docs: entry.docs,
        latest_version: entry.version ?? versions[0]?.version ?? '',
        published_at: entry.released_at ?? entry.pushed_at ?? '',
        versions,
        experiment: entry.experiment,
        github: {
            organization: entry.github.organization,
            repo: entry.github.repo,
            full_name: entry.github.full_name,
            description: entry.description,
            default_branch: entry.github.default_branch,
            forks_count: entry.github.forks_count,
            homepage: entry.homepage,
            language: entry.github.language,
            stargazers_count: entry.github.stargazers_count,
            license: entry.github.license,
        },
    };
};

const fetchHubEntries = async (url: string): Promise<PkgHubEntry[]> => {
    // AbortController, not Promise.race: racing a timer would leave the socket
    // open and the response still arriving in the background, so an offline
    // server would accumulate one hung request per keystroke.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HUB_FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch pkg hub: ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error(`Malformed pkg hub payload at ${url}`);
        return json;
    } finally {
        clearTimeout(timer);
    }
};

/**
 * Fetch package list from neo-pkg-hub.
 *
 * Reads packages-all.json (every package + `experiment` flag) and falls back to the
 * legacy packages.json when that file is missing — a hub that has not rolled the new
 * file out yet, or a rollback, must not take the whole catalog down. The fallback
 * degrades safely: the legacy view contains no gated package at all, so everything it
 * returns is visible, which is exactly what a client without the flag would show.
 *
 * STILL REJECTS when both sources fail — but rejection no longer means "the catalog
 * is empty". `buildCatalog` (components/side/AppStore/catalog.ts) treats this leg as
 * one settled source among three and renders the local archive + installed packages
 * without it. Callers must not fall back to clearing the list (issue #1452).
 */
export const fetchPkgHubList = async (): Promise<APP_INFO[]> => {
    if (isPkgHubBackedOff()) throw new Error(HUB_BACKOFF_MESSAGE);
    let entries: PkgHubEntry[];
    try {
        entries = await fetchHubEntries(PKG_HUB_ALL_URL);
    } catch {
        try {
            entries = await fetchHubEntries(PKG_HUB_URL);
        } catch (e) {
            // Both urls are gone: assume the host is unreachable rather than that
            // two files vanished, and stop hammering it until the window closes.
            hubBackoffUntil = Date.now() + HUB_FAILURE_BACKOFF_MS;
            throw e;
        }
    }
    hubBackoffUntil = 0; // reachable again
    return entries.map(mapHubEntry);
};

/**
 * Catalog visibility gate (issue #1438). An `experiment` package is listed only
 * while the server's experiment mode is on — unless it is already installed.
 *
 * The installed exemption is not cosmetic. `allPkgs` is derived from the hub list
 * alone: installed packages are hub entries tagged with `installed_frontend`, and
 * the `installed` bucket of SEARCH_RES is always left empty. Dropping the entry
 * would therefore erase the card outright, stranding a package that is still
 * installed and running with no uninstall or stop control anywhere in the UI.
 */
export const filterExperimentPkgs = (pkgs: APP_INFO[], experimentOn: boolean): APP_INFO[] =>
    pkgs.filter((p) => !p.experiment || experimentOn || !!p.installed_frontend);

/**
 * True for a card that survives the gate only because the package is already
 * installed. Such a card must stay removable but must not invite further change:
 * the package was pulled back for revalidation, so offering its newer unvalidated
 * versions to a non-experiment user defeats the point of pulling it back.
 */
export const isGrandfatheredPkg = (pkg: APP_INFO | undefined | null, experimentOn: boolean): boolean =>
    !!pkg?.experiment && !experimentOn && !!pkg?.installed_frontend;
/** Install & Uninstall pkg */
export const getCommandPkgs = (command: INSTALL | UNINSTALL, name: string) => {
    return request({
        method: 'GET',
        url: `/api/pkgs/${command}/${name}`,
    });
};
/** Get pkg Markdown (raw.github) */
export const getPkgMarkdown = async (aPath: string) => {
    const gitRawUrl = `https://raw.githubusercontent.com/${aPath}`;
    return await fetch(gitRawUrl).then((res) => res.text());
};
/** Get Pkg action */
export const getPkgAction = async (aPkgName: string, aAction: PKG_ACTION) => {
    return request({
        method: 'GET',
        url: `/api/pkgs/process/${aPkgName}/${aAction}`,
    });
};

// TYPES
export type INSTALL = 'install';
export type UNINSTALL = 'uninstall';
export type PKG_STATUS = 'EXACT' | 'POSSIBLE' | 'BROKEN';
export type PKG_ACTION = 'status' | 'start' | 'stop';
// INTERFACES
export interface SEARCH_RES {
    installed: null | APP_INFO[];
    broken: null | APP_INFO[];
    exact: null | APP_INFO[];
    possibles: null | APP_INFO[];
}
export interface APP_INFO {
    name: string;
    icon?: string;
    docs?: string;
    latest_version: string;
    published_at: string;
    github: APP_GITHUB;
    // issue #1369: per-version minServer map from the hub (or a synthesized
    // single element for the old single-version shape). Drives eligibility +
    // the version-selection picker.
    versions?: PkgVersionInfo[];
    // issue #1438: catalog visibility gate, sourced from the hub entry. Falsy for
    // everything read via the legacy packages.json fallback (`false` there, or
    // undefined on a pre-gate hub). Consumed by `filterExperimentPkgs` and
    // `isGrandfatheredPkg`.
    experiment?: boolean;
    installed_version?: string;
    installed_frontend?: boolean;
    // Mirror of manifest.packageService — only populated for installed packages
    // by `pkgsSearch` (index.tsx) and post-command refresh (usePkgCommand.ts),
    // which read /public/{name}/package.json. Hub entries (fetchPkgHubList) and
    // not-installed packages leave this undefined. Consumed by item.tsx /
    // info.tsx to decide between the RunSwitch and the ServiceSummaryChip.
    installed_packageService?: { managed: boolean; reason?: string };
    // issue #1452: FILE NAME of the icon shipped by the installed copy, e.g.
    // `icon.svg` — read off the server by the archive scan, never guessed from the
    // package name. Three-valued, exactly like the scan field it comes from
    // (`getInstalledIcons` in onpremCatalog.ts):
    //   'icon.svg'  → `/public/{name}/icon.svg`
    //   ''          → the scan looked and this package ships NO icon (no request)
    //   undefined   → not known (not installed, or no scan) → the `icon.png` guess
    // Consumed by item.tsx / info.tsx, which pass it to `PkgIcon`.
    installed_icon?: string;
    /**
     * issue #1452 — THIS CARD IS NOT AN INSTALL. Set only on the cards
     * `buildCatalog` synthesizes for a `/public/` directory that holds an
     * identifiable package which was never installed through the App Store (an
     * archive somebody unpacked by hand, or a developer's clone).
     *
     * `installed_frontend` IS DELIBERATELY LEFT UNSET on these. It drives
     * Uninstall / Start / Stop / Update everywhere in the panel, and none of those
     * mean anything for a tree whose `scripts.install` never ran — offering them
     * would be a lie about the server's state. `item.tsx` keys off THIS field to
     * render the stripped-down card instead.
     *
     * The rule that produces it lives in `strayDirs.ts`; see that file for why a
     * hand-unpacked copy is a live unmanaged backend and not a leftover.
     */
    stray?: StrayDirCard;
}

/** The `/public/` directory behind a stray card (issue #1452). */
export interface StrayDirCard {
    /**
     * The DIRECTORY name, which is NOT `APP_INFO.name` (that is what the package
     * calls itself). Everything about this card that touches the filesystem — the
     * path shown to the user, the icon lookup, the removal — must use this.
     */
    dir: string;
    /**
     * May the card offer `Remove directory`? False for a git clone and for any
     * directory whose `.git` state could not be established.
     */
    removable: boolean;
    /**
     * A properly installed copy of the SAME package exists as well.
     *
     * Both cards are rendered when this is true, and both are correct: the two
     * trees are both on disk and both served. Merging them would leave the user
     * unable to tell which directory a button acts on.
     */
    duplicate: boolean;
}
export interface APP_GITHUB {
    organization: string;
    repo: string;
    full_name: string;
    description: string;
    default_branch: string;
    forks_count: number;
    homepage?: string;
    language: string;
    stargazers_count: number;
    license: GITHUB_LICENSE | null;
}
export interface GITHUB_LICENSE {
    key: string;
    name: string;
    node_id: string;
    spdx_id: string;
    url: string;
}
