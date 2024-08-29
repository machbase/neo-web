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
export type IMG_URL = string;
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
    github: APP_GITHUB;
    latest_release: string;
    latest_release_size: number;
    latest_release_tag: string;
    latest_version: string;
    name: string;
    published_at: string;
    strip_components: number;
    installed_path: string;
    installed_version: string;
    installed_backend: boolean;
    installed_frontend: boolean;
    work_in_progress: boolean;
}
export interface APP_GITHUB {
    license: GITHUB_LICENSE | null;
    owner: GIHUB_OWNER | null;
    default_branch: string;
    description: string;
    forks: number;
    forks_count: number;
    full_name: string;
    homepage: string;
    language: string;
    name: string;
    organization: string;
    private: boolean;
    repo: string;
    stargazers_count: number;
}
export interface GIHUB_OWNER {
    avatar_url: IMG_URL;
    gravatar_id: string;
    html_url: string;
    id: number;
    login: string;
    node_id: string;
    organizations_url: string;
    site_admin: boolean;
    subscriptions_url: string;
    type: string;
    url: string;
}
export interface GITHUB_LICENSE {
    key: string;
    name: string;
    node_id: string;
    spdx_id: string;
    url: string;
}
