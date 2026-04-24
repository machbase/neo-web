import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue, useRecoilState, useSetRecoilState, useResetRecoilState } from 'recoil';
import { fetchPkgHubList, SEARCH_RES } from '@/api/repository/appStore';
import { getFiles } from '@/api/repository/fileTree';
import { gSearchPkgs, gPossiblePkgs, gSearchPkgName, gActiveAppSide, gPkgHealth } from '@/recoil/appStore';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { closeTabState } from '@/components/mainContent/tabCloseUtils';
import { AppList } from './item';
import EnterCallback from '@/hooks/useEnter';
import useDebounce from '@/hooks/useDebounce';
import { Side, Input, Button } from '@/design-system/components';
import { getInstalledVersion, checkPkgHealth } from './pkgLifecycle';

export const AppStoreSide = () => {
    // RECOIL var
    const sPossiblePkgList = useRecoilValue(gPossiblePkgs);
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const setSearchPkgName = useSetRecoilState(gSearchPkgName);
    const sActiveAppSide = useRecoilValue(gActiveAppSide);
    const resetActiveAppSide = useResetRecoilState(gActiveAppSide);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sPkgHealth, setPkgHealth] = useRecoilState(gPkgHealth);
    // SCOPED var
    const [sSearchTxt, setSearchTxt] = useState<string>('');
    const [sEnter, setEnter] = useState<number>(0);
    const [sAppSideCollapse, setAppSideCollapse] = useState<boolean>(true);
    const sideIframeRef = useRef<HTMLIFrameElement>(null);

    // Activate main.html tab when user interacts with side iframe
    useEffect(() => {
        if (!sActiveAppSide) return;
        const activateMainTab = () => {
            const mainTab = sBoardList.find((b: any) => b.type === 'appView' && b.code?.appName === sActiveAppSide);
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
    }, [sActiveAppSide, sBoardList, sSelectedTab, setSelectedTab]);

    // Get installed package names by listing /public/ directory
    const getInstalledNames = async (): Promise<Set<string>> => {
        try {
            const res: any = await getFiles('/public/');
            const children: any[] = res?.data?.children ?? res?.children ?? [];
            return new Set(children.filter((c: any) => c.isDir).map((c: any) => c.name));
        } catch {
            return new Set();
        }
    };

    // pkgs search
    const pkgsSearch = async () => {
        setSearchPkgName(sSearchTxt);
        try {
            const [hubPkgs, installedNames] = await Promise.all([fetchPkgHubList(), getInstalledNames()]);

            const allPkgs = await Promise.all(
                hubPkgs.map(async (pkg) => {
                    if (!installedNames.has(pkg.name)) return pkg;
                    const installed_version = await getInstalledVersion(pkg.name);
                    return { ...pkg, installed_frontend: true, installed_version };
                })
            );

            const searchLower = sSearchTxt.toLowerCase();
            const displayed = sSearchTxt
                ? allPkgs.filter((pkg) => pkg.name.toLowerCase().includes(searchLower) || pkg.github.description.toLowerCase().includes(searchLower))
                : allPkgs;

            setPkgs({ installed: [], exact: [], possibles: displayed, broken: [] });
        } catch {
            setPkgs({ installed: [], exact: [], possibles: [], broken: [] });
        }
    };
    const handleSearchTxt = (e: React.FormEvent<HTMLInputElement>) => {
        setSearchTxt((e.target as HTMLInputElement).value);
    };

    useDebounce([sEnter, sSearchTxt], pkgsSearch, 500);

    // On mount: clear any stale health cache from a previous mount of this
    // panel. Recoil atoms persist across remounts within a session, so without
    // this, the "fill missing" effect below would treat already-cached entries
    // as fresh and skip the health probe — making the cgi-bin/health request
    // only fire on explicit refresh.
    useEffect(() => {
        setPkgHealth({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Probe cgi-bin/health for any newly-installed package and drop entries
    // for packages that are no longer installed. The result drives start/stop
    // button visibility AND the running/stopped toggle in the catalog.
    useEffect(() => {
        const installed = sPossiblePkgList.filter((p: any) => !!p?.installed_frontend).map((p: any) => p.name as string);
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
            const pairs = await Promise.all(missing.map(async (n) => [n, await checkPkgHealth(n)] as const));
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
    const handleRefresh = () => {
        setPkgHealth({});
        pkgsSearch();
    };

    const handleSideClose = () => {
        const appViewTab = sBoardList.find((b: any) => b.type === 'appView' && b.code?.appName === sActiveAppSide);
        if (appViewTab) {
            const { nextBoardList, nextSelectedTabId } = closeTabState(sBoardList, sSelectedTab, appViewTab.id);
            setBoardList(nextBoardList);
            setSelectedTab(nextSelectedTabId);
        }
        resetActiveAppSide();
    };

    return (
        <Side.Container style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
            {/* Package list area (scrollable) */}
            <div style={{ flex: sActiveAppSide ? '0 1 auto' : '1 1 auto', overflow: 'auto', minHeight: 0 }}>
                <Side.Title>
                    <span>PACKAGES</span>
                    <Button.Group>
                        <Button size="side" variant="none" isToolTip toolTipContent="Refresh" icon={<MdRefresh size={16} />} onClick={handleRefresh} />
                    </Button.Group>
                </Side.Title>
                {/* SEARCH */}
                <div className="app-search-warp">
                    <Input placeholder="Search" autoFocus onChange={handleSearchTxt} onKeyDown={(e) => EnterCallback(e, () => setEnter(sEnter + 1))} fullWidth size="sm" />
                </div>
                <AppList pList={sPossiblePkgList} pTitle={sSearchTxt === '' ? 'CATALOG' : 'SEARCH RESULTS'} pStatus="POSSIBLE" />
            </div>

            {/* Side iframe area (fixed bottom) */}
            {sActiveAppSide && (
                <div style={{ flex: '1 1 50%', minHeight: '150px', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--side-border, rgba(255,255,255,0.1))' }}>
                    <Side.Collapse pCollapseState={sAppSideCollapse} pCallback={() => setAppSideCollapse(!sAppSideCollapse)}>
                        <span style={{ flex: 1 }}>SIDE: {sActiveAppSide}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSideClose();
                            }}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 4px', fontSize: '14px', lineHeight: 1 }}
                        >
                            ✕
                        </button>
                    </Side.Collapse>
                    {sAppSideCollapse && (
                        <iframe
                            ref={sideIframeRef}
                            src={`/public/${sActiveAppSide}/side.html`}
                            style={{ width: '100%', flex: 1, border: 'none', minHeight: 0 }}
                            title={`App Side: ${sActiveAppSide}`}
                        />
                    )}
                </div>
            )}
        </Side.Container>
    );
};
