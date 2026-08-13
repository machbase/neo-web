import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import { resetPkgHubBackoff, SEARCH_RES } from '@/api/repository/appStore';
import { invalidateLocalArchiveCache } from '@/api/repository/onpremCatalog';
import { gSearchPkgs, gPossiblePkgs, gSearchPkgName, gPkgHealth, gCatalogStatus, gCatalogScanWarnings } from '@/recoil/appStore';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { AppList } from './item';
import useDebounce from '@/hooks/useDebounce';
import { useExperiment } from '@/hooks/useExperiment';
import { Side, Button } from '@/design-system/components';
import { checkPkgHealth } from './pkgLifecycle';
import { buildCatalog } from './catalog';
import { CatalogStatusIcon } from './CatalogStatusIcon';
import { ArchiveScanWarnings } from './ArchiveScanWarnings';
import { AppFrameStatus } from '@/components/appView/AppFrameStatus';
import { useAppFrameHealth } from '@/components/appView/useAppFrameHealth';
import { PkgPillBar } from './PkgPillBar';
import { CatalogSearchBand } from './CatalogSearchBand';
import { CatalogProgress } from './CatalogProgress';
import { useClosePkgSession, usePkgViews, useSelectPkgView } from './pkgViews';

export const AppStoreSide = () => {
    // RECOIL var
    const sPossiblePkgList = useRecoilValue(gPossiblePkgs);
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const setSearchPkgName = useSetRecoilState(gSearchPkgName);
    const sBoardList = useRecoilValue<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sPkgHealth, setPkgHealth] = useRecoilState(gPkgHealth);
    const [sCatalogStatus, setCatalogStatus] = useRecoilState(gCatalogStatus);
    // issue #1452 — per-archive scan findings, held apart from gCatalogStatus so
    // they render whatever the hub leg did. See the atom's header.
    const [sCatalogScanWarnings, setCatalogScanWarnings] = useRecoilState(gCatalogScanWarnings);
    // SCOPED var
    const [sSearchTxt, setSearchTxt] = useState<string>('');
    const [sEnter, setEnter] = useState<number>(0);
    // STARTS TRUE. `useDebounce` waits 500ms before the first build, and the panel
    // is empty for that whole window — showing the bar from mount is both honest
    // ("the catalog is on its way") and avoids it flashing in half a second later.
    const [sCatalogLoading, setCatalogLoading] = useState<boolean>(true);
    // Only the LATEST build may clear the flag. Search debounce and Refresh can
    // overlap, and without this an earlier build finishing second would switch the
    // bar off while the newer one is still running.
    const buildTokenRef = useRef<number>(0);
    const sideIframeRef = useRef<HTMLIFrameElement>(null);
    const { getExperiment } = useExperiment();

    // THE PILL SWITCHER, AND WHAT THE PANEL IS SHOWING BECAUSE OF IT.
    // `activeView === null` is the catalog; anything else is that package's own
    // `side.html`, filling the panel.
    const { openViews, activeView } = usePkgViews();
    // Pill → panel AND pill → main-area tab; see the hooks for the session rule
    // both directions share.
    const selectPkgView = useSelectPkgView();
    const closePkgSession = useClosePkgSession();

    // A PILL EXISTS ONLY FOR A PACKAGE THAT SHIPS `side.html` — every path that
    // opens one goes through `useRevealPkgView`, which checks first. So an active
    // pill IS a side frame; there is nothing to probe or choose between here.
    const sSideUrl = activeView ? `/public/${activeView}/side.html` : '';
    const sSideHealth = useAppFrameHealth(sideIframeRef, {
        enabled: !!activeView,
        resetKey: activeView ?? '',
    });

    // Activate main.html tab when user interacts with side iframe
    useEffect(() => {
        if (!activeView) return;
        const activateMainTab = () => {
            const mainTab = sBoardList.find(
                (b: any) => b.type === 'appView' && b.code?.appName === activeView,
            );
            if (mainTab && sSelectedTab !== mainTab.id) {
                setSelectedTab(mainTab.id);
            }
        };
        const handleBlur = () => {
            // activeElement update happens asynchronously, wait one frame
            requestAnimationFrame(() => {
                if (document.activeElement === sideIframeRef.current) {
                    activateMainTab();
                }
            });
        };
        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [activeView, sBoardList, sSelectedTab, setSelectedTab]);

    // pkgs search
    //
    // issue #1452: the whole hub ∪ local-archive ∪ installed merge lives in
    // buildCatalog, which never rejects and degrades per source. There is
    // deliberately NO `catch { setPkgs({ possibles: [] }) }` here anymore — an
    // unreachable hub used to blank the panel, taking the start/stop/uninstall
    // controls of every installed package down with it.
    const pkgsSearch = async () => {
        setSearchPkgName(sSearchTxt);
        const token = ++buildTokenRef.current;
        setCatalogLoading(true);
        try {
            const { pkgs, mode, hubError, lastSyncAt, scanWarnings } = await buildCatalog({
                search: sSearchTxt,
                experimentOn: getExperiment(),
            });
            setCatalogStatus({ mode, hubError, lastSyncAt });
            // issue #1452: written on EVERY build, including the empty case — a
            // rescan that finds the directories cleaned up must clear the list, not
            // leave the last set of accusations on screen.
            setCatalogScanWarnings(scanWarnings);
            setPkgs({ installed: [], exact: [], possibles: pkgs, broken: [] });
        } catch {
            // Unreachable by contract; keep whatever is already on screen rather
            // than emptying it, and leave the status untouched.
        } finally {
            // `finally`, so a build that somehow throws cannot leave the bar
            // spinning forever over a list that is not coming.
            if (buildTokenRef.current === token) setCatalogLoading(false);
        }
    };

    useDebounce([sEnter, sSearchTxt], pkgsSearch, 500);

    // On mount: clear any stale health cache from a previous mount of this
    // panel. Recoil atoms persist across remounts within a session, so without
    // this, the "fill missing" effect below would treat already-cached entries
    // as fresh and skip the health probe — making the cgi-bin/health request
    // only fire on explicit refresh.
    //
    // The local-archive scan cache (module scope in onpremCatalog.ts) is dropped
    // for the same reason: it also outlives a remount, and a zip dropped into
    // the archive directory while the panel was closed must show up when it is
    // reopened. The debounced pkgsSearch below then pays for exactly ONE scan;
    // every later keystroke reuses it.
    useEffect(() => {
        setPkgHealth({});
        invalidateLocalArchiveCache();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Probe cgi-bin/health for any newly-installed package and drop entries
    // for packages that are no longer installed. The result drives start/stop
    // button visibility AND the running/stopped toggle in the catalog.
    useEffect(() => {
        const installed = sPossiblePkgList
            .filter((p: any) => !!p?.installed_frontend)
            .map((p: any) => p.name as string);
        const installedSet = new Set(installed);

        // Drop stale entries (uninstalled since last sync).
        setPkgHealth((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const name of Object.keys(next)) {
                if (!installedSet.has(name)) {
                    delete next[name];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });

        // Fill missing entries.
        const missing = installed.filter((n) => !(n in sPkgHealth));
        if (missing.length === 0) return;
        let cancelled = false;
        (async () => {
            const pairs = await Promise.all(
                missing.map(async (n) => [n, await checkPkgHealth(n)] as const),
            );
            if (cancelled) return;
            setPkgHealth((prev) => {
                const next = { ...prev };
                for (const [name, status] of pairs) next[name] = status;
                return next;
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [sPossiblePkgList, sPkgHealth, setPkgHealth]);

    // Refresh button: re-fetch hub list AND drop the health cache so every
    // installed package gets its cgi-bin/health re-probed. Search-input debounce
    // calls pkgsSearch directly (no cache wipe) since typing should not re-probe
    // filesystem state on every keystroke.
    // An explicit Refresh is also the one place allowed to retry the hub before
    // its failure backoff expires — the user pressing the button after plugging
    // the network back in is asking for exactly that (issue #1452).
    // The local archive directory is rescanned here too: Refresh is the user
    // saying "look again", and the scan is cached precisely so the search
    // debounce does NOT look again on its own.
    const handleRefresh = async () => {
        setPkgHealth({});
        resetPkgHubBackoff();
        invalidateLocalArchiveCache();
        await pkgsSearch();
    };

    return (
        <Side.Container
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}
        >
            {/* ONE CONTENT AREA, SWITCHED BY THE PILL BAR.
                A package's `side.html` used to be STACKED under the catalog as a
                second section with its own collapse header, so opening a package
                left the panel showing two things at once and the package's UI got
                whatever vertical space the catalog did not want. It is now what the
                content area SHOWS when its pill is active — the catalog is not
                below it, it is behind it. */}
            <div className="app-store-body" style={{ flex: '1 1 auto' }}>
                {/* ------------------------------------------------------------------
                    PINNED HEADER. Title, pill bar and — in the catalog — the scan
                    warnings and the search band.
                    THE SEARCH BAND MUST NOT SCROLL. It used to sit inside the same
                    overflow container as the cards, so filtering a long catalog
                    scrolled the field that was doing the filtering off the top of the
                    panel. Everything that describes or controls the list stays here;
                    only the list itself moves.
                   ------------------------------------------------------------------ */}
                <div className="app-store-header">
                    <Side.Title>
                        {/* CATALOG SOURCE INDICATOR (offline / local-only / hub failure),
                            issue #1452. LEADS the title, and is not in the button group:
                            it is a statement about what this list contains, and beside
                            Refresh it read as a third control the user was meant to press.
                            It used to be a full-width banner below this title, which cost
                            three lines of a narrow panel and carried a Retry button that
                            called the very same `handleRefresh` the Refresh button does.
                            The explanation is in its tooltip. Renders null while the hub
                            is answering — so the title must not depend on it for spacing. */}
                        <span className="app-store-title-lead">
                            <CatalogStatusIcon pStatus={sCatalogStatus} pEntryCount={sPossiblePkgList.length} />
                            PACKAGES
                        </span>
                        <Button.Group>
                            <Button
                                size="side"
                                variant="none"
                                isToolTip
                                toolTipContent="Refresh"
                                icon={<MdRefresh size={16} />}
                                onClick={handleRefresh}
                            />
                        </Button.Group>
                    </Side.Title>

                    <PkgPillBar
                        pOpen={openViews}
                        pActive={activeView}
                        onSelect={(name) => void selectPkgView(name)}
                        onClose={closePkgSession}
                    />

                    {/* THE CATALOG'S OWN PINNED CONTROLS, in a wrapper of their own so
                        the rule that closes them off from the card list belongs to
                        THEM and not to the header. In a package view these do not
                        render at all, and the pill bar's bottom border is already the
                        boundary there — a rule on the header would land on top of it
                        and draw the same line twice. */}
                    {activeView === null && (
                        <div className="app-store-catalog-controls">
                            {/* PER-ARCHIVE SCAN FINDINGS (issue #1452).
                                A SIBLING OF THE CATALOG INDICATOR, NOT A CHILD, and rendered
                                with no reference to sCatalogStatus: a manually extracted directory or
                                an unreadable zip is just as real on an `online` server, where
                                the header indicator renders null. Above the search box because it
                                describes packages that are MISSING from the list below — a
                                report placed under the cards would be read as being about
                                them. */}
                            <ArchiveScanWarnings pWarnings={sCatalogScanWarnings} />
                            <CatalogSearchBand pValue={sSearchTxt} onChange={setSearchTxt} onEnter={() => setEnter(sEnter + 1)} />
                            {/* On the seam between these controls and the card list,
                                overlaying the rule rather than adding a row. */}
                            <CatalogProgress pLoading={sCatalogLoading} />
                        </div>
                    )}
                </div>

                {/* THE CONTENT AREA — the catalog, or the active package's own
                    UI. Only one of them is on screen at a time; that is the whole
                    point of the pill bar above. */}
                {activeView === null ? (
                    <div className="app-store-scroll">
                        <AppList pList={sPossiblePkgList} pStatus="POSSIBLE" />
                    </div>
                ) : (
                    // `.app-frame` (AppFrameStatus.scss) stretches to its flex host
                    // and hosts the status overlay. It is deliberately NOT inside
                    // `.app-store-scroll`: an iframe in a scroll container gets a
                    // second scrollbar wrapped around the one it already has.
                    <div className="app-frame">
                        <iframe ref={sideIframeRef} src={sSideUrl} title={`App Side: ${activeView}`} />
                        <AppFrameStatus pAppName={activeView} pHealth={sSideHealth} pCompact />
                    </div>
                )}
            </div>
        </Side.Container>
    );
};
