import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useRef, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { SideTitle } from '../SideForm';
import { IconButton } from '@/components/buttons/IconButton';
import { APP_INFO, getPkgsSync, getSearchPkgs, SEARCH_RES } from '@/api/repository/appStore';
import { gSearchPkgs, gExactPkgs, gPossiblePkgs, gBrokenPkgs, gSearchPkgName, gInstalledPkgs } from '@/recoil/appStore';
import { AppList } from './item';
import EnterCallback from '@/hooks/useEnter';
import { isCurUserEqualAdmin } from '@/utils';
import useDebounce from '@/hooks/useDebounce';

export const AppStore = ({ pServer }: any) => {
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
    const searchRef = useRef(null);
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
        <div className="side-form">
            <SideTitle pServer={pServer} />
            <div className="app-sotre-sub-title">
                <span className="title-text">PACKAGES</span>
                <span className="sub-title-navi">
                    {sIsAdmin && (
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Update"
                            pToolTipId="app-store-update"
                            pWidth={20}
                            pHeight={20}
                            pIcon={<MdRefresh size={15} />}
                            onClick={pkgsUpdate}
                        />
                    )}
                </span>
            </div>
            <div className="app-store-wrap" style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {/* SEARCH */}
                <div ref={searchRef} className="app-search-warp">
                    <input placeholder="Search" autoFocus onChange={handleSearchTxt} className="app-search-input" onKeyDown={(e) => EnterCallback(e, () => setEnter(sEnter + 1))} />
                </div>
                {/* INSTALLED */}
                <AppList pList={sInstalledPkgList} pTitle="INSTALLED" pStatus="POSSIBLE" />
                {/* EXACT */}
                <AppList pList={sExactPkgList} pTitle="FOUND" pStatus="EXACT" />
                {/* POSSIBLE */}
                <AppList pList={sPossiblePkgList} pTitle={sSearchTxt === '' ? 'FEATURED' : 'SEARCH'} pStatus="POSSIBLE" />
                {/* BROKEN */}
                <AppList pList={sBrokenPkgList} pTitle="BROKEN" pStatus="BROKEN" />
            </div>
        </div>
    );
};
