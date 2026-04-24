import './item.scss';
import { APP_INFO, PKG_STATUS } from '@/api/repository/appStore';
import { useState } from 'react';
import { MdVerified } from 'react-icons/md';
import { VscExtensions } from 'react-icons/vsc';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { generateUUID, isCurUserEqualAdmin } from '@/utils';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gActiveAppSide, gPkgBusy, gPkgHealth, PkgCommand } from '@/recoil/appStore';
import { Loader } from '@/components/loader';
import { Side } from '@/design-system/components';
import { usePkgCommand } from './pkgLifecycle/usePkgCommand';
import { ConfirmCommandModal, type ConfirmableCommand } from './ConfirmCommandModal';

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

export const AppItem = ({ pItem }: { pItem: APP_INFO }) => {
    const isInstalled = !!pItem?.installed_frontend;
    const hasUpdate = !!(isInstalled && pItem?.installed_version && pItem?.latest_version && pItem.installed_version !== pItem.latest_version);
    const sIsAdmin = isCurUserEqualAdmin();

    const sBusy = useRecoilValue(gPkgBusy);
    const sHealth = useRecoilValue(gPkgHealth);
    const runCommand = usePkgCommand();

    const busyCmd = sBusy[pItem?.name] ?? null;
    const isBusy = busyCmd !== null;
    const health = sHealth[pItem?.name];
    const isReachable = !!health?.reachable;
    const isRunning = !!health?.running;

    // Visibility: cgi-bin/health controller responded ⇒ package supports
    // start/stop. data.healthy decides which side of the toggle is shown:
    // running ⇒ show Stop, otherwise ⇒ show Start.
    const showStart = sIsAdmin && isInstalled && isReachable && !isRunning;
    const showStop = sIsAdmin && isInstalled && isReachable && isRunning;
    const showInstall = sIsAdmin && !isInstalled;
    const showUpdate = sIsAdmin && hasUpdate;
    const showUninstall = sIsAdmin && isInstalled;

    const [pendingCmd, setPendingCmd] = useState<ConfirmableCommand | null>(null);

    const handle = (cmd: PkgCommand) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBusy) return;
        // start/stop run immediately; install/update/uninstall ask first
        if (cmd === 'start' || cmd === 'stop') {
            runCommand(pItem, cmd);
            return;
        }
        setPendingCmd(cmd as ConfirmableCommand);
    };

    const confirmPending = () => {
        if (!pendingCmd) return;
        const cmd = pendingCmd;
        setPendingCmd(null);
        runCommand(pItem, cmd);
    };

    return (
        <div className="app-store-item">
            <div className="app-store-item-head">
                <div className="app-store-item-thumb">
                    {pItem?.icon ? (
                        <img src={pItem.icon} />
                    ) : pItem?.github?.owner?.avatar_url && pItem?.github?.owner?.avatar_url !== '' ? (
                        <img src={pItem?.github?.owner?.avatar_url} />
                    ) : (
                        <VscExtensions />
                    )}
                </div>
                <div className="app-store-item-head-contents">
                    <div className="app-store-item-head-top">
                        <div className="app-store-item-head-title">
                            <span>{pItem?.name ?? ''}</span>
                        </div>
                        <div className="app-store-item-version">
                            {isInstalled && pItem?.installed_version ? (
                                <span className="install">v{pItem.installed_version}</span>
                            ) : (
                                <span>{pItem?.latest_version ? `v${pItem.latest_version}` : 'N/A'}</span>
                            )}
                            {hasUpdate && <span className="update">↑v{pItem.latest_version}</span>}
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
                            {(showStart || showStop) && (
                                <RunSwitch
                                    on={isRunning}
                                    onClick={handle(isRunning ? 'stop' : 'start')}
                                    loading={busyCmd === 'start' || busyCmd === 'stop'}
                                    disabled={isBusy}
                                />
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
                    {showInstall && (
                        <TextAction
                            label="Install"
                            onClick={handle('install')}
                            loading={busyCmd === 'install'}
                            disabled={isBusy}
                            variant="primary"
                        />
                    )}
                    {showUpdate && (
                        <TextAction label="Update" onClick={handle('update')} loading={busyCmd === 'update'} disabled={isBusy} variant="primary" />
                    )}
                    {showUninstall && (
                        <TextAction
                            label="Uninstall"
                            onClick={handle('uninstall')}
                            loading={busyCmd === 'uninstall'}
                            disabled={isBusy}
                            variant="default"
                        />
                    )}
                </div>
            </div>
            <ConfirmCommandModal
                pendingCmd={pendingCmd}
                pkgName={pItem?.name ?? ''}
                onConfirm={confirmPending}
                onCancel={() => setPendingCmd(null)}
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
