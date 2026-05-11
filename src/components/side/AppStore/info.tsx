import './info.scss';
import { LuFlipVertical, LuScale } from 'react-icons/lu';
import { Page, SplitPane, Pane, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { SlStar } from 'react-icons/sl';
import { VscBook, VscExtensions, VscHome, VscRepoForked } from 'react-icons/vsc';
import moment from 'moment';
import { getPkgMarkdown } from '@/api/repository/appStore';
import { useEffect, useState } from 'react';
import { Markdown } from '@/components/worksheet/Markdown';
import { BiLink } from '@/assets/icons/Icon';
import { Tooltip } from 'react-tooltip';
import { usePkgCommand } from './pkgLifecycle/usePkgCommand';
import { ConfirmCommandModal, type ConfirmableCommand } from './ConfirmCommandModal';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    const runCommand = usePkgCommand();

    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['75%', '25%']);
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sReadmeError, setReadmeError] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);

    const appName: string = pCode?.app?.name ?? '';

    const [pendingCmd, setPendingCmd] = useState<ConfirmableCommand | null>(null);

    const confirmPending = async () => {
        if (!pendingCmd || !pCode?.app) return;
        const cmd = pendingCmd;
        setPendingCmd(null);
        try {
            const result = await runCommand(pCode.app, cmd);
            if (result?.log) setCommandResLog(result.log);
        } catch (e: any) {
            setCommandResLog(e?.message ?? `Failed to run "${cmd}".`);
        }
    };

    const tzTimeConverter = (time?: string) => {
        if (!time) return '';
        const m = moment(time);
        if (!m.isValid()) return '';
        return m.fromNow(); // 'A year ago'
    };
    const tzTimeFormatter = (time?: string) => {
        if (!time) return '';
        const m = moment(time);
        if (!m.isValid()) return '';
        return m.format('YYYY-MM-DD HH:mm:ss');
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };
    const getReadme = async () => {
        setReadme(undefined);
        setReadmeError(undefined);
        const sFullName = pCode?.app?.github?.full_name;
        const sBranch = pCode?.app?.github?.default_branch;
        if (!sFullName || !sBranch) {
            setReadmeError('No repository information available.');
            return;
        }
        const sFullPath = `${sFullName}/${sBranch}/README.md`;
        try {
            const res: any = await getPkgMarkdown(sFullPath);
            if (res && String(res)) {
                const regex = new RegExp(/([/|\w||-])*\.(?:jpg|gif|png)/, 'gm');
                const ImgNameRegex = new RegExp(/(!\[\w*\])/, 'gm');
                const parsedArr = String(res).split('\n');
                // TODO - res type text | json
                const gitRawUrl = `https://raw.githubusercontent.com`;
                const updateTxt = parsedArr.map((aRow: string) => {
                    if (aRow.match(regex)) {
                        // Absolute path
                        if (aRow.toUpperCase().includes('HTTP')) return aRow;
                        const sImgRelativePath = aRow.match(regex);
                        const sImgName = aRow.match(ImgNameRegex);
                        // Relative path
                        if (sImgRelativePath && sImgName) return `${sImgName[0]}(${gitRawUrl}/${sFullName}/${sBranch}/${sImgRelativePath[0]})`;
                        // Encode BASE-64 or etc..
                        else aRow;
                    } else return aRow;
                });
                setReadme(updateTxt.join('\n'));
            } else {
                setReadmeError(res?.data?.reason ?? res?.statusText ?? 'README is empty.');
            }
        } catch (e: any) {
            setReadmeError(e?.message ?? 'Failed to load README.');
        }
    };
    useEffect(() => {
        getReadme();
        setCommandResLog(undefined);
    }, [pCode]);

    if (!pCode?.app) {
        return (
            <Page>
                <Page.Header />
                <Page.Body>
                    <Page.ContentBlock pHoverNone>
                        <Page.ContentDesc>No package selected.</Page.ContentDesc>
                    </Page.ContentBlock>
                </Page.Body>
            </Page>
        );
    }

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
                                        <div className="app-store-item-info-thumb">{pCode?.app?.icon ? <img src={pCode.app.icon} /> : <VscExtensions />}</div>
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
                                            <Page.ContentDesc>{pCode?.app?.github?.description ?? ''}</Page.ContentDesc>
                                            {/* ORGANIZ & PUBS TIME */}
                                            <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                                                <Page.ContentDesc>
                                                    <div className="pkg-published-time-tooltip">
                                                        Published {pCode?.app?.published_at ? tzTimeConverter(pCode?.app?.published_at) : ''}
                                                    </div>
                                                    <Tooltip anchorSelect={`.pkg-published-time-tooltip`} content={tzTimeFormatter(pCode?.app?.published_at)} />
                                                </Page.ContentDesc>
                                            </div>
                                            {/* DOCS */}
                                            {pCode?.app?.docs && (
                                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', lineHeight: 1 }}>
                                                    <VscBook style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px', flexShrink: 0 }} />
                                                    <a
                                                        onClick={() =>
                                                            window.open(
                                                                pCode.app.docs.replace(
                                                                    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/,
                                                                    'https://github.com/$1/$2/blob/$3'
                                                                ),
                                                                '_blank'
                                                            )
                                                        }
                                                        style={{ fontSize: '13px', cursor: 'pointer' }}
                                                    >
                                                        Documentation
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Page.DpRow>
                                <div style={{ display: 'flex', flexDirection: 'row', marginTop: '8px', width: '100%', overflow: 'hidden' }}>
                                    {/* PUBLISHED BY */}
                                    {pCode?.app?.github?.organization && (
                                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px', overflow: 'hidden', minWidth: 0 }}>
                                            <Page.ContentText pContent={`Published by ${pCode.app.github.organization}`} pWrap />
                                        </div>
                                    )}
                                    {/* HOMEPAGE */}
                                    {pCode?.app?.github?.homepage && (
                                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                                            <VscHome style={{ marginRight: '4px', minWidth: '14px', minHeight: '14px', flexShrink: 0 }} />
                                            <a
                                                onClick={() => window.open(pCode.app.github.homepage, '_blank')}
                                                style={{
                                                    fontSize: '13px',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    textOverflow: 'ellipsis',
                                                    cursor: 'pointer',
                                                    minWidth: 0,
                                                }}
                                            >
                                                {pCode.app.github.homepage}
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
                                </div>
                                <Page.Space />
                                <Page.Hr />
                            </Page.ContentBlock>
                            {sReadmeError ? (
                                <Page.ContentBlock pHoverNone>
                                    <Page.ContentDesc>{sReadmeError}</Page.ContentDesc>
                                </Page.ContentBlock>
                            ) : (
                                <Markdown pIdx={1} pContents={sReadme ?? ''} pType="mrk" />
                            )}
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
            <ConfirmCommandModal pendingCmd={pendingCmd} pkgName={appName} onConfirm={confirmPending} onCancel={() => setPendingCmd(null)} />
        </>
    );
};
