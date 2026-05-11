// Shared lifecycle command runner for AppStore catalog inline buttons and the
// detail view. Owns:
//   - global per-package busy lock (gPkgBusy) to prevent concurrent ops
//   - manifest scripts cache (gPkgScripts) — drives start/stop button visibility
//   - running-state cache (gPkgRunning) — drives start vs stop toggle
//   - hub list / detail tab / file tree refresh after each command
//   - app-view tab + side iframe cleanup on uninstall
//
// Admin-gated: non-admins see no buttons, but defensive guard here protects
// against non-admin callers slipping through.

import { useRecoilCallback } from 'recoil';
import { Toast } from '@/design-system/components';
import { fetchPkgHubList, SEARCH_RES, APP_INFO } from '@/api/repository/appStore';
import { getFiles } from '@/api/repository/fileTree';
import { fileTreeParser } from '@/utils/fileTreeParser';
import { isCurUserEqualAdmin } from '@/utils';
import { closeTabState } from '@/components/mainContent/tabCloseUtils';
import { gActiveAppSide, gPkgBusy, gPkgHealth, gSearchPkgName, gSearchPkgs, PkgCommand } from '@/recoil/appStore';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import {
    checkPkgHealth,
    getInstalledVersion,
    runInstall,
    runStart,
    runStop,
    runUninstall,
    runUpdate,
    type LifecycleContext,
    type StepResult,
} from '.';

const TAB_TYPE = 'appStore';
const APP_VIEW_TYPE = 'appView';

async function listInstalledNames(): Promise<Set<string>> {
    try {
        const res: any = await getFiles('/public/');
        const children: any[] = res?.data?.children ?? res?.children ?? [];
        return new Set(children.filter((c: any) => c.isDir).map((c: any) => c.name));
    } catch {
        return new Set();
    }
}

export function usePkgCommand() {
    return useRecoilCallback(
        ({ snapshot, set, reset }) =>
            async (app: APP_INFO, command: PkgCommand): Promise<StepResult | null> => {
                if (!isCurUserEqualAdmin()) return null;

                const appName = app.name;
                const busyMap = await snapshot.getPromise(gPkgBusy);
                if (busyMap[appName]) return null;

                set(gPkgBusy, (prev) => ({ ...prev, [appName]: command }));

                const ctx: LifecycleContext = {
                    appName,
                    fullName: app.github?.full_name ?? '',
                    logs: [],
                };

                let result: StepResult;
                try {
                    if (command === 'install') result = await runInstall(ctx);
                    else if (command === 'update') result = await runUpdate(ctx);
                    else if (command === 'uninstall') result = await runUninstall(ctx);
                    else if (command === 'start') result = await runStart(ctx);
                    else result = await runStop(ctx);
                } catch (e: any) {
                    result = { ok: false, log: e?.message ?? String(e), reason: e?.message ?? 'unexpected error' };
                }

                // Refresh health cache so the start/stop toggle reflects the new
                // running state without waiting for a polling/refresh cycle.
                if (command === 'uninstall') {
                    set(gPkgHealth, (prev) => {
                        if (!(appName in prev)) return prev;
                        const next = { ...prev };
                        delete next[appName];
                        return next;
                    });
                } else {
                    const status = await checkPkgHealth(appName);
                    set(gPkgHealth, (prev) => ({ ...prev, [appName]: status }));
                }

                // Refresh hub list (mirrors AppStoreSide.pkgsSearch shape so CATALOG
                // doesn't vanish after install/uninstall).
                try {
                    const search = await snapshot.getPromise(gSearchPkgName);
                    const [hubPkgs, installedNames] = await Promise.all([fetchPkgHubList(), listInstalledNames()]);
                    const allPkgs = await Promise.all(
                        hubPkgs.map(async (pkg) => {
                            if (!installedNames.has(pkg.name)) return pkg;
                            const installed_version = await getInstalledVersion(pkg.name);
                            return { ...pkg, installed_frontend: true, installed_version };
                        })
                    );
                    const q = search.toLowerCase();
                    const displayed = search
                        ? allPkgs.filter((p) => p.name.toLowerCase().includes(q) || p.github.description.toLowerCase().includes(q))
                        : allPkgs;
                    set(gSearchPkgs, { installed: [], exact: [], possibles: displayed, broken: [] } as SEARCH_RES);
                } catch {
                    /* leave hub list as-is on refresh failure */
                }

                // Sync the detail tab (if open) with new installed_frontend / version.
                try {
                    const installedNames = await listInstalledNames();
                    const isInstalled = installedNames.has(appName);
                    const installed_version = isInstalled ? await getInstalledVersion(appName) : '';
                    const updatedApp = { ...app, installed_frontend: isInstalled, installed_version };
                    set(gBoardList, (boardList: any) => {
                        const target = boardList.find((b: any) => b.type === TAB_TYPE && b.code?.app?.name === appName);
                        if (!target) return boardList;
                        return boardList.map((b: any) => {
                            if (b.id !== target.id) return b;
                            return {
                                ...b,
                                name: `PKG: ${appName}`,
                                code: { app: updatedApp, status: b.code?.status ?? 'POSSIBLE' },
                                savedCode: { app: updatedApp, status: b.code?.status ?? 'POSSIBLE' },
                            };
                        });
                    });
                } catch {
                    /* nothing to update */
                }

                // Refresh file tree (install/uninstall change /public/ contents).
                try {
                    const sReturn: any = await getFiles('/');
                    if (sReturn && sReturn?.data) {
                        const sParedData = fileTreeParser(sReturn.data, '/', 0, '0');
                        set(gFileTree, JSON.parse(JSON.stringify(sParedData)));
                    }
                } catch {
                    /* ignore */
                }

                // After uninstall, drop appView tab + side iframe pointing at the removed pkg.
                // Must use functional setter — the snapshot above does NOT see the
                // detail-tab update we just wrote via set(gBoardList, ...). Reading
                // from snapshot here would let us write back stale state that reverts
                // installed_frontend back to true.
                if (command === 'uninstall' && result.ok) {
                    const selectedTab = await snapshot.getPromise(gSelectedTab);
                    let nextSelectedId: string | null = null;
                    set(gBoardList, (currentBoardList: any) => {
                        const appViewTab = currentBoardList.find((b: any) => b.type === APP_VIEW_TYPE && b.code?.appName === appName);
                        if (!appViewTab) return currentBoardList;
                        const { nextBoardList, nextSelectedTabId } = closeTabState(currentBoardList, selectedTab, appViewTab.id);
                        nextSelectedId = nextSelectedTabId;
                        return nextBoardList;
                    });
                    if (nextSelectedId !== null) set(gSelectedTab, nextSelectedId);

                    const activeSide = await snapshot.getPromise(gActiveAppSide);
                    if (activeSide === appName) reset(gActiveAppSide);
                }

                set(gPkgBusy, (prev) => ({ ...prev, [appName]: null }));

                if (result.ok) {
                    const verb =
                        command === 'install'
                            ? 'installed'
                            : command === 'update'
                              ? 'updated'
                              : command === 'uninstall'
                                ? 'uninstalled'
                                : command === 'start'
                                  ? 'started'
                                  : 'stopped';
                    Toast.success(`${appName} ${verb}`);
                } else {
                    Toast.error(`${appName} ${command} failed: ${result.reason}`);
                }
                return result;
            },
        []
    );
}
