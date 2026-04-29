import request from '@/api/core';

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
}

/** Fetch package list from neo-pkg-hub */
export const fetchPkgHubList = async (): Promise<APP_INFO[]> => {
    const res = await fetch(PKG_HUB_URL);
    if (!res.ok) throw new Error(`Failed to fetch pkg hub: ${res.status}`);
    const entries: PkgHubEntry[] = await res.json();
    return entries.map((entry) => ({
        name: entry.name,
        icon: entry.icon,
        docs: entry.docs,
        latest_version: entry.version ?? '',
        published_at: entry.released_at ?? entry.pushed_at ?? '',
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
    }));
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
    installed_version?: string;
    installed_frontend?: boolean;
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
