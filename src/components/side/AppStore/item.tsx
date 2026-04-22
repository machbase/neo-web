import './item.scss';
import { APP_INFO, PKG_STATUS } from '@/api/repository/appStore';
import { useState } from 'react';
import { VscExtensions } from 'react-icons/vsc';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { generateUUID } from '@/utils';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gActiveAppSide } from '@/recoil/appStore';
import { Loader } from '@/components/loader';
import { Side } from '@/design-system/components';

export const AppItem = ({ pItem }: { pItem: APP_INFO }) => {
    const isInstalled = !!pItem?.installed_frontend;
    const hasUpdate = !!(isInstalled && pItem?.installed_version && pItem?.latest_version && pItem.installed_version !== pItem.latest_version);

    const STATUS_ICON = () => {
        if (isInstalled && !pItem?.work_in_progress)
            return (
                <div className="app-store-item-contents-bottom-status">
                    <span className="install">Installed{pItem?.installed_version ? ` v${pItem.installed_version}` : ''}</span>
                    {hasUpdate && <span className="update">Update available</span>}
                </div>
            );
        else if (pItem?.work_in_progress) return <Loader width="12px" height="12px" />;
        else return <></>;
    };

    return (
        <div className="app-store-item">
            <div className="app-store-item-thumb">
                {pItem?.icon ? (
                    <img src={pItem.icon} />
                ) : pItem?.github?.owner?.avatar_url && pItem?.github?.owner?.avatar_url !== '' ? (
                    <img src={pItem?.github?.owner?.avatar_url} />
                ) : (
                    <VscExtensions />
                )}
            </div>
            <div className="app-store-item-contents">
                <div className="app-store-item-contents-top">
                    <div className="app-store-item-contents-top-title">
                        <span>{pItem?.name ?? ''}</span>
                    </div>
                    <div className="app-store-item-contents-top-version">
                        <span>{pItem?.latest_version ? `v${pItem.latest_version}` : 'N/A'}</span>
                    </div>
                </div>
                <div className="app-store-item-contents-desc">
                    <span>{pItem?.github.description ?? ''}</span>
                </div>
                <div className="app-store-item-contents-bottom">
                    {/* organization */}
                    <div className="app-store-item-contents-bottom-publisher">
                        <span>{pItem?.github.organization ?? ''}</span>
                    </div>
                    {/* STATUS ICON (CONFIG | INSTALL | UNINSTALL) */}
                    {STATUS_ICON()}
                </div>
            </div>
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
