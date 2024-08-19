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
