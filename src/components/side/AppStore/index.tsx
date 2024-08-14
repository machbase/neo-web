import './index.scss';
import { MdRefresh } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { SideTitle } from '../SideForm';
import { IconButton } from '@/components/buttons/IconButton';
import { getPkgsSync, getSearchPkgs, SEARCH_RES } from '@/api/repository/appStore';
import EnterCallback from '@/hooks/useEnter';
import { gSearchPkgs, gExactPkgs, gPossiblePkgs, gBrokenPkgs } from '@/recoil/appStore';
import { AppList } from './item';
import { CgExtensionAdd } from 'react-icons/cg';
import { getUserName } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';

export const AppStore = ({ pServer }: any) => {
    // RECOIL var
    const sExactPkgList = useRecoilValue(gExactPkgs);
    const sPossiblePkgList = useRecoilValue(gPossiblePkgs);
    const sBrokenPkgList = useRecoilValue(gBrokenPkgs);
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    // SCOPED var
    const [sSearchTxt, setSearchTxt] = useState<string>('');
    const searchRef = useRef(null);
    const sIsAdmin = getUserName().toUpperCase() === ADMIN_ID.toUpperCase();

    // pkgs update (ADMIN)
    const pkgsUpdate = async () => {
        if (!sIsAdmin) return;
        await getPkgsSync();
    };
    // pkgs search
    const pkgsSearch = async (searchTxt: string) => {
        const sSearchRes: any = await getSearchPkgs(searchTxt);
        if (sSearchRes && sSearchRes?.success && sSearchRes?.data) {
            setPkgs({
                exact: (sSearchRes?.data as SEARCH_RES).exact ?? [],
                possibles: (sSearchRes?.data as SEARCH_RES).possibles ?? [],
                // TODO (response string[])
                broken: (sSearchRes?.data as SEARCH_RES).broken ?? [],
            });
        } else
            setPkgs({
                exact: [],
                possibles: [],
                broken: [],
            });
        return sSearchRes;
    };
    const handleSearchTxt = (e: React.FormEvent<HTMLInputElement>) => {
        setSearchTxt((e.target as HTMLInputElement).value);
    };
    const searchReq = () => {
        pkgsSearch(sSearchTxt);
    };
    const refreshFetch = async () => {
        await pkgsUpdate();
        await pkgsSearch(sSearchTxt);
    };

    useEffect(() => {
        refreshFetch();
    }, []);

    return (
        <div className="side-form">
            <SideTitle pServer={pServer} />
            <div className="app-sotre-sub-title">
                <span className="title-text">APP STORE</span>
                <span className="sub-title-navi">
                    {sIsAdmin && (
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Update"
                            pToolTipId="app-store-update"
                            pWidth={20}
                            pHeight={20}
                            pIcon={<CgExtensionAdd size={15} />}
                            onClick={pkgsUpdate}
                        />
                    )}
                    <IconButton
                        pIsToopTip
                        pToolTipContent="Refresh"
                        pToolTipId="app-store-refresh"
                        pWidth={20}
                        pHeight={20}
                        pIcon={<MdRefresh size={15} />}
                        onClick={() => pkgsSearch(sSearchTxt)}
                    />
                </span>
            </div>
            <div className="app-store-wrap" style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {/* SEARCH */}
                <div ref={searchRef} className="app-search-warp">
                    <input placeholder="Search" autoFocus onChange={handleSearchTxt} className="app-search-input" onKeyDown={(e) => EnterCallback(e, searchReq)} />
                </div>
                {/* EXACT */}
                <AppList pList={sExactPkgList} pTitle="EXACT" pStatus="EXACT" />
                {/* POSSIBLE */}
                <AppList pList={sPossiblePkgList} pTitle="POSSIBLE" pStatus="POSSIBLE" />
                {/* BROKEN */}
                <AppList pList={sBrokenPkgList} pTitle="BROKEN" pStatus="BROKEN" />
            </div>
        </div>
    );
};
