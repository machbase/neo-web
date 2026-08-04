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
import { SEARCH_RES, APP_INFO } from '@/api/repository/appStore';
import { getFiles } from '@/api/repository/fileTree';
import { getInstalledIcons, invalidateLocalArchiveCache } from '@/api/repository/onpremCatalog';
import { fileTreeParser } from '@/utils/fileTreeParser';
import { isCurUserEqualAdmin } from '@/utils';
import { useExperiment } from '@/hooks/useExperiment';
import { closeTabState } from '@/components/mainContent/tabCloseUtils';
import { buildCatalog, installedIconOf, listInstalledNames } from '../catalog';
import { invalidatePkgHtmlCache } from '../pkgHtml';
import {
    gActivePkgView,
    gCatalogScanWarnings,
    gCatalogStatus,
    gOpenPkgViews,
    gPkgBusy,
    gPkgHealth,
    gSearchPkgName,
    gSearchPkgs,
    type CatalogMode,
    PkgCommand,
} from '@/recoil/appStore';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import {
    checkPkgHealth,
    readManifest,
    runInstall,
    runStart,
    runStop,
    runUninstall,
    runUpdate,
    type LifecycleContext,
    type StepResult,
} from '.';
import type { PkgHealthStatus } from './steps/pkgHealth';

const TAB_TYPE = 'appStore';
const APP_VIEW_TYPE = 'appView';

// Uninstall pre-flight guard predicate. Returns true when a fresh health probe
// shows at least one service still running — caller must abort uninstall and
// surface a Toast. Errors-only state (running=0 with errors[]) does NOT block:
// the user can uninstall a broken package whose services are already down.
// Legacy controllers without `serviceSummary` fall back to the boolean
// `running` / `status === 'running'` signal. Unreachable controllers never
// block — punishing them would strand packages whose CGI endpoint is gone.
export function shouldBlockUninstall(fresh: PkgHealthStatus): boolean {
    if (!fresh.reachable) return false;
    if (fresh.serviceSummary) return fresh.serviceSummary.running > 0;
    return fresh.running === true || fresh.status === 'running';
}

// Toast copy for the blocked path. Kept here (not inline) so tests can pin the
// shape without re-parsing the call site.
export function buildBlockedMessage(appName: string, fresh: PkgHealthStatus): string {
    const count = fresh.serviceSummary?.running ?? 1;
    return `${count} service(s) of ${appName} are still running. Stop them first and try again.`;
}

/**
 * issue #1452 — refuse a hub-sourced install/update when the hub is not in play.
 *
 * WHY A SECOND GATE. The card already hides the affordance: `applyOfflineSelectable`
 * masks `source: 'hub'` rows and `applyOfflineEligibility` recomputes the default
 * target, so an offline / local-only panel does not offer these. But that gating is
 * computed at RENDER time from a status the panel may have held for minutes: the
 * policy file can be written, or the network can drop, while a version menu is
 * open. The stale click then reaches here and, in local-only mode, sends the one
 * request the whole feature exists to prevent. Commands are the last checkpoint
 * before the wire, so the check belongs here too.
 *
 * ONLY AN EXPLICIT `'hub'` IS REFUSED. `undefined` is the historical shape of every
 * caller that does not pick a row (`item.tsx` start/stop, the experiment-mode
 * custom-version input), and `'local'` reads a file on this machine. Widening this
 * to "anything not local" would break the custom-tag path for no offline gain.
 */
export function shouldBlockHubCommand(mode: CatalogMode, command: PkgCommand, source?: 'hub' | 'local'): boolean {
    if (source !== 'hub') return false;
    if (command !== 'install' && command !== 'update') return false;
    return mode !== 'online';
}

/** Toast copy for the refusal above; the two modes must not sound alike. */
export function buildHubBlockedMessage(appName: string, mode: CatalogMode): string {
    return mode === 'localOnly'
        ? `${appName}: this server is in local-only mode (/public/.pkg-conf.json). Only locally archived versions can be installed.`
        : `${appName}: the package hub is unreachable. Only locally archived versions can be installed right now.`;
}

