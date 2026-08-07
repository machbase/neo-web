import './item.scss';
import { APP_INFO, isGrandfatheredPkg, PKG_STATUS } from '@/api/repository/appStore';
import { useMemo, useState } from 'react';
import { MdVerified } from 'react-icons/md';
import { VscBeaker, VscChevronDown, VscExtensions, VscWarning } from 'react-icons/vsc';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { generateUUID, isCurUserEqualAdmin } from '@/utils';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gActiveAppSide, gPkgBusy, gPkgHealth, gServerVersion } from '@/recoil/appStore';
import { Loader } from '@/components/loader';
import { Side } from '@/design-system/components';
import { computeEligibility, stripVPrefix } from '@/utils/version/utils';
import { useExperiment } from '@/hooks/useExperiment';
import { usePkgCommand } from './pkgLifecycle/usePkgCommand';
import { ConfirmCommandModal, type ConfirmableCommand } from './ConfirmCommandModal';
import { PkgVersionMenu } from './PkgVersionMenu';
import { ServiceSummaryChip } from './ServiceSummaryChip';

type RunSwitchProps = {
    on: boolean;
    onClick: (e: React.MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
};

const RunSwitch = ({ on, onClick, loading, disabled }: RunSwitchProps) => (
    <button
        type="button"
        title={on ? 'Stop' : 'Start'}
        className={`app-store-item-switch${on ? ' app-store-item-switch--on' : ''}${loading ? ' app-store-item-switch--loading' : ''}`}
        onClick={onClick}
        disabled={disabled || loading}
        aria-pressed={on}
    >
        <span className="app-store-item-switch-thumb">{loading ? <Loader width="6px" height="6px" /> : null}</span>
    </button>
);

type TextActionProps = {
    label: string;
    onClick: (e: React.MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'danger';
};

const TextAction = ({ label, onClick, loading, disabled, variant = 'default' }: TextActionProps) => (
    <button
        type="button"
        className={`app-store-item-text-action app-store-item-text-action--${variant}`}
        onClick={onClick}
        disabled={disabled || loading}
    >
        {loading ? <Loader width="12px" height="12px" /> : label}
    </button>
);

type SplitActionProps = {
    label: string;
    onPrimary: (e: React.MouseEvent) => void;
    onToggle: (e: React.MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
    // Disables the primary action while leaving the caret usable — for the case
    // where the catalog offers no default target but the menu still has something
    // to offer (the experiment-mode custom-version input).
    primaryDisabled?: boolean;
    variant?: 'primary' | 'update';
};

// Install/Update split button (issue #1369): primary applies the default target,
// the caret opens the version-selection menu.
const SplitAction = ({ label, onPrimary, onToggle, loading, disabled, primaryDisabled, variant = 'primary' }: SplitActionProps) => (
    <div className={`app-store-item-split app-store-item-split--${variant}`}>
        <button type="button" className="app-store-item-split-main" onClick={onPrimary} disabled={disabled || loading || primaryDisabled}>
            {loading ? <Loader width="12px" height="12px" /> : label}
        </button>
        <button type="button" className="app-store-item-split-caret" onClick={onToggle} disabled={disabled || loading} aria-label="Select version">
            <VscChevronDown size={12} />
        </button>
    </div>
);

export const AppItem = ({ pItem }: { pItem: APP_INFO }) => {
    const isInstalled = !!pItem?.installed_frontend;
    const sServerVersion = useRecoilValue(gServerVersion);

    // issue #1369: classify the hub `versions[]` against the current server version
    // and the installed version → eligible set, default install/update targets,
    // and server-downgrade incompatibility. Replaces the old single-`latest_version`
    // SemVer compare; minServer-aware throughout.
    const eligibility = useMemo(
        () => computeEligibility(pItem?.versions ?? [], sServerVersion, isInstalled ? pItem?.installed_version : undefined),
        [pItem?.versions, sServerVersion, isInstalled, pItem?.installed_version]
    );

    // issue #1438: this card is only on screen because the package is already
    // installed — the experiment gate would otherwise have removed it. Keep it
    // removable (uninstall / stop stay untouched below) but stop advertising
    // change: the package was pulled back for revalidation, so pushing its newer
    // unvalidated versions at a non-experiment user defeats the recall.
    const { getExperiment } = useExperiment();
    const experimentOn = getExperiment();
    const isGated = isGrandfatheredPkg(pItem, experimentOn);

    const hasUpdate = isInstalled && !!eligibility.defaultUpdate && !isGated;
    const canInstall = !!eligibility.defaultInstall && !isGated; // false when every version is ineligible

    // In experiment mode the version menu carries a free-form "Custom version"
    // input, so it is worth opening even when the catalog offers no installable
    // target. That happens whenever versions[] is empty — most commonly because
    // the package's only GitHub release is a pre-release, which `releases/latest`
    // skips, so the hub publishes no version at all. Without this the caret never
    // renders and the input is unreachable, leaving the package impossible to
    // install from the UI.
    const canPickCustomVersion = experimentOn && !isGated;
    const isIncompatible = isInstalled && eligibility.isIncompatible;
    const sIsAdmin = isCurUserEqualAdmin();

    const sBusy = useRecoilValue(gPkgBusy);
    const sHealth = useRecoilValue(gPkgHealth);
    const runCommand = usePkgCommand();

    const busyCmd = sBusy[pItem?.name] ?? null;
    const isBusy = busyCmd !== null;
    const health = sHealth[pItem?.name];
    const isReachable = !!health?.reachable;
    const isRunning = !!health?.running;

    // Slot policy: only `packageService.managed === false` (explicit opt-out
    // in package.json) hides the RunSwitch and shows ServiceSummaryChip
    // instead. Every other case — managed=true, missing key, unreachable
    // health controller — keeps the RunSwitch visible; cgi-bin/health
    // failures just disable the toggle so the user gets a clear "BE not
    // responding" affordance rather than an empty slot.
    const isUnmanaged = pItem?.installed_packageService?.managed === false;
    const showRunSwitch = sIsAdmin && isInstalled && !isUnmanaged;
    const showInstall = sIsAdmin && !isInstalled;
    const showUpdate = sIsAdmin && hasUpdate;
    const showUninstall = sIsAdmin && isInstalled;

    // install/update/uninstall all confirm first; install/update carry the chosen version.
    const [pending, setPending] = useState<{ cmd: ConfirmableCommand; version?: string } | null>(null);
    const [menu, setMenu] = useState<{ mode: 'install' | 'update'; pos: { x: number; y: number } } | null>(null);

    // start/stop run immediately (no confirmation).
    const handleRunSwitch = (cmd: 'start' | 'stop') => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        runCommand(pItem, cmd);
    };

    // install/update primary button → confirm the default target.
    const handlePrimary = (cmd: 'install' | 'update') => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        setPending({ cmd, version: cmd === 'install' ? eligibility.defaultInstall : eligibility.defaultUpdate });
    };

    // caret toggles the version-selection menu anchored under it.
    const handleToggleMenu = (mode: 'install' | 'update') => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenu((prev) => (prev?.mode === mode ? null : { mode, pos: { x: rect.left, y: rect.bottom + 4 } }));
    };

    // picking a version from the menu → confirm that specific version.
    const handleSelectVersion = (cmd: 'install' | 'update', version: string) => {
        setMenu(null);
        if (isBusy) return;
        setPending({ cmd, version });
    };

    const handleUninstall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        setPending({ cmd: 'uninstall' });
    };

    // confirmed → run with the chosen version (when set).
    const confirmPending = () => {
        if (!pending) return;
        const { cmd, version } = pending;
        setPending(null);
        runCommand(pItem, cmd, version);
    };

    return (
        <div className="app-store-item">
            <div className="app-store-item-head">
                <div className="app-store-item-thumb">
                    {pItem?.icon ? <img src={pItem.icon} /> : <VscExtensions />}
                </div>
                <div className="app-store-item-head-contents">
                    <div className="app-store-item-head-top">
                        <div className="app-store-item-head-title">
                            <span>{pItem?.name ?? ''}</span>
                        </div>
                        <div className="app-store-item-version">
                            {isInstalled && pItem?.installed_version ? (
                                <span className="install">v{stripVPrefix(pItem.installed_version)}</span>
                            ) : (
                                <span>{pItem?.latest_version ? `v${stripVPrefix(pItem.latest_version)}` : 'N/A'}</span>
                            )}
                            {hasUpdate && eligibility.defaultUpdate && <span className="update">↑v{stripVPrefix(eligibility.defaultUpdate)}</span>}
                            {isGated && (
                                <span className="experiment" title="This package is under validation. Updates are unavailable until it is released.">
                                    <VscBeaker size={11} /> under validation
                                </span>
                            )}
                            {isIncompatible && (
                                <span
                                    className="incompat"
                                    title={`Current server ${sServerVersion || 'unknown'} < required ${eligibility.installedMinServer ?? ''}`}
                                >
                                    <VscWarning size={11} /> incompatible
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="app-store-item-head-publisher">
                        <div className="app-store-item-head-publisher-name">
                            {pItem?.github?.organization === 'machbase' && (
                                <MdVerified size={12} className="app-store-item-verified" title="Verified publisher" />
                            )}
                            <span>{pItem?.github?.organization ?? ''}</span>
                        </div>
                        <div className="app-store-item-head-status" onClick={(e) => e.stopPropagation()}>
                            {showRunSwitch && (
                                <RunSwitch
                                    on={isRunning}
                                    onClick={handleRunSwitch(isRunning ? 'stop' : 'start')}
                                    loading={busyCmd === 'start' || busyCmd === 'stop'}
                                    disabled={isBusy || !isReachable}
                                />
                            )}
                            {isInstalled && isUnmanaged && (
                                <ServiceSummaryChip summary={health?.serviceSummary} pkgName={pItem?.name ?? ''} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="app-store-item-foot">
                <div className="app-store-item-desc">
                    <span>{pItem?.github.description ?? ''}</span>
                </div>
                <div className="app-store-item-actions">
                    {showInstall && canInstall && (
                        <SplitAction
                            label="Install"
                            onPrimary={handlePrimary('install')}
                            onToggle={handleToggleMenu('install')}
                            loading={busyCmd === 'install'}
                            disabled={isBusy}
                            variant="primary"
                        />
                    )}
                    {showInstall && !canInstall && canPickCustomVersion && (
                        <SplitAction
                            label="Install"
                            onPrimary={(e) => e.stopPropagation()}
                            onToggle={handleToggleMenu('install')}
                            primaryDisabled
                            loading={busyCmd === 'install'}
                            disabled={isBusy}
                            variant="primary"
                        />
                    )}
                    {showInstall && !canInstall && !canPickCustomVersion && (
                        <TextAction
                            label="Install"
                            onClick={(e) => e.stopPropagation()}
                            disabled
                            variant="primary"
                        />
                    )}
                    {showUpdate && (
                        <SplitAction
                            label="Update"
                            onPrimary={handlePrimary('update')}
                            onToggle={handleToggleMenu('update')}
                            loading={busyCmd === 'update'}
                            disabled={isBusy}
                            variant="update"
                        />
                    )}
                    {showUninstall && (
                        <TextAction
                            label="Uninstall"
                            onClick={handleUninstall}
                            loading={busyCmd === 'uninstall'}
                            disabled={isBusy}
                            variant="default"
                        />
                    )}
                </div>
            </div>
            {menu && (
                <PkgVersionMenu
                    isOpen={true}
                    position={menu.pos}
                    mode={menu.mode}
                    serverVersion={sServerVersion}
                    rows={eligibility.rows}
                    onSelect={(version) => handleSelectVersion(menu.mode, version)}
                    onClose={() => setMenu(null)}
                />
            )}
            <ConfirmCommandModal
                pendingCmd={pending?.cmd ?? null}
                pkgName={pItem?.name ?? ''}
                version={pending?.version}
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
        </div>
    );
};

export const AppList = ({ pList, pTitle, pStatus }: { pList: APP_INFO[] | string[]; pTitle: string; pStatus: PKG_STATUS }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseState, setCollapseState] = useState<boolean>(true);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const sSelectedTab = useRecoilValue<any>(gSelectedTab);
    const setActiveAppSide = useSetRecoilState(gActiveAppSide);
    const TAB_TYPE = 'appStore';
    const sSelectedBoard = sBoardList.find((b: any) => b.id === sSelectedTab);
    const sSelectedAppName = sSelectedBoard?.type === TAB_TYPE ? sSelectedBoard?.code?.app?.name : undefined;
    const sSelectedAppViewName = sSelectedBoard?.type === 'appView' ? sSelectedBoard?.code?.appName : undefined;

    const checkHtmlExists = async (url: string): Promise<boolean> => {
        try {
            const res = await fetch(url, { method: 'GET', headers: { Accept: 'text/html' } });
            return res.ok && (res.headers.get('content-type')?.includes('text/html') ?? false);
        } catch {
            return false;
        }
    };

    const openAppViewTab = (appName: string, boardList: any[]) => {
        const APP_VIEW_TYPE = 'appView';
        const existingTab = boardList.find((b: any) => b.type === APP_VIEW_TYPE && b.code?.appName === appName);
        if (existingTab) {
            setSelectedTab(existingTab.id);
        } else {
            const sId = generateUUID();
            setBoardList((prev: any[]) => [
                ...prev,
                {
                    id: sId,
                    type: APP_VIEW_TYPE,
                    name: `APP: ${appName}`,
                    code: { appName },
                    savedCode: { appName },
                    path: '',
                },
            ]);
            setSelectedTab(sId);
        }
    };

    const handleSelectApp = async (app: APP_INFO) => {
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
                            name: `PKG: ${app.name}`,
                            code: { app, status: pStatus },
                            savedCode: { app, status: pStatus },
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: TAB_TYPE,
                    name: `PKG: ${app.name}`,
                    code: { app, status: pStatus },
                    savedCode: { app, status: pStatus },
                    path: '',
                },
            ]);
            setSelectedTab(sId);
        }

        // For installed packages with frontend, check main.html / side.html
        if (app.installed_frontend) {
            const origin = window.location.origin;
            const [hasMain, hasSide] = await Promise.all([
                checkHtmlExists(`${origin}/public/${app.name}/main.html`),
                checkHtmlExists(`${origin}/public/${app.name}/side.html`),
            ]);
            if (hasMain) openAppViewTab(app.name, sBoardList);
            setActiveAppSide(hasSide ? app.name : null);
        } else {
            setActiveAppSide(null);
        }
    };
    const handleCollapse = () => {
        setCollapseState(() => !sCollapseState);
    };

    return pList && pList.length > 0 ? (
        <>
            <Side.Collapse pCollapseState={sCollapseState} pCallback={handleCollapse}>
                <span>{pTitle ?? ''}</span>
            </Side.Collapse>

            {sCollapseState && (
                <Side.List>
                    {pList.map((aItem: any, aIdx: number) => {
                        return (
                            <div
                                key={'pStatus-' + aIdx}
                                onClick={() => handleSelectApp(aItem)}
                                style={
                                    sSelectedAppViewName === aItem?.name || sSelectedAppName === aItem?.name
                                        ? { background: 'rgba(255, 255, 255, 0.15)', boxShadow: 'inset 2px 0 0 0 #005fb8' }
                                        : undefined
                                }
                            >
                                <AppItem pItem={aItem} />
                            </div>
                        );
                    })}
                </Side.List>
            )}
        </>
    ) : null;
};
