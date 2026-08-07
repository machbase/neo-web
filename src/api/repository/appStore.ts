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

interface PkgHubEntry {
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

const mapHubEntry = (entry: PkgHubEntry): APP_INFO => {
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
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch pkg hub: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error(`Malformed pkg hub payload at ${url}`);
    return json;
};

/**
 * Fetch package list from neo-pkg-hub.
 *
 * Reads packages-all.json (every package + `experiment` flag) and falls back to the
 * legacy packages.json when that file is missing — a hub that has not rolled the new
 * file out yet, or a rollback, must not take the whole catalog down. The fallback
 * degrades safely: the legacy view contains no gated package at all, so everything it
 * returns is visible, which is exactly what a client without the flag would show.
 */
export const fetchPkgHubList = async (): Promise<APP_INFO[]> => {
    let entries: PkgHubEntry[];
    try {
        entries = await fetchHubEntries(PKG_HUB_ALL_URL);
    } catch {
        entries = await fetchHubEntries(PKG_HUB_URL);
    }
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