/**
 * Where the chosen version must come from (issue #1452).
 *
 * OPTIONAL ON PURPOSE. Every historical call site passes at most three arguments
 * (`item.tsx` start/stop, `info.tsx` detail actions) and keeps working unchanged:
 * an absent `source` leaves `LifecycleContext` exactly as it was, i.e. the GitHub
 * path. Only the version picker, which knows which row was clicked, fills it in.
 */
export interface PkgCommandOptions {
    /**
     * `'local'` ⇒ extract the archive holding this name+version;
     * `'hub'`/undefined ⇒ `pkg copy github.com/...`.
     *
     * THE ONLY OPTION, and the only one there can be: the source is the row the
     * user clicked, which the server cannot infer. It used to be joined by an
     * `archivePath` looked up from a recoil atom — the archive is now found
     * server-side from the package name and the version (`ctx.tag`).
     */
    source?: 'hub' | 'local';
}

export function usePkgCommand() {
    // Captured into the callback below: this refresh path re-seeds gSearchPkgs and
    // must apply the same experiment gate as AppStoreSide.pkgsSearch, or a package
    // hidden from the catalog reappears the moment any package is installed or
    // removed, and stays visible until the next search (issue #1438).
    const { getExperiment } = useExperiment();
    return useRecoilCallback(
        ({ snapshot, set }) =>
            async (app: APP_INFO, command: PkgCommand, version?: string, opts?: PkgCommandOptions): Promise<StepResult | null> => {
                if (!isCurUserEqualAdmin()) return null;

                const appName = app.name;
                const busyMap = await snapshot.getPromise(gPkgBusy);
                if (busyMap[appName]) return null;

                // issue #1452 — refuse a hub fetch the current mode forbids, BEFORE
                // the busy lock is taken and before any step runs. See
                // `shouldBlockHubCommand` for why the UI gate is not enough.
                const catalogStatus = await snapshot.getPromise(gCatalogStatus);
                const catalogMode: CatalogMode = catalogStatus?.mode ?? 'online';
                if (shouldBlockHubCommand(catalogMode, command, opts?.source)) {
                    Toast.warning(buildHubBlockedMessage(appName, catalogMode));
                    return { ok: false, log: '', reason: catalogMode === 'localOnly' ? 'local_only_mode' : 'hub_unreachable' };
                }

                set(gPkgBusy, (prev) => ({ ...prev, [appName]: command }));

                // Uninstall pre-flight guard: a fresh health probe (NOT the
                // cached gPkgHealth — that can lag a manual `stop` from the
                // CLI) decides whether to block. If any service is still
                // running we warn, refresh the cache to whatever the probe
                // saw, release the busy lock, and bail out before runUninstall
                // touches the package. The cache is SET (not deleted) so the
                // chip / RunSwitch stay visible — the package is still
                // installed, we just refused to remove it.
                if (command === 'uninstall') {
                    const fresh = await checkPkgHealth(appName);
                    if (shouldBlockUninstall(fresh)) {
                        Toast.warning(buildBlockedMessage(appName, fresh));
                        set(gPkgHealth, (prev) => ({ ...prev, [appName]: fresh }));
                        set(gPkgBusy, (prev) => ({ ...prev, [appName]: null }));
                        return { ok: false, log: '', reason: 'services_running' };
                    }
                }

                const ctx: LifecycleContext = {
                    appName,
                    // issue #1369: a user-picked version (install/update specific version)
                    // takes precedence; fall back to the hub latest_version.
                    fullName: app.github?.full_name ?? '',
                    tag: version || app.latest_version || undefined,
                    // issue #1452: the picker resolved the selected version to a
                    // source before calling. Undefined keeps the historical
                    // GitHub-only behaviour for callers that do not select a row.
                    source: opts?.source,
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

                // Rebuild the catalog through the SAME merge AppStoreSide.pkgsSearch
                // uses (issue #1452). This used to be an inline copy of that logic
                // wrapped in a catch, which meant an unreachable hub left the panel
                // frozen on pre-command state after every install/uninstall; the
                // merge now degrades per source, so the local archive and the
                // installed packages still refresh with the hub down.
                //
                // The search term comes from gSearchPkgName here (this hook has no
                // local state) and from component state in index.tsx — both feed the
                // one `search` parameter so the two paths cannot drift.
                try {
                    const search = await snapshot.getPromise(gSearchPkgName);
                    // The local-archive scan is cached (it opens every zip on the
                    // server, so the search debounce must not repeat it). A command
                    // is one of the few moments the archive directory can actually
                    // have changed — an offline install reads from it, and a future
                    // "register archive" flow writes to it — so drop the cache here
                    // and let this one rebuild pay for the rescan.
                    invalidateLocalArchiveCache();
                    invalidatePkgHtmlCache();
                    const { pkgs, mode, hubError, lastSyncAt, scanWarnings } = await buildCatalog({ search, experimentOn: getExperiment() });
                    set(gCatalogStatus, { mode, hubError, lastSyncAt });
                    // issue #1452 — the SECOND of the two places a catalog build
                    // lands, and it must publish the findings too. The rescan a few
                    // lines up is triggered precisely because a command may have
                    // changed the archive directory and /public/, so this is the one
                    // rebuild MOST likely to add or clear a warning: an uninstall
                    // that removes a hand-extracted directory has to make its
                    // warning disappear, and leaving it to the next keystroke would
                    // show the user an accusation about a directory they just
                    // deleted.
                    set(gCatalogScanWarnings, scanWarnings);
                    set(gSearchPkgs, { installed: [], exact: [], possibles: pkgs, broken: [] } as SEARCH_RES);
                } catch {
                    /* buildCatalog does not reject; keep the list as-is if it ever does */
                }

                // Sync the detail tab (if open) with new installed_frontend / version /
                // packageService. Single manifest read drives all three so the detail
                // tab stays consistent with the catalog row above.
                try {
                    const installedNames = await listInstalledNames();
                    const isInstalled = installedNames.has(appName);
                    const manifest = isInstalled ? await readManifest(appName) : null;
                    const installed_version = typeof manifest?.version === 'string' ? manifest.version : '';
                    const updatedApp = {
                        ...app,
                        installed_frontend: isInstalled,
                        installed_version,
                        installed_packageService: isInstalled ? manifest?.packageService : undefined,
                        // issue #1452: the icon file name is read off the server by
                        // the archive scan, which the rebuild above has just
                        // refreshed — so a package installed a moment ago shows its
                        // real `icon.svg` instead of falling back to an `icon.png`
                        // guess until the next panel mount. `undefined` once it is
                        // uninstalled: there is no /public/{name}/ to fetch from.
                        installed_icon: isInstalled ? installedIconOf(appName, getInstalledIcons()) : undefined,
                    };
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

                    // AND THE PILL GOES WITH IT (spec §2). A package view onto an
                    // uninstalled package is a dead end: its cgi-bin is gone, so the
                    // tree can only ever report "No hierarchy items" and every switch
                    // in it is disabled. Leaving the pill up would also let the user
                    // return to that dead end after browsing away.
                    //
                    // Done here rather than at the Uninstall button because uninstall
                    // is reachable from BOTH the catalog card and the detail tab, and
                    // this callback is the one path both of them take.
                    set(gOpenPkgViews, (prev: string[]) => (prev.includes(appName) ? prev.filter((n) => n !== appName) : prev));
                    // Falls back to the catalog only when the closed pill was the one
                    // on screen; a pill closed in the background must not move the view.
                    set(gActivePkgView, (prev: string | null) => (prev === appName ? null : prev));
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
