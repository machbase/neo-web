import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useState } from 'react';
import { useRecoilValue, useRecoilState, useSetRecoilState, useResetRecoilState } from 'recoil';
import { APP_INFO, fetchPkgHubList, getPkgAction, SEARCH_RES } from '@/api/repository/appStore';
import { getFiles } from '@/api/repository/fileTree';
import { gSearchPkgs, gExactPkgs, gPossiblePkgs, gBrokenPkgs, gSearchPkgName, gInstalledPkgs, gActiveAppSide } from '@/recoil/appStore';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { closeTabState } from '@/components/mainContent/tabCloseUtils';
import { AppList } from './item';
import EnterCallback from '@/hooks/useEnter';
import { isCurUserEqualAdmin } from '@/utils';
import useDebounce from '@/hooks/useDebounce';
import { Side, Input, Button } from '@/design-system/components';
import { extractFrontendOnlyTargets, extractStatusTargets, normalizeRuntimeStatus, RuntimeStatus } from './runtimeStatus';

export const AppStoreSide = () => {
    // RECOIL var
    const sInstalledPkgList = useRecoilValue(gInstalledPkgs);
    const sExactPkgList = useRecoilValue(gExactPkgs);
    const sPossiblePkgList = useRecoilValue(gPossiblePkgs);
    const sBrokenPkgList = useRecoilValue(gBrokenPkgs);
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const setSearchPkgName = useSetRecoilState(gSearchPkgName);
    const sActiveAppSide = useRecoilValue(gActiveAppSide);
    const resetActiveAppSide = useResetRecoilState(gActiveAppSide);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    // SCOPED var
    const [sSearchTxt, setSearchTxt] = useState<string>('');
    const [sEnter, setEnter] = useState<number>(0);
    const [sRuntimeStatusMap, setRuntimeStatusMap] = useState<Record<string, RuntimeStatus>>({});
    const [sAppSideCollapse, setAppSideCollapse] = useState<boolean>(true);
    const sIsAdmin = isCurUserEqualAdmin();

    const refreshRuntimeStatus = async (installed: APP_INFO[]) => {
        const statusTargets = extractStatusTargets(installed ?? []);
        const frontendOnlyTargets = extractFrontendOnlyTargets(installed ?? []);

        if (statusTargets.length === 0 && frontendOnlyTargets.length === 0) {
            setRuntimeStatusMap({});
            return;
        }

        const nextStatusMap: Record<string, RuntimeStatus> = {};
        frontendOnlyTargets.forEach((pkgName) => {
            nextStatusMap[pkgName] = 'frontend-only';
        });

        // Non-admin users don't have permission to call the status API,
        // skip backend status checks to prevent 401 -> relogin infinite loop
        if (!sIsAdmin || statusTargets.length === 0) {
            setRuntimeStatusMap(nextStatusMap);
            return;
        }

        const settledResults = await Promise.allSettled(
            statusTargets.map(async (pkgName) => {
                const statusRes: any = await getPkgAction(pkgName, 'status');
                if (!statusRes?.success) return [pkgName, 'stopped' as RuntimeStatus] as const;
                return [pkgName, normalizeRuntimeStatus(statusRes?.data?.status)] as const;
            })
        );

        settledResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                const [pkgName, runtimeStatus] = result.value;
                nextStatusMap[pkgName] = runtimeStatus;
            } else {
                const pkgName = statusTargets[idx];
                nextStatusMap[pkgName] = 'stopped';
            }
        });

        setRuntimeStatusMap(nextStatusMap);
    };

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

            // Mark installed packages
            const allPkgs = hubPkgs.map((pkg) => installedNames.has(pkg.name) ? { ...pkg, installed_frontend: true } : pkg);

            const searchLower = sSearchTxt.toLowerCase();
            const isSearching = sSearchTxt.length > 0;

            if (isSearching) {
                // Search mode: show only matching packages as search results
                const matched = allPkgs.filter((pkg) => pkg.name.toLowerCase().includes(searchLower) || pkg.github.description.toLowerCase().includes(searchLower));
                setPkgs({ installed: [], exact: [], possibles: matched, broken: [] });
            } else {
                const installed = allPkgs.filter((pkg) => pkg.installed_frontend);
                if (installed.length > 0) {
                    // Has installed packages: show installed only
                    setPkgs({ installed, exact: [], possibles: [], broken: [] });
                    await refreshRuntimeStatus(installed);
                } else {
                    // No installed packages: show all as featured
                    setPkgs({ installed: [], exact: [], possibles: allPkgs, broken: [] });
                }
            }
        } catch {
            setPkgs({ installed: [], exact: [], possibles: [], broken: [] });
            setRuntimeStatusMap({});
        }
    };
    const handleSearchTxt = (e: React.FormEvent<HTMLInputElement>) => {
        setSearchTxt((e.target as HTMLInputElement).value);
    };

    useDebounce([sEnter, sSearchTxt], pkgsSearch, 500);

    return (
        <Side.Container style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
            {/* Package list area (scrollable) */}
            <div style={{ flex: sActiveAppSide ? '0 1 auto' : '1 1 auto', overflow: 'auto', minHeight: 0 }}>
                <Side.Title>
                    <span>PACKAGES</span>
                    <Button.Group>
                        <Button size="side" variant="none" isToolTip toolTipContent="Refresh" icon={<MdRefresh size={16} />} onClick={pkgsSearch} />
                    </Button.Group>
                </Side.Title>
                {/* SEARCH */}
                <div className="app-search-warp">
                    <Input placeholder="Search" autoFocus onChange={handleSearchTxt} onKeyDown={(e) => EnterCallback(e, () => setEnter(sEnter + 1))} fullWidth size="sm" />
                </div>
                {/* INSTALLED */}
                <AppList pList={sInstalledPkgList} pTitle="INSTALLED" pStatus="POSSIBLE" pRuntimeStatusMap={sRuntimeStatusMap} />
                {/* EXACT */}
                <AppList pList={sExactPkgList} pTitle="FOUND" pStatus="EXACT" />
                {/* POSSIBLE */}
                <AppList pList={sPossiblePkgList} pTitle={sSearchTxt === '' ? 'FEATURED' : 'SEARCH'} pStatus="POSSIBLE" />
                {/* BROKEN */}
                <AppList pList={sBrokenPkgList} pTitle="BROKEN" pStatus="BROKEN" />
            </div>

            {/* Side iframe area (fixed bottom) */}
            {sActiveAppSide && (
                <div style={{ flex: '1 1 50%', minHeight: '150px', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--side-border, rgba(255,255,255,0.1))' }}>
                    <Side.Collapse pCollapseState={sAppSideCollapse} pCallback={() => setAppSideCollapse(!sAppSideCollapse)}>
                        <span style={{ flex: 1 }}>SIDE: {sActiveAppSide}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Close the matching appView tab using the same logic as tab close
                                const appViewTab = sBoardList.find((b: any) => b.type === 'appView' && b.code?.appName === sActiveAppSide);
                                if (appViewTab) {
                                    const { nextBoardList, nextSelectedTabId } = closeTabState(sBoardList, sSelectedTab, appViewTab.id);
                                    setBoardList(nextBoardList);
                                    setSelectedTab(nextSelectedTabId);
                                }
                                resetActiveAppSide();
                            }}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 4px', fontSize: '14px', lineHeight: 1 }}
                        >
                            ✕
                        </button>
                    </Side.Collapse>
                    {sAppSideCollapse && (
                        <iframe
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
