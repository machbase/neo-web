// The two main-area tabs the App Store panel can open, in one place.
//
// Extracted from `item.tsx` when the package view gained a ⚙ (open the detail
// tab) and a ＋ (open the package's own UI): the catalog card and the package
// view now open the same two tabs from two different components, and a second
// copy of "find the existing appStore tab, otherwise mint one" is how the two
// drift into disagreeing about tab identity.

import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { closeTabState } from '@/components/mainContent/tabCloseUtils';
import { generateUUID } from '@/utils';
import type { APP_INFO, PKG_STATUS } from '@/api/repository/appStore';

/** The package DETAIL tab (README, versions, uninstall). At most one, reused. */
export const APP_STORE_TAB_TYPE = 'appStore';
/** A package's own `main.html`, one tab per package. */
export const APP_VIEW_TAB_TYPE = 'appView';

/**
 * Does this URL serve HTML? Used to decide whether a package HAS a UI before
 * offering to open one — a package without `main.html` returns the server's 404
 * page, and a tab pointed at that is worse than a disabled button.
 */
export const checkHtmlExists = async (url: string): Promise<boolean> => {
    try {
        const res = await fetch(url, { method: 'GET', headers: { Accept: 'text/html' } });
        return res.ok && (res.headers.get('content-type')?.includes('text/html') ?? false);
    } catch {
        return false;
    }
};

export const useAppStoreTabs = () => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);

    /**
     * ONE detail tab for the whole App Store, retargeted rather than duplicated.
     * Opening a second package's details replaces the contents of the existing
     * tab; that is the behaviour the panel has always had and the reason the tab
     * is found by TYPE and not by package name.
     */
    const openPkgDetailTab = useCallback(
        (app: APP_INFO, status: PKG_STATUS) => {
            const existing = sBoardList.find((board: any) => board.type === APP_STORE_TAB_TYPE);
            if (existing) {
                setBoardList((prev: any[]) =>
                    prev.map((board: any) =>
                        board.id === existing.id
                            ? { ...existing, name: `PKG: ${app.name}`, code: { app, status }, savedCode: { app, status } }
                            : board
                    )
                );
                setSelectedTab(existing.id);
                return;
            }
            const id = generateUUID();
            setBoardList((prev: any[]) => [
                ...prev,
                { id, type: APP_STORE_TAB_TYPE, name: `PKG: ${app.name}`, code: { app, status }, savedCode: { app, status }, path: '' },
            ]);
            setSelectedTab(id);
        },
        [sBoardList, setBoardList, setSelectedTab]
    );

    /** One tab PER PACKAGE — these are different applications, not one viewer. */
    const openAppViewTab = useCallback(
        (appName: string) => {
            const existing = sBoardList.find((board: any) => board.type === APP_VIEW_TAB_TYPE && board.code?.appName === appName);
            if (existing) {
                setSelectedTab(existing.id);
                return;
            }
            const id = generateUUID();
            setBoardList((prev: any[]) => [
                ...prev,
                { id, type: APP_VIEW_TAB_TYPE, name: `APP: ${appName}`, code: { appName }, savedCode: { appName }, path: '' },
            ]);
            setSelectedTab(id);
        },
        [sBoardList, setBoardList, setSelectedTab]
    );

    /**
     * Closes a package's `APP:` tab, if it has one. A no-op otherwise, so callers
     * do not have to look first.
     *
     * Goes through `closeTabState` — the same helper the tab strip's own close
     * button uses — so the fallback selection and the "last tab becomes a new
     * empty one" rule stay in one place.
     */
    const closeAppViewTab = useCallback(
        (appName: string) => {
            const existing = sBoardList.find((board: any) => board.type === APP_VIEW_TAB_TYPE && board.code?.appName === appName);
            if (!existing) return;
            const { nextBoardList, nextSelectedTabId } = closeTabState(sBoardList as any, sSelectedTab, existing.id);
            setBoardList(nextBoardList as any);
            setSelectedTab(nextSelectedTabId);
        },
        [sBoardList, sSelectedTab, setBoardList, setSelectedTab]
    );

    return { openPkgDetailTab, openAppViewTab, closeAppViewTab };
};
