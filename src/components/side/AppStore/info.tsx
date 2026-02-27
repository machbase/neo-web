import './info.scss';
import { IconButton } from '@/components/buttons/IconButton';
import { LuFlipVertical, LuScale } from 'react-icons/lu';
import { Page, SplitPane, Pane, Button, Toast } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { SlStar } from 'react-icons/sl';
import { VscExtensions, VscHome, VscPackage, VscRepoForked } from 'react-icons/vsc';
import moment from 'moment';
import { getCommandPkgs, getPkgAction, getPkgMarkdown, getSearchPkgs, INSTALL, PKG_ACTION, SEARCH_RES, UNINSTALL } from '@/api/repository/appStore';
import { useEffect, useState } from 'react';
import { Markdown } from '@/components/worksheet/Markdown';
import { gSearchPkgName, gSearchPkgs } from '@/recoil/appStore';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { MdDelete, MdDownload } from 'react-icons/md';
import { BiLink, Play } from '@/assets/icons/Icon';
import { isCurUserEqualAdmin } from '@/utils';
import { BiPause } from 'react-icons/bi';
import { Tooltip } from 'react-tooltip';
import { getFiles } from '@/api/repository/fileTree';
import { fileTreeParser } from '@/utils/fileTreeParser';
import { gFileTree } from '@/recoil/fileTree';
import { MdRefresh } from 'react-icons/md';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    // Recoil
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const sSearchPkgName = useRecoilValue(gSearchPkgName);
    const setFileTree = useSetRecoilState(gFileTree);
    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['75%', '25%']);
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);
    const sIsAdmin = isCurUserEqualAdmin();
    const [sIsBtnLoad, setIsBtnLoad] = useState<boolean>(false);
    const [sPkgBEStatus, setPkgBEStatus] = useState<string | undefined>(undefined);
    const PKG_RUNNING = 'running';

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
        const appName = pCode?.app?.name ?? 'Package';
        const action = command === 'install' ? 'installed' : 'uninstalled';
        const errorMessage = res?.data?.reason ?? res?.statusText ?? `${appName} ${command} failed`;

        pkgsUpdate(sSearchPkgName);
        if (res && res?.success && res?.data) {
            pkgDetailUpdate(pCode.app.name, 1);
            setCommandResLog(res.data.log);
            updateFileTree();
            Toast.success(`${appName} ${action}`);
        } else setCommandResLog(res?.data?.log ? res?.data?.log : undefined);
        if (!(res && res?.success && res?.data)) Toast.error(errorMessage);

        setIsBtnLoad(false);
    };
    // update file explorer
    const updateFileTree = async () => {
        const sReturn = await getFiles('/');
        if (sReturn && sReturn?.data) {
            const sParedData = fileTreeParser(sReturn.data, '/', 0, '0');
            setFileTree(JSON.parse(JSON.stringify(sParedData)));
        }
    };

    const tzTimeConverter = (time: string) => {
        return moment(time).fromNow(); // 'A year ago'
        // return moment(time).format('YYYY-MM-DD HH:mm:ss');
    };
    const tzTimeFormatter = (time: string) => {
        return moment(time).format('YYYY-MM-DD HH:mm:ss');
    };
    const STATUS_ICON = () => {
        const sInstallTxt = pCode?.app?.installed_version !== '' && pCode?.app?.installed_version !== pCode?.app?.latest_version ? 'Upgrade' : 'Install';
        const sShowInstallBtn = sInstallTxt === 'Install' && pCode?.app?.installed_version && pCode?.app?.installed_version !== '' ? false : true;
        return (
            <Page.DpRow>
                {/* INSTALL || UPDATE */}
                {sShowInstallBtn && sIsAdmin && (
                    <Page.TextButton
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
                            <Page.TextButton
                                pIcon={
                                    <div style={{ marginRight: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <MdDelete />
                                    </div>
                                }
                                pText={'Uninstall'}
                                pType="DELETE"
                                pWidth="80px"
                                pCallback={() => sendCommand('uninstall')}
                                mr="8px"
                                mb="0px"
                                mt="4px"
                                pLoad={sIsBtnLoad}
                            />
                        )}
                        {/* OPEN BROWSER */}
                        {/* FE indicator */}
                        {pCode?.app?.installed_frontend && (
                            <Page.TextButton
                                pIcon={
                                    <div style={{ marginRight: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <Play />
                                    </div>
                                }
                                pIsDisable={pCode?.app?.installed_backend && typeof sPkgBEStatus === 'string' && sPkgBEStatus === 'stopped'}
                                pWidth="80px"
                                pText={'Open'}
                                pType={pCode?.app?.installed_backend && typeof sPkgBEStatus === 'string' && sPkgBEStatus === 'stopped' ? 'COPY' : 'STATUS'}
                                pCallback={handleOpenBrowser}
                                mr="8px"
                                mb="0px"
                                mt="4px"
                            />
                        )}
                        {/* BE indicator */}
                        {sIsAdmin && pCode?.app?.installed_backend && (
                            <Page.TextButton
                                pIcon={
                                    <div style={{ marginRight: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        {sPkgBEStatus === PKG_RUNNING ? <BiPause /> : <Play />}
                                    </div>
                                }
                                pWidth="80px"
                                pText={sPkgBEStatus === PKG_RUNNING ? 'Stop' : 'Start'}
                                pType="STATUS"
                                pCallback={() => handlePkgSvrAction(sPkgBEStatus === PKG_RUNNING ? 'stop' : 'start')}
                                mr="8px"
                                mb="0px"
                                mt="4px"
                            />
                        )}
                        {/* BE status refresh */}
                        {sIsAdmin && pCode?.app?.installed_backend && (
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Refresh"
                                pToolTipId="pkg-be-status-refresh"
                                pWidth={20}
                                pHeight={20}
                                pIcon={<MdRefresh size={15} />}
                                onClick={() => handlePkgSvrAction('status')}
                            />
                        )}
                    </>
                )}
            </Page.DpRow>
        );
    };
    const handlePkgSvrAction = async (aStatus: PKG_ACTION) => {
        const sResPkgStatus: any = await getPkgAction(pCode?.app.name, aStatus);
        if (sResPkgStatus && sResPkgStatus?.success && sResPkgStatus?.data) setPkgBEStatus(sResPkgStatus?.data?.status);
        else setPkgBEStatus(undefined);
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
        setIsBtnLoad(!!pCode?.work_in_progress);
        getReadme();
        setCommandResLog(undefined);
        sIsAdmin && pCode?.app?.installed_backend && handlePkgSvrAction('status');
    }, [pCode]);

    return (
        <>
            <Page>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    <Pane minSize={400}>
                        <Page.Header />
                        <Page.Body>
                            <Page.ContentBlock pHoverNone pSticky>
                                <Page.DpRow>
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
                                            <Page.DpRow>
                                                <Page.ContentTitle>{pCode?.app?.name ?? ''}</Page.ContentTitle>
                                                <div className="app-store-item-info-contents-top-version">
                                                    <span>v{pCode?.app?.latest_version ?? ''}</span>
                                                </div>
                                            </Page.DpRow>
                                            {/* DESC */}
                                            <Page.ContentDesc>{pCode?.app?.github.description ?? ''}</Page.ContentDesc>
                                            {/* ORGANIZ & PUBS TIME */}
                                            <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                                                <Page.ContentDesc>
                                                    <div className="pkg-published-time-tooltip">
                                                        Published {pCode?.app?.published_at ? tzTimeConverter(pCode?.app?.published_at) : ''}
                                                    </div>
                                                    <Tooltip anchorSelect={`.pkg-published-time-tooltip`} content={tzTimeFormatter(pCode?.app?.published_at)} />
                                                </Page.ContentDesc>
                                            </div>
                                            {STATUS_ICON()}
                                        </div>
                                    </div>
                                </Page.DpRow>
                                <div style={{ display: 'flex', flexDirection: 'row', marginTop: '8px', width: '100%', overflow: 'hidden' }}>
                                    {/* PUBLISHED BY */}
                                    {pCode?.app?.github?.homepage && pCode?.app?.github?.homepage !== '' && (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '8px', overflow: 'hidden', minWidth: 0 }}>
                                            <Page.ContentText pContent={`Published by ${pCode?.app?.github?.organization}`} pWrap />
                                        </div>
                                    )}
                                    {/* HOMEPAGE */}
                                    {pCode?.app?.github?.homepage && pCode?.app?.github?.homepage !== '' && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: '8px',
                                                overflow: 'hidden',
                                                minWidth: 0,
                                                flex: 1,
                                            }}
                                        >
                                            <VscHome style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px', flexShrink: 0 }} />
                                            <a
                                                onClick={() => window.open(pCode?.app?.github?.homepage, '_blank')}
                                                style={{
                                                    fontSize: '13px',
                                                    marginTop: '4px',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    textOverflow: 'ellipsis',
                                                    cursor: 'pointer',
                                                    minWidth: 0,
                                                }}
                                            >
                                                {pCode?.app?.github?.homepage}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row', marginTop: '8px', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                                    {/* GIT PAGE */}
                                    {pCode?.app?.github?.full_name && pCode?.app?.github?.full_name !== '' && (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
                                            <BiLink style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px', flexShrink: 0 }} />
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
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
                                            <LuScale style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px', flexShrink: 0 }} />
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
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                        <SlStar style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                        <Page.ContentText pContent={pCode?.app?.github?.stargazers_count ?? '0'} />
                                    </div>
                                    {/* FORKS COUNT */}
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                        <VscRepoForked style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                        <Page.ContentText pContent={pCode?.app?.github?.forks_count + ' forks'} />
                                    </div>
                                    {/* SIZE */}
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                        <VscPackage style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px' }} />
                                        <Page.ContentText pContent={byteConverter(pCode?.app?.latest_release_size)?.toString()} />
                                    </div>
                                </div>
                                <Page.Space />
                                <Page.Hr />
                            </Page.ContentBlock>
                            <Markdown pIdx={1} pContents={sReadme ?? ''} pType="mrk" />
                        </Page.Body>
                    </Pane>
                    <Pane>
                        <Page.Header>
                            <div />
                            <Button.Group>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    active={isVertical}
                                    isToolTip
                                    toolTipContent="Vertical"
                                    icon={<LuFlipVertical size={16} style={{ transform: 'rotate(90deg)' }} />}
                                    onClick={() => setIsVertical(true)}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    active={!isVertical}
                                    isToolTip
                                    toolTipContent="Horizontal"
                                    icon={<LuFlipVertical size={16} />}
                                    onClick={() => setIsVertical(false)}
                                />
                            </Button.Group>
                        </Page.Header>
                        <Page.Body>
                            {sCommandResLog && (
                                <Page.ContentBlock>
                                    <div style={{ display: 'flex' }}>
                                        <pre style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sCommandResLog}</pre>
                                    </div>
                                </Page.ContentBlock>
                            )}
                        </Page.Body>
                    </Pane>
                </SplitPane>
            </Page>
        </>
    );
};
