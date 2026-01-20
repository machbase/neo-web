import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { APP_INFO, getPkgsSync, getSearchPkgs, SEARCH_RES } from '@/api/repository/appStore';
import { gSearchPkgs, gExactPkgs, gPossiblePkgs, gBrokenPkgs, gSearchPkgName, gInstalledPkgs } from '@/recoil/appStore';
import { AppList } from './item';
import EnterCallback from '@/hooks/useEnter';
import { isCurUserEqualAdmin } from '@/utils';
import useDebounce from '@/hooks/useDebounce';
import { Side, Input, Button } from '@/design-system/components';

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
    const sIsAdmin = isCurUserEqualAdmin();

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
            setPkgs({
                installed: (sSearchRes?.data as SEARCH_RES).installed ?? [],
                exact: (sSearchRes?.data as SEARCH_RES)?.exact ? [sSearchRes?.data?.exact as APP_INFO] : [],
                possibles: (sSearchRes?.data as SEARCH_RES).possibles ?? [],
                // TODO (response string[])
                broken: (sSearchRes?.data as SEARCH_RES).broken ?? [],
            });
        } else
            setPkgs({
                installed: [],
                exact: [],
                possibles: [],
                broken: [],
            });
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
            <AppList pList={sInstalledPkgList} pTitle="INSTALLED" pStatus="POSSIBLE" />
            {/* EXACT */}
            <AppList pList={sExactPkgList} pTitle="FOUND" pStatus="EXACT" />
            {/* POSSIBLE */}
            <AppList pList={sPossiblePkgList} pTitle={sSearchTxt === '' ? 'FEATURED' : 'SEARCH'} pStatus="POSSIBLE" />
            {/* BROKEN */}
            <AppList pList={sBrokenPkgList} pTitle="BROKEN" pStatus="BROKEN" />
        </Side.Container>
    );
};
