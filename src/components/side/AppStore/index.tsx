import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { APP_INFO, getPkgAction, getPkgsSync, getSearchPkgs, SEARCH_RES } from '@/api/repository/appStore';
import { gSearchPkgs, gExactPkgs, gPossiblePkgs, gBrokenPkgs, gSearchPkgName, gInstalledPkgs } from '@/recoil/appStore';
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
    // SCOPED var
    const [sSearchTxt, setSearchTxt] = useState<string>('');
    const [sEnter, setEnter] = useState<number>(0);
    const [sRuntimeStatusMap, setRuntimeStatusMap] = useState<Record<string, RuntimeStatus>>({});
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
        <Side.Container>
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
        </Side.Container>
    );
};
