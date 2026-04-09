import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useState } from 'react';
import { useRecoilValue, useRecoilState, useSetRecoilState, useResetRecoilState } from 'recoil';
import { APP_INFO, getPkgAction, getPkgsSync, getSearchPkgs, SEARCH_RES } from '@/api/repository/appStore';
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

        if (statusTargets.length === 0) {
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

    // pkgs update (ADMIN)
    const pkgsUpdate = async () => {
        if (!sIsAdmin) return;
        await getPkgsSync();
        await pkgsSearch();
    };
    // pkgs search
    const pkgsSearch = async () => {
        const sSearchRes: any = await getSearchPkgs(sSearchTxt);
        setSearchPkgName(sSearchTxt);
        if (sSearchRes && sSearchRes?.success && sSearchRes?.data) {
            const installedPkgs = (sSearchRes?.data as SEARCH_RES).installed ?? [];

            // Dummy: neo-pkg-replication
            const dummyReplication: APP_INFO = {
                github: {
                    organization: 'machbase',
                    repo: 'neo-pkg-replication',
                    name: 'neo-pkg-replication',
                    full_name: 'machbase/neo-pkg-replication',
                    description: 'Machbase Neo replication package',
                    default_branch: 'main',
                    forks: 0,
                    forks_count: 0,
                    homepage: '',
                    language: 'Go',
                    private: false,
                    stargazers_count: 0,
                    license: null,
                    owner: null,
                },
                installed_backend: true,
                installed_frontend: true,
                installed_path: '/Users/kev/Documents/machbase/machbase_home/pkgs/dist/neo-pkg-replication/0.1.0',
                installed_version: '0.1.0',
                latest_release: 'v0.1.0',
                latest_release_size: 3200000,
                latest_release_tag: '0.1.0',
                latest_version: '0.1.0',
                name: 'neo-pkg-replication',
                published_at: '2026-03-28T10:00:00Z',
                strip_components: 1,
                work_in_progress: false,
            };
            if (!installedPkgs.some((p: APP_INFO) => p.name === 'neo-pkg-replication')) {
                installedPkgs.push(dummyReplication);
            }

            // Dummy: neo-pkg-opcua-client
            const dummyOpcuaClient: APP_INFO = {
                github: {
                    organization: 'machbase',
                    repo: 'neo-pkg-opcua-client',
                    name: 'neo-pkg-opcua-client',
                    full_name: 'machbase/neo-pkg-opcua-client',
                    description: 'Machbase Neo OPC-UA client package',
                    default_branch: 'main',
                    forks: 0,
                    forks_count: 0,
                    homepage: '',
                    language: 'Go',
                    private: false,
                    stargazers_count: 0,
                    license: null,
                    owner: null,
                },
                installed_backend: true,
                installed_frontend: true,
                installed_path: '/Users/kev/Documents/machbase/machbase_home/pkgs/dist/neo-pkg-opcua-client/0.1.0',
                installed_version: '0.1.0',
                latest_release: 'v0.1.0',
                latest_release_size: 3200000,
                latest_release_tag: '0.1.0',
                latest_version: '0.1.0',
                name: 'neo-pkg-opcua-client',
                published_at: '2026-03-28T10:00:00Z',
                strip_components: 1,
                work_in_progress: false,
            };
            if (!installedPkgs.some((p: APP_INFO) => p.name === 'neo-pkg-opcua-client')) {
                installedPkgs.push(dummyOpcuaClient);
            }

            // Dummy: neo-pkg-blackbox
            const dummyBlackbox: APP_INFO = {
                github: {
                    organization: 'machbase',
                    repo: 'neo-pkg-blackbox',
                    name: 'neo-pkg-blackbox',
                    full_name: 'machbase/neo-pkg-blackbox',
                    description: 'Machbase Neo blackbox package',
                    default_branch: 'main',
                    forks: 0,
                    forks_count: 0,
                    homepage: '',
                    language: 'Go',
                    private: false,
                    stargazers_count: 0,
                    license: null,
                    owner: null,
                },
                installed_backend: true,
                installed_frontend: true,
                installed_path: '/Users/kev/Documents/machbase/machbase_home/pkgs/dist/neo-pkg-blackbox/0.1.0',
                installed_version: '0.1.0',
                latest_release: 'v0.1.0',
                latest_release_size: 3200000,
                latest_release_tag: '0.1.0',
                latest_version: '0.1.0',
                name: 'neo-pkg-blackbox',
                published_at: '2026-03-28T10:00:00Z',
                strip_components: 1,
                work_in_progress: false,
            };
            if (!installedPkgs.some((p: APP_INFO) => p.name === 'neo-pkg-blackbox')) {
                installedPkgs.push(dummyBlackbox);
            }

            setPkgs({
                installed: installedPkgs,
                exact: (sSearchRes?.data as SEARCH_RES)?.exact ? [sSearchRes?.data?.exact as APP_INFO] : [],
                possibles: (sSearchRes?.data as SEARCH_RES).possibles ?? [],
                // TODO (response string[])
                broken: (sSearchRes?.data as SEARCH_RES).broken ?? [],
            });
            await refreshRuntimeStatus(installedPkgs);
        } else {
            setPkgs({
                installed: [],
                exact: [],
                possibles: [],
                broken: [],
            });
            setRuntimeStatusMap({});
        }
        return sSearchRes;
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
                    {sIsAdmin ? (
                        <Button.Group>
                            <Button size="side" variant="none" isToolTip toolTipContent="Update" icon={<MdRefresh size={16} />} onClick={pkgsUpdate} />
                        </Button.Group>
                    ) : null}
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
