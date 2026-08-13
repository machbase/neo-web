// Open/close/select for the pill switcher, as hooks rather than raw atom writes.
//
// THE INVARIANT THEY EXIST TO HOLD: `gActivePkgView` must always be either `null`
// or a name that is still in `gOpenPkgViews`. Closing the active pill therefore
// has to touch BOTH atoms, and there are three call sites that close one — the ×
// on the pill, a successful uninstall, and the panel itself. Written out at each
// of them, the uninstall path is the one that would eventually forget, leaving
// the panel showing a package view with no pill to leave it by.
//
// Split into three hooks so the components that only WRITE do not subscribe:
// `usePkgCommand` runs inside every catalog card, and having it read the open
// list would re-render the whole catalog each time a pill opens.

import { useCallback } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActivePkgView, gOpenPkgViews } from '@/recoil/appStore';
import { probePkgHtml } from './pkgHtml';
import { useAppStoreTabs } from './appTabs';

/**
 * The text a pill shows.
 *
 * `neo-pkg-opcua-client` in a 200px-wide bar is one pill and no room for a
 * second. Every package in the hub carries the same `neo-pkg-` prefix, so it
 * distinguishes nothing while costing eight characters of a very short line.
 *
 * Only that prefix is dropped. Trimming further (a `-client` suffix, say) would
 * be guessing at a convention that does not exist, and two packages could then
 * collapse onto the same label. The full name stays in the pill's `title`.
 *
 * Lives here rather than in PkgPillBar.tsx because a component file that also
 * exports plain functions breaks fast refresh for the whole module.
 */
export const pillLabel = (name: string): string => (name.startsWith('neo-pkg-') ? name.slice('neo-pkg-'.length) : name) || name;

/** Opens a package view, or switches to it when the pill already exists. */
export const useOpenPkgView = () => {
    const setOpen = useSetRecoilState(gOpenPkgViews);
    const setActive = useSetRecoilState(gActivePkgView);
    return useCallback(
        (name: string) => {
            if (!name) return;
            setOpen((prev) => (prev.includes(name) ? prev : [...prev, name]));
            setActive(name);
        },
        [setOpen, setActive]
    );
};

/** Removes a pill; falls back to the catalog only if it was the active one. */
export const useClosePkgView = () => {
    const setOpen = useSetRecoilState(gOpenPkgViews);
    const setActive = useSetRecoilState(gActivePkgView);
    return useCallback(
        (name: string) => {
            setOpen((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : prev));
            setActive((prev) => (prev === name ? null : prev));
        },
        [setOpen, setActive]
    );
};

/**
 * Opens a package view ONLY IF the package has one — i.e. it ships `side.html`.
 *
 * The gate lives here because three call sites need it and each one used to probe
 * for itself: the catalog card, the main area's app-tab sync, and anything else
 * that wants to reveal a package in the panel. A pill for a package with no
 * `side.html` is a permanently empty panel the user has to close again.
 */
export const useRevealPkgView = () => {
    const openView = useOpenPkgView();
    return useCallback(
        async (name: string) => {
            if (!name) return false;
            const { side } = await probePkgHtml(name);
            if (side) openView(name);
            return side;
        },
        [openView]
    );
};

/**
 * SIDEBAR → MAIN AREA. Selecting a pill switches the panel AND brings up that
 * package's `APP:` tab; `null` selects the catalog and touches no tab.
 *
 * IT CREATES THE TAB IF THERE IS NONE, rather than only activating an existing
 * one. Closing an `APP:` tab deliberately leaves its pill open, so "activate only
 * what exists" would strand that pill — the tab it points at is gone and nothing
 * could bring it back. Creating it is what makes the pill a way back in.
 *
 * A package with no `main.html` has no tab to open; the pill still switches the
 * panel, which is the whole of what such a package offers.
 */
export const useSelectPkgView = () => {
    const setActive = useSetRecoilState(gActivePkgView);
    const { openAppViewTab } = useAppStoreTabs();
    return useCallback(
        async (name: string | null) => {
            setActive(name);
            if (!name) return;
            const { main } = await probePkgHtml(name);
            if (main) openAppViewTab(name);
        },
        [setActive, openAppViewTab]
    );
};

/**
 * CLOSES A PACKAGE'S WHOLE SESSION — its pill AND its `APP:` tab.
 *
 * ONE PACKAGE IS ONE SESSION ACROSS TWO SURFACES, and closing it on either
 * surface ends it on both. The alternative (independent lifetimes) meant tidying
 * up took two closes and, if you only did one, the other half stayed quietly
 * alive — with a rule that propagated in one direction only, which is harder to
 * learn than either extreme.
 *
 * A package with no `main.html` has no tab; `closeAppViewTab` is a no-op for it
 * and the pill is simply closed.
 */
export const useClosePkgSession = () => {
    const closeView = useClosePkgView();
    const { closeAppViewTab } = useAppStoreTabs();
    return useCallback(
        (name: string) => {
            closeView(name);
            closeAppViewTab(name);
        },
        [closeView, closeAppViewTab]
    );
};

/** The full read/write surface, for the panel that renders the bar. */
export const usePkgViews = () => {
    const [sOpen] = useRecoilState(gOpenPkgViews);
    const sActive = useRecoilValue(gActivePkgView);
    const setActive = useSetRecoilState(gActivePkgView);
    const openView = useOpenPkgView();
    const closeView = useClosePkgView();
    const selectView = useCallback((name: string | null) => setActive(name), [setActive]);

    return { openViews: sOpen, activeView: sActive, openView, closeView, selectView };
};
