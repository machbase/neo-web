import { SEARCH_RES } from '@/api/repository/appStore';
import { atom, selector } from 'recoil';
/** pkgs origin list */
export const gSearchPkgs = atom({
    key: 'gSearchPkgs',
    default: {
        installed: [],
        exact: [],
        possibles: [],
        broken: [],
    } as SEARCH_RES,
});
/** Installed pkgs */
export const gInstalledPkgs = selector({
    key: 'gInstalledPkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).installed ?? [];
    },
});
/** Exact (Usable) pkgs */
export const gExactPkgs = selector({
    key: 'gExactPkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).exact ?? [];
    },
});
/** Possibles pkgs */
export const gPossiblePkgs = selector({
    key: 'gPossiblePkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).possibles ?? [];
    },
});
/** Broken pkgs */
export const gBrokenPkgs = selector({
    key: 'gBrokenPkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).broken ?? [];
    },
});
/** Search pkg name */
export const gSearchPkgName = atom({
    key: 'gSearchPkgName',
    default: '',
});
/** Active app side panel (package name shown in side iframe) */
export const gActiveAppSide = atom<string | null>({
    key: 'gActiveAppSide',
    default: null,
});

import type { PkgHealthStatus } from '@/components/side/AppStore/pkgLifecycle/steps/pkgHealth';

/** Per-package cgi-bin/health probe result. reachable=true ⇒ start/stop are
 * usable; running flips which of the two is shown. Populated on mount, after
 * install/update/start/stop, and re-probed on refresh; dropped on uninstall. */
export const gPkgHealth = atom<Record<string, PkgHealthStatus>>({
    key: 'gPkgHealth',
    default: {},
});

export type PkgCommand = 'install' | 'uninstall' | 'update' | 'start' | 'stop';

/** Per-package in-flight command. Shared between catalog inline buttons and
 * the detail view so a single package can only have one operation at a time. */
export const gPkgBusy = atom<Record<string, PkgCommand | null>>({
    key: 'gPkgBusy',
    default: {},
});
