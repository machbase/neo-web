import './info.scss';
import { IconButton } from '@/components/buttons/IconButton';
import { LuFlipVertical, LuScale } from 'react-icons/lu';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { SlStar } from 'react-icons/sl';
import { VscExtensions, VscHome, VscPackage, VscRepoForked } from 'react-icons/vsc';
import moment from 'moment';
import { getCommandPkgs, getPkgMarkdown, getSearchPkgs, INSTALL, SEARCH_RES, UNINSTALL } from '@/api/repository/appStore';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from '@/components/worksheet/Markdown';
import { gSearchPkgName, gSearchPkgs } from '@/recoil/appStore';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { MdDelete, MdDownload } from 'react-icons/md';
import { BiLink, Play } from '@/assets/icons/Icon';
import { getUserName } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    // Recoil
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const sSearchPkgName = useRecoilValue(gSearchPkgName);
    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50%', '50%']);
    const fixBlockRef = useRef(null);
    const [sBracketHeight, setBracketHeight] = useState<string>('0px');
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);
    const sIsAdmin = getUserName() ? getUserName().toUpperCase() === ADMIN_ID.toUpperCase() : false;
    const [sIsBtnLoad, setIsBtnLoad] = useState<boolean>(false);

    // Update pkgs list (side)
    const pkgsUpdate = async (searchTxt: string) => {
        const sSearchRes: any = await getSearchPkgs(searchTxt);
        if (sSearchRes && sSearchRes?.success && sSearchRes?.data) {
            setPkgs({
                installed: (sSearchRes?.data as SEARCH_RES).installed ?? [],
                exact: (sSearchRes?.data as SEARCH_RES).exact ?? [],
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
                                name: `PKG: ${pCode.app.name}`,
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
        if (sIsBtnLoad) return;
        if (!sIsAdmin) return;
        setIsBtnLoad(true);
        const res: any = await getCommandPkgs(command, pCode.app.name);
        pkgsUpdate(sSearchPkgName);
        if (res && res?.success && res?.data) {
            pkgDetailUpdate(pCode.app.name, 1);
            setCommandResLog(res.data.log);
        } else setCommandResLog(res?.data?.log ? res?.data?.log : undefined);
        setIsBtnLoad(false);
    };
    const tzTimeConverter = (time: string) => {
        return moment(time).fromNow(); // 'A year ago'
        // return moment(time).format('YYYY-MM-DD HH:mm:ss');
    };
    const STATUS_ICON = () => {
        const sInstallTxt = pCode?.app?.installed_version !== '' && pCode?.app?.installed_version !== pCode?.app?.latest_version ? 'Upgrade' : 'Install';
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
                        pWidth="80px"
                        pCallback={() => sendCommand('install')}
                        mr="8px"
                        mb="0px"
                        mt="4px"
                        pLoad={sIsBtnLoad}
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
                                pLoad={sIsBtnLoad}
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
    const byteConverter = (byte: number) => {
        const sSquared = Math.abs(Math.trunc(byte)).toString().length - 1;
        const sOverflow = byte.toString().includes('+');
        if (sOverflow || sSquared >= 15) return byte / Math.pow(1000, 5) + ' PB';
        if (byte === 0) return byte.toFixed(0);
        if (sSquared === 0) return byte.toFixed(0) + ' B';
        if (sSquared < 3) return byte.toFixed(0) + ' B';
        if (sSquared < 6) return (byte / 1000).toFixed(0) + ' kB';
        if (sSquared < 9) return (byte / Math.pow(1000, 2)).toFixed(0) + ' MB';
        if (sSquared < 12) return (byte / Math.pow(1000, 3)).toFixed(0) + ' GB';
        if (sSquared < 15) return (byte / Math.pow(1000, 4)).toFixed(0) + ' TB';
        return byte;
    };

    useEffect(() => {
        if (fixBlockRef && fixBlockRef?.current && (fixBlockRef?.current as any)?.clientHeight > 0) setBracketHeight((fixBlockRef?.current as any)?.clientHeight + 'px');
    }, [(fixBlockRef?.current as any)?.clientHeight]);
    useEffect(() => {
        setIsBtnLoad(!!pCode?.work_in_progress);
        getReadme();
        setCommandResLog(undefined);
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
                                    <ExtensionTab.ContentBlock pHoverNone>
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
                                                    {/* TITLE & VERSION */}
                                                    <ExtensionTab.DpRow>
                                                        <ExtensionTab.ContentTitle>{pCode?.app?.name ?? ''}</ExtensionTab.ContentTitle>
                                                        <div className="app-store-item-info-contents-top-version">
                                                            <span>v{pCode?.app?.latest_version ?? ''}</span>
                                                        </div>
                                                    </ExtensionTab.DpRow>
                                                    {/* DESC */}
                                                    <ExtensionTab.ContentDesc>{pCode?.app?.github.description ?? ''}</ExtensionTab.ContentDesc>
                                                    {/* ORGANIZ & PUBS TIME */}
                                                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                                                        <ExtensionTab.ContentDesc>
                                                            Published {pCode?.app?.published_at ? tzTimeConverter(pCode?.app?.published_at) : ''}
                                                        </ExtensionTab.ContentDesc>
                                                    </div>
                                                    {STATUS_ICON()}
                                                </div>
                                            </div>
                                        </ExtensionTab.DpRow>
                                        <div style={{ display: 'flex', flexDirection: 'row', marginTop: '8px', width: '100%' }}>
                                            {/* PUBLISHED BY */}
                                            {pCode?.app?.github?.homepage && pCode?.app?.github?.homepage !== '' && (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px', overflow: 'hidden' }}>
                                                    <ExtensionTab.ContentText pContent={`Published by ${pCode?.app?.github?.organization}`} pWrap />
                                                </div>
                                            )}
                                            {/* HOMEPAGE */}
                                            {pCode?.app?.github?.homepage && pCode?.app?.github?.homepage !== '' && (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px', overflow: 'hidden' }}>
                                                    <VscHome style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                                    <a
                                                        onClick={() => window.open(pCode?.app?.github?.homepage, '_blank')}
                                                        style={{
                                                            fontSize: '13px',
                                                            marginTop: '4px',
                                                            overflow: 'hidden',
                                                            whiteSpace: 'nowrap',
                                                            textOverflow: 'ellipsis',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {pCode?.app?.github?.homepage}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'row', marginTop: '8px', width: '100%', flexWrap: 'wrap' }}>
                                            {/* GIT PAGE */}
                                            {pCode?.app?.github?.full_name && pCode?.app?.github?.full_name !== '' && (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px', overflow: 'hidden' }}>
                                                    <BiLink style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                                    <a
                                                        onClick={() => window.open('https://github.com/' + pCode?.app?.github?.full_name, '_blank')}
                                                        style={{
                                                            fontSize: '13px',
                                                            marginTop: '4px',
                                                            overflow: 'hidden',
                                                            whiteSpace: 'nowrap',
                                                            textOverflow: 'ellipsis',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {'https://github.com/' + pCode?.app?.github?.full_name}
                                                    </a>
                                                </div>
                                            )}
                                            {/* LICENSE */}
                                            {pCode?.app?.github?.license?.name && pCode?.app?.github?.license?.name !== '' && (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px', overflow: 'hidden' }}>
                                                    <LuScale style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                                    <a
                                                        onClick={() => window.open(pCode?.app?.github?.license?.url, '_blank')}
                                                        style={{
                                                            fontSize: '13px',
                                                            marginTop: '4px',
                                                            overflow: 'hidden',
                                                            whiteSpace: 'nowrap',
                                                            textOverflow: 'ellipsis',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {pCode?.app?.github?.license?.name}
                                                    </a>
                                                </div>
                                            )}
                                            {/* STAR */}
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px' }}>
                                                <SlStar style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                                <ExtensionTab.ContentText pContent={pCode?.app?.github?.stargazers_count ?? '0'} />
                                            </div>
                                            {/* FORKS COUNT */}
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px' }}>
                                                <VscRepoForked style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                                <ExtensionTab.ContentText pContent={pCode?.app?.github?.forks_count + ' forks' ?? ''} />
                                            </div>
                                            {/* SIZE */}
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px' }}>
                                                <VscPackage style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                                <ExtensionTab.ContentText pContent={byteConverter(pCode?.app?.latest_release_size)?.toString()} />
                                            </div>
                                        </div>
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.Hr />
                                </ExtensionTab.Body>
                            </div>
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock pHoverNone>
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
