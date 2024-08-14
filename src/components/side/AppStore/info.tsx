import './info.scss';
import { IconButton } from '@/components/buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { VscExtensions } from 'react-icons/vsc';
import moment from 'moment';
import { getCommandPkgs, getPkgMarkdown, getSearchPkgs, INSTALL, SEARCH_RES, UNINSTALL } from '@/api/repository/appStore';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from '@/components/worksheet/Markdown';
import { gSearchPkgs } from '@/recoil/appStore';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { MdDelete, MdDownload } from 'react-icons/md';
import { Play } from '@/assets/icons/Icon';
import { getUserName } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    // Recoil
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['60%', '40%']);
    const fixBlockRef = useRef(null);
    const [sBracketHeight, setBracketHeight] = useState<string>('0px');
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);
    const sIsAdmin = getUserName().toUpperCase() === ADMIN_ID.toUpperCase();

    // Update pkgs list (side)
    const pkgsUpdate = async (searchTxt: string) => {
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
    // Update pkg detail
    const pkgDetailUpdate = async (searchTxt: string, possible: number) => {
        const sPkgRes: any = await getSearchPkgs(searchTxt, possible);
        const TAB_TYPE = 'appStore';

        if (sPkgRes && sPkgRes?.success && sPkgRes?.data) {
            const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
                return prev || cur.type === TAB_TYPE;
            }, false);

            if (sExistKeyTab) {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TAB_TYPE);
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                name: `APP: ${pCode.app.name}`,
                                code: { app: sPkgRes?.data?.exact, status: 'EXACT' },
                                savedCode: { app: sPkgRes?.data?.exact, status: 'EXACT' },
                            };
                        }
                        return aBoard;
                    });
                });
                return;
            }
        }
    };
    // Send command (install | uninstall)
    const sendCommand = async (command: INSTALL | UNINSTALL) => {
        if (!sIsAdmin) return;
        const res: any = await getCommandPkgs(command, pCode.app.name);
        if (res && res?.success && res?.data) {
            pkgsUpdate('');
            pkgDetailUpdate(pCode.app.name, 1);
            setCommandResLog(res.data.log);
        } else setCommandResLog(res?.data?.log ? res?.data?.log : undefined);
    };
    const tzTimeConverter = (time: string) => {
        return moment(time).format('YYYY-MM-DD HH:mm:ss');
    };
    const STATUS_ICON = () => {
        const sInstallTxt = pCode?.app?.installed_version !== '' && pCode?.app?.installed_version !== pCode?.app?.latest_version ? 'Update' : 'Install';
        const sShowInstallBtn = sInstallTxt === 'Install' && pCode?.app?.installed_version && pCode?.app?.installed_version !== '' ? false : true;
        return (
            <ExtensionTab.DpRow>
                {/* INSTALL || UPDATE */}
                {sShowInstallBtn && sIsAdmin && (
                    <ExtensionTab.TextButton
                        pIcon={
                            <div style={{ marginRight: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <MdDownload />
                            </div>
                        }
                        pText={sInstallTxt}
                        pType="CREATE"
                        pWidth="65px"
                        pCallback={() => sendCommand('install')}
                        mr="8px"
                        mb="0px"
                        mt="4px"
                    />
                )}
                {pCode?.app?.installed_version && pCode?.app?.installed_version !== '' && (
                    <>
                        {/* UNINSTALL */}
                        {sIsAdmin && (
                            <ExtensionTab.TextButton
                                pIcon={
                                    <div style={{ marginRight: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <MdDelete />
                                    </div>
                                }
                                pText={'Uninstall'}
                                pType="DELETE"
                                pCallback={() => sendCommand('uninstall')}
                                mr="8px"
                                mb="0px"
                                mt="4px"
                            />
                        )}
                        {/* OPEN BROWSER */}
                        <ExtensionTab.TextButton
                            pIcon={
                                <div style={{ marginRight: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Play />
                                </div>
                            }
                            pWidth="130px"
                            pText={'Open in browser'}
                            pType="COPY"
                            pCallback={handleOpenBrowser}
                            mr="8px"
                            mb="0px"
                            mt="4px"
                        />
                    </>
                )}
            </ExtensionTab.DpRow>
        );
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };
    const getReadme = async () => {
        const sFullPath = `${pCode?.app?.github?.full_name}/${pCode?.app?.github?.default_branch}/README.md`;
        const res: any = await getPkgMarkdown(sFullPath);
        if (res && String(res)) {
            const regex = new RegExp(/([/|\w||-])*\.(?:jpg|gif|png)/, 'gm');
            const ImgNameRegex = new RegExp(/(!\[\w*\])/, 'gm');
            const parsedArr = res.split('\n');
            // TODO - res type text | json
            const gitRawUrl = `https://raw.githubusercontent.com`;
            const updateTxt = parsedArr.map((aRow: string) => {
                if (aRow.match(regex)) {
                    // Absolute path
                    if (aRow.toUpperCase().includes('HTTP')) return aRow;
                    const sImgRelativePath = aRow.match(regex);
                    const sImgName = aRow.match(ImgNameRegex);
                    // Relative path
                    if (sImgRelativePath && sImgName)
                        return `${sImgName[0]}(${gitRawUrl}/${pCode?.app?.github?.full_name}/${pCode?.app?.github?.default_branch}/${sImgRelativePath[0]})`;
                    // Encode BASE-64 or etc..
                    else aRow;
                } else return aRow;
            });
            setReadme(updateTxt.join('\n'));
        } else return setReadme(res?.data?.reason ?? res?.statusText);
    };
    const handleOpenBrowser = () => {
        const sOpenUrl = window.location.origin + '/web/apps/' + pCode?.app?.name;
        window.open(sOpenUrl);
    };

    useEffect(() => {
        if (fixBlockRef && fixBlockRef?.current && (fixBlockRef?.current as any)?.clientHeight > 0) setBracketHeight((fixBlockRef?.current as any)?.clientHeight + 'px');
    }, [(fixBlockRef?.current as any)?.clientHeight]);
    useEffect(() => {
        setCommandResLog(undefined);
        getReadme();
    }, [pCode]);

    return (
        <>
            <ExtensionTab>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    {
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <div ref={fixBlockRef}>
                                <ExtensionTab.Body fixed>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.DpRow>
                                            <div className="app-store-item-info">
                                                <div className="app-store-item-info-thumb">
                                                    {pCode?.app?.github?.owner?.avatar_url && pCode?.app?.github?.owner?.avatar_url !== '' ? (
                                                        <img src={pCode?.app?.github?.owner?.avatar_url} />
                                                    ) : (
                                                        <VscExtensions />
                                                    )}
                                                </div>
                                                <div className="app-store-item-info-contents">
                                                    <ExtensionTab.DpRow>
                                                        <ExtensionTab.ContentTitle>{pCode?.app?.name ?? ''}</ExtensionTab.ContentTitle>
                                                        <div className="app-store-item-info-contents-top-version">
                                                            <span>v{pCode?.app?.latest_version ?? ''}</span>
                                                        </div>
                                                    </ExtensionTab.DpRow>
                                                    <div style={{ display: 'flex' }}>
                                                        <div style={{ marginRight: '8px' }}>{pCode?.app?.github.organization}</div>
                                                        <ExtensionTab.ContentDesc>
                                                            published at {pCode?.app?.published_at ? tzTimeConverter(pCode?.app?.published_at) : ''}
                                                        </ExtensionTab.ContentDesc>
                                                    </div>
                                                    <ExtensionTab.ContentDesc>{pCode?.app?.github.description ?? ''}</ExtensionTab.ContentDesc>
                                                    {STATUS_ICON()}
                                                </div>
                                            </div>
                                        </ExtensionTab.DpRow>
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.Hr />
                                </ExtensionTab.Body>
                            </div>
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <Markdown pIdx={1} pContents={sReadme ?? ''} pType="mrk" />
                                </ExtensionTab.ContentBlock>
                                <div style={{ height: sBracketHeight }} />
                            </ExtensionTab.Body>
                        </Pane>
                    }
                    <Pane>
                        <ExtensionTab.Header>
                            <div />
                            <div style={{ display: 'flex' }}>
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="app-store-tab-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={() => setIsVertical(true)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="app-store-tab-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={() => setIsVertical(false)}
                                />
                            </div>
                        </ExtensionTab.Header>
                        <ExtensionTab.Body>
                            {sCommandResLog && (
                                <ExtensionTab.ContentBlock>
                                    <div style={{ display: 'flex' }}>
                                        <pre style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sCommandResLog}</pre>
                                    </div>
                                </ExtensionTab.ContentBlock>
                            )}
                        </ExtensionTab.Body>
                    </Pane>
                </SplitPane>
            </ExtensionTab>
        </>
    );
};
