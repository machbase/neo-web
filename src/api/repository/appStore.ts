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

const PKG_HUB_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages.json';

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
}

/** Fetch package list from neo-pkg-hub */
export const fetchPkgHubList = async (): Promise<APP_INFO[]> => {
    const res = await fetch(PKG_HUB_URL);
    if (!res.ok) throw new Error(`Failed to fetch pkg hub: ${res.status}`);
    const entries: PkgHubEntry[] = await res.json();
    return entries.map((entry) => {
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
    });
};
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
