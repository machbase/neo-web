import './info.scss';
import { LuFlipVertical, LuScale } from 'react-icons/lu';
import { Page, SplitPane, Pane, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { SlStar } from 'react-icons/sl';
import { VscBook, VscHome, VscInfo, VscRepoForked } from 'react-icons/vsc';
import moment from 'moment';
import { getPkgMarkdown, isGrandfatheredPkg } from '@/api/repository/appStore';
import { useExperiment } from '@/hooks/useExperiment';
import { useEffect, useMemo, useState } from 'react';
import { Markdown } from '@/components/worksheet/Markdown';
import { BiLink } from '@/assets/icons/Icon';
import { Tooltip } from 'react-tooltip';
import { comparePkgVersions, stripVPrefix, warnOncePkgVersion } from '@/utils/version/utils';
import { usePkgCommand } from './pkgLifecycle/usePkgCommand';
import { ConfirmCommandModal, type ConfirmableCommand } from './ConfirmCommandModal';
import { PkgIcon } from './PkgIcon';
import { readLocalReadme } from '@/api/repository/onpremCatalog';
import { useRecoilValue } from 'recoil';
import { gCatalogStatus } from '@/recoil/appStore';

/**
 * issue #1452 — shown when local-only mode is on and the package ships no README
 * on disk.
 *
 * Deliberately NOT the generic 'No repository information available.' / 'Failed to
 * load README.' wording: those describe something that went wrong and invite a
 * retry. Nothing went wrong here — the fetch was never attempted — and the reader
 * needs to know that the blank pane is the configured behaviour and where the
 * configuration lives.
 */
const LOCAL_ONLY_README_MSG = 'Local-only mode: remote READMEs are not fetched (/public/.pkg-conf.json). This package has no README.md installed on this server.';

export const AppInfo = ({ pCode }: { pCode: any }) => {
    const runCommand = usePkgCommand();
    const { getExperiment } = useExperiment();
    const sCatalogStatus = useRecoilValue(gCatalogStatus);
    const isLocalOnly = sCatalogStatus.mode === 'localOnly';

    // issue #1438: detail view for a package that only remains visible because it
    // is installed. Same policy as the catalog card — stays viewable and
    // removable, but must not advertise an update to an unvalidated version.
    const isGated = isGrandfatheredPkg(pCode?.app, getExperiment());

    // Scoped
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['75%', '25%']);
    const [sReadme, setReadme] = useState<string | undefined>(undefined);
    const [sReadmeError, setReadmeError] = useState<string | undefined>(undefined);
    const [sCommandResLog, setCommandResLog] = useState<string | undefined>(undefined);

    const appName: string = pCode?.app?.name ?? '';

    // SemVer-aware update check (shares the warnOncePkgVersion dedup Set with item.tsx
    // via the module-scoped guard in `@/utils/version/utils`). Hides the "Update available"
    // label on downgrade, equal, or non-SemVer inputs; only shows it when installed < latest.
    const hasUpdate = useMemo(() => {
        const installed = pCode?.app?.installed_version;
        const latest = pCode?.app?.latest_version;
        if (isGated) return false;
        if (!pCode?.app?.installed_frontend || !installed || !latest) return false;
        const r = comparePkgVersions(installed, latest);
        if (r === null) {
            warnOncePkgVersion(pCode?.app?.name ?? '', installed, latest);
            return false;
        }
        return r === -1;
    }, [isGated, pCode?.app?.installed_frontend, pCode?.app?.installed_version, pCode?.app?.latest_version, pCode?.app?.name]);

    // Surfaces a small info icon when both versions exist but cannot be SemVer-compared
    // (e.g. calendar-style "2024.01.15" vs "1.0.0"). Mirrors the same guard chain as
    // `hasUpdate` so the icon only appears in the exact case where the badge is hidden
    // due to non-SemVer inputs.
    const isUncomparable = useMemo(() => {
        if (!pCode?.app?.installed_frontend) return false;
        if (!pCode?.app?.installed_version || !pCode?.app?.latest_version) return false;
        return comparePkgVersions(pCode.app.installed_version, pCode.app.latest_version) === null;
    }, [pCode?.app?.installed_frontend, pCode?.app?.installed_version, pCode?.app?.latest_version]);

    const [pendingCmd, setPendingCmd] = useState<ConfirmableCommand | null>(null);

    const confirmPending = async () => {
        if (!pendingCmd || !pCode?.app) return;
        const cmd = pendingCmd;
        setPendingCmd(null);
        // issue #1452 — `removeDirectory` is the stray card's action and belongs to
        // the catalog row alone (`item.tsx` + `useStrayRemove`). It is NOT a package
        // lifecycle command and must never reach `runCommand`, which would route a
        // directory name into the package flows. The detail view cannot raise it —
        // nothing here sets it — so this is a type-level dead end, kept explicit so
        // it stays one.
        if (cmd === 'removeDirectory') return;
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

        // issue #1452 — LOCAL FIRST, and specifically BEFORE the github guard below.
        //
        // An installed package ships its own README at /public/{name}/README.md, on
        // the same origin as the console, so on an air-gapped server that is the only
        // copy that can ever load. It is also the copy that matches the *installed*
        // version rather than the repo's default branch.
        //
        // ORDERING IS LOAD-BEARING: a package installed from a local archive may have
        // no `github` block at all, and the `!sFullName || !sBranch` guard below is an
        // early return. Moving this read after it means those packages permanently
        // show "No repository information available." instead of the README sitting
        // right there on disk.
        if (pCode?.app?.installed_frontend && appName) {
            const local = await readLocalReadme(appName);
            if (local) {
                // NO relative-image rewriting here. The rewrite below points images at
                // raw.githubusercontent, which is exactly the host that is unreachable
                // in the case this branch exists for — a local README's relative links
                // already resolve against /public/{name}/.
                setReadme(local);
                return;
            }
        }

        // issue #1452 — LOCAL-ONLY STOPS HERE. The local read above is same-origin
        // and always allowed; everything below this line goes to
        // raw.githubusercontent, which is exactly what this mode forbids. Placed
        // AFTER the local read (so an installed package still shows its own README)
        // and BEFORE the github guard (so the message is about the policy, not
        // about missing repository metadata).
        if (isLocalOnly) {
            setReadmeError(LOCAL_ONLY_README_MSG);
            return;
        }

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
    // `isLocalOnly` is a dependency too: the mode can flip under an open detail tab
    // (a refresh picks up a newly written .pkg-conf.json), and the README strategy
    // must follow it rather than stay on whatever the tab opened with.
    useEffect(() => {
        getReadme();
        setCommandResLog(undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pCode, isLocalOnly]);

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
                                        <PkgIcon
                                            className="app-store-item-info-thumb"
                                            pName={pCode?.app?.name}
                                            pIcon={pCode?.app?.icon}
                                            pInstalled={!!pCode?.app?.installed_frontend}
                                            pAllowRemote={!isLocalOnly}
                                            pInstalledIcon={pCode?.app?.installed_icon}
                                        />
                                        <div className="app-store-item-info-contents">
                                            {/* TITLE & VERSION */}
                                            <Page.DpRow>
                                                <Page.ContentTitle>{pCode?.app?.name ?? ''}</Page.ContentTitle>
                                                <div className="app-store-item-info-contents-top-version">
                                                    <span>
                                                        {pCode?.app?.installed_frontend && pCode?.app?.installed_version
                                                            ? `v${stripVPrefix(pCode.app.installed_version)}`
                                                            : pCode?.app?.latest_version
                                                            ? `v${stripVPrefix(pCode.app.latest_version)}`
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                                {isUncomparable && (
                                                    <>
                                                        <VscInfo
                                                            className="app-store-version-uncomparable-icon"
                                                            data-tooltip-id="pkg-version-uncomparable"
                                                            style={{ marginLeft: 4, fontSize: 12, opacity: 0.7, cursor: 'help' }}
                                                        />
                                                        <Tooltip id="pkg-version-uncomparable" content="Version format not comparable (non-SemVer)" />
                                                    </>
                                                )}
                                                {hasUpdate && (
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
