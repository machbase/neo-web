import './info.scss';
import { LuFlipVertical, LuScale } from 'react-icons/lu';
import { Page, SplitPane, Pane, Button, Toast } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { SlStar } from 'react-icons/sl';
import { VscExtensions, VscHome, VscPackage, VscRepoForked } from 'react-icons/vsc';
import moment from 'moment';
import { fetchPkgHubList, getPkgMarkdown, SEARCH_RES } from '@/api/repository/appStore';
import { useEffect, useState } from 'react';
import { runInstall, runUpdate, runUninstall, getInstalledVersion, type LifecycleContext } from './pkgLifecycle';
import { Markdown } from '@/components/worksheet/Markdown';
import { gActiveAppSide, gSearchPkgName, gSearchPkgs } from '@/recoil/appStore';
import { useRecoilState, useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { closeTabState } from '@/components/mainContent/tabCloseUtils';
import { MdDelete, MdDownload, MdUpdate } from 'react-icons/md';
import { BiLink } from '@/assets/icons/Icon';
import { isCurUserEqualAdmin } from '@/utils';
import { Tooltip } from 'react-tooltip';
import { getFiles } from '@/api/repository/fileTree';
import { fileTreeParser } from '@/utils/fileTreeParser';
import { gFileTree } from '@/recoil/fileTree';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    // Recoil
    const setPkgs = useSetRecoilState<SEARCH_RES>(gSearchPkgs);
    const sSearchPkgName = useRecoilValue<string>(gSearchPkgName);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<string>(gSelectedTab);
    const sActiveAppSide = useRecoilValue<string | null>(gActiveAppSide);
    const resetActiveAppSide = useResetRecoilState(gActiveAppSide);

    const setFileTree = useSetRecoilState(gFileTree);
    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['75%', '25%']);
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);
    const sIsAdmin = isCurUserEqualAdmin();
    // Which action is currently running, or null if idle. Used both for
    // per-button spinners and to gate concurrent clicks.
    const [sLoadingCommand, setLoadingCommand] = useState<'install' | 'uninstall' | 'update' | null>(null);
    const sIsBusy = sLoadingCommand !== null;

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
    // Update pkgs list (side) using GitHub hub.
    // Must mirror the shape produced by AppStoreSide.pkgsSearch so the
    // CATALOG (which reads gPossiblePkgs) does not vanish after install/uninstall.
    const pkgsUpdate = async () => {
        try {
            const [hubPkgs, installedNames] = await Promise.all([fetchPkgHubList(), getInstalledNames()]);
            const allPkgs = await Promise.all(
                hubPkgs.map(async (pkg) => {
                    if (!installedNames.has(pkg.name)) return pkg;
                    const installed_version = await getInstalledVersion(pkg.name);
                    return { ...pkg, installed_frontend: true, installed_version };
                })
            );
            const searchLower = sSearchPkgName.toLowerCase();
            const displayed = sSearchPkgName
                ? allPkgs.filter((pkg) => pkg.name.toLowerCase().includes(searchLower) || pkg.github.description.toLowerCase().includes(searchLower))
                : allPkgs;
            setPkgs({ installed: [], exact: [], possibles: displayed, broken: [] });
        } catch {
            setPkgs({ installed: [], exact: [], possibles: [], broken: [] });
        }
    };
    // Update pkg detail after install/uninstall
    const pkgDetailUpdate = async () => {
        const TAB_TYPE = 'appStore';
        const installedNames = await getInstalledNames();
        const isInstalled = installedNames.has(pCode.app.name);
        const installed_version = isInstalled ? await getInstalledVersion(pCode.app.name) : '';
        const updatedApp = { ...pCode.app, installed_frontend: isInstalled, installed_version };

        // eslint-disable-next-line no-console
        console.log('[pkgDetailUpdate]', {
            appName: pCode.app.name,
            installedNames: Array.from(installedNames),
            isInstalled,
            updatedApp_installed_frontend: updatedApp.installed_frontend,
        });

        setBoardList((aBoardList: any) => {
            const target = aBoardList.find((b: any) => b.type === TAB_TYPE && b.code?.app?.name === pCode.app.name);
            if (!target) {
                // eslint-disable-next-line no-console
                console.log('[pkgDetailUpdate] target tab not found in latest boardList');
                return aBoardList;
            }
            // eslint-disable-next-line no-console
            console.log('[pkgDetailUpdate] updating tab', target.id, 'from', target.code?.app?.installed_frontend, 'to', updatedApp.installed_frontend);
            return aBoardList.map((aBoard: any) => {
                if (aBoard.id !== target.id) return aBoard;
                return {
                    ...aBoard,
                    name: `PKG: ${pCode.app.name}`,
                    code: { app: updatedApp, status: pCode?.status ?? 'POSSIBLE' },
                    savedCode: { app: updatedApp, status: pCode?.status ?? 'POSSIBLE' },
                };
            });
        });
    };
    // Close the appView tab and reset the side iframe for the given package.
    // Called after uninstall so lingering main/side views of a removed package
    // don't keep pointing at /public/<name>/... which no longer exists.
    // Use updater form so we don't clobber the pkgDetailUpdate write (which
    // happens just before this) with a stale closure snapshot.
    const closeAppTabs = (appName: string) => {
        setBoardList((aBoardList: any) => {
            const appViewTab = aBoardList.find((b: any) => b.type === 'appView' && b.code?.appName === appName);
            if (!appViewTab) return aBoardList;
            const { nextBoardList, nextSelectedTabId } = closeTabState(aBoardList, sSelectedTab, appViewTab.id);
            setSelectedTab(nextSelectedTabId);
            return nextBoardList;
        });
        if (sActiveAppSide === appName) resetActiveAppSide();
    };
    // Run the install/uninstall pipeline. Button state is NOT set optimistically —
    // it is recomputed from filesystem truth via pkgsUpdate/pkgDetailUpdate after
    // the flow, so a half-installed state (e.g. copy ok but setup failed) still
    // surfaces the Uninstall button so the admin can clean up.
    const sendCommand = async (command: 'install' | 'update' | 'uninstall') => {
        if (sIsBusy) return;
        if (!sIsAdmin) return;
        setLoadingCommand(command);

        const appName = pCode?.app?.name ?? '';
        const ctx: LifecycleContext = {
            appName,
            fullName: pCode?.app?.github?.full_name ?? '',
            logs: [],
        };

        const flow = command === 'install' ? runInstall : command === 'update' ? runUpdate : runUninstall;
        const result = await flow(ctx);
        setCommandResLog(result.log || undefined);

        await pkgsUpdate();
        await pkgDetailUpdate();
        await updateFileTree();

        if (result.ok) {
            if (command === 'uninstall') closeAppTabs(appName);
            const verb = command === 'install' ? 'installed' : command === 'update' ? 'updated' : 'uninstalled';
            Toast.success(`${appName} ${verb}`);
        } else {
            Toast.error(`${appName} ${command} failed: ${result.reason}`);
        }
        setLoadingCommand(null);
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
        const isInstalled = !!pCode?.app?.installed_frontend;
        const hasUpdate =
            isInstalled && !!pCode?.app?.installed_version && !!pCode?.app?.latest_version && pCode.app.installed_version !== pCode.app.latest_version;
        return (
            <Page.DpRow>
                {/* INSTALL */}
                {!isInstalled && sIsAdmin && (
                    <Page.TextButton
                        pIcon={
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <MdDownload />
                            </div>
                        }
                        pText={'Install'}
                        pType="CREATE"
                        pWidth="80px"
                        pCallback={() => sendCommand('install')}
                        mr="8px"
                        mb="0px"
                        mt="4px"
                        pLoad={sLoadingCommand === 'install'}
                    />
                )}
                {/* UPDATE */}
                {hasUpdate && sIsAdmin && (
                    <Page.TextButton
                        pIcon={
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <MdUpdate />
                            </div>
                        }
                        pText={'Update'}
                        pType="CREATE"
                        pWidth="80px"
                        pCallback={() => sendCommand('update')}
                        mr="8px"
                        mb="0px"
                        mt="4px"
                        pLoad={sLoadingCommand === 'update'}
                    />
                )}
                {/* UNINSTALL */}
                {isInstalled && sIsAdmin && (
                    <Page.TextButton
                        pIcon={
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                        pLoad={sLoadingCommand === 'uninstall'}
                    />
                )}
            </Page.DpRow>
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
        // If BE reports work is in progress when the tab (re)mounts we cannot
        // tell which command triggered it; default the spinner to 'install'.
        setLoadingCommand(pCode?.work_in_progress ? 'install' : null);
        getReadme();
        setCommandResLog(undefined);
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
                                            {pCode?.app?.icon ? (
                                                <img src={pCode.app.icon} />
                                            ) : pCode?.app?.github?.owner?.avatar_url && pCode?.app?.github?.owner?.avatar_url !== '' ? (
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
                                                    <span>{pCode?.app?.latest_version ? `v${pCode.app.latest_version}` : 'N/A'}</span>
                                                </div>
                                                {!!pCode?.app?.installed_frontend &&
                                                    !!pCode?.app?.installed_version &&
                                                    !!pCode?.app?.latest_version &&
                                                    pCode.app.installed_version !== pCode.app.latest_version && (
                                                        <div className="app-store-item-info-contents-top-update">
                                                            <span>Update available</span>
                                                        </div>
                                                    )}
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
                                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px', overflow: 'hidden', minWidth: 0 }}>
                                            <Page.ContentText pContent={`Published by ${pCode?.app?.github?.organization}`} pWrap />
                                        </div>
                                    )}
                                    {/* HOMEPAGE */}
                                    {pCode?.app?.github?.homepage && pCode?.app?.github?.homepage !== '' && (
                                        <div
                                            style={{
                                                display: 'flex',
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
