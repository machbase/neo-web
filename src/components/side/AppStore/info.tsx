import './info.scss';
import { LuFlipVertical, LuScale } from 'react-icons/lu';
import { Page, SplitPane, Pane, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { SlStar } from 'react-icons/sl';
import { VscExtensions, VscHome, VscPackage, VscRepoForked } from 'react-icons/vsc';
import moment from 'moment';
import { getPkgMarkdown } from '@/api/repository/appStore';
import { useEffect, useState } from 'react';
import { Markdown } from '@/components/worksheet/Markdown';
import { gPkgBusy } from '@/recoil/appStore';
import { useRecoilValue } from 'recoil';
import { MdDelete, MdDownload, MdUpdate } from 'react-icons/md';
import { BiLink } from '@/assets/icons/Icon';
import { isCurUserEqualAdmin } from '@/utils';
import { Tooltip } from 'react-tooltip';
import { usePkgCommand } from './pkgLifecycle/usePkgCommand';
import { ConfirmCommandModal, type ConfirmableCommand } from './ConfirmCommandModal';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    const sBusy = useRecoilValue(gPkgBusy);
    const runCommand = usePkgCommand();

    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['75%', '25%']);
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);
    const sIsAdmin = isCurUserEqualAdmin();

    const appName: string = pCode?.app?.name ?? '';
    const sLoadingCommand = sBusy[appName] ?? null;
    const sIsBusy = sLoadingCommand !== null;

    const [pendingCmd, setPendingCmd] = useState<ConfirmableCommand | null>(null);

    const sendCommand = (command: ConfirmableCommand) => {
        if (sIsBusy || !sIsAdmin || !pCode?.app) return;
        setPendingCmd(command);
    };

    const confirmPending = async () => {
        if (!pendingCmd || !pCode?.app) return;
        const cmd = pendingCmd;
        setPendingCmd(null);
        const result = await runCommand(pCode.app, cmd);
        if (result?.log) setCommandResLog(result.log);
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
            <ConfirmCommandModal
                pendingCmd={pendingCmd}
                pkgName={appName}
                onConfirm={confirmPending}
                onCancel={() => setPendingCmd(null)}
            />
        </>
    );
};
