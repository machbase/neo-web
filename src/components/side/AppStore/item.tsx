import './item.scss';
import { APP_INFO, PKG_STATUS } from '@/api/repository/appStore';
import { useState } from 'react';
import { VscExtensions } from 'react-icons/vsc';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { generateUUID } from '@/utils';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Loader } from '@/components/loader';
import { Side } from '@/design-system/components';
import { RuntimeStatus } from './runtimeStatus';
import { Tooltip } from 'react-tooltip';

export const AppItem = ({ pItem, pRuntimeStatus }: { pItem: APP_INFO; pRuntimeStatus?: RuntimeStatus }) => {
    const runtimeTooltipId = `pkg-runtime-tooltip-${pItem?.name ?? 'unknown'}`;
    const runtimeStatus = pRuntimeStatus === 'running' ? 'running' : pRuntimeStatus === 'frontend-only' ? 'frontend-only' : pRuntimeStatus ? 'stopped' : undefined;
    const runtimeTooltipContent = runtimeStatus === 'running' ? 'Running' : runtimeStatus === 'frontend-only' ? 'Frontend only' : 'Stopped';
    const showRuntimeIndicator = !!(runtimeStatus && pItem?.installed_version && pItem?.installed_version !== '' && !pItem?.work_in_progress);

    const STATUS_ICON = () => {
        if (pItem?.installed_version && pItem?.installed_version !== '' && !pItem?.work_in_progress)
            return (
                <div className="app-store-item-contents-bottom-status">
                    <span className="install">Installed v{pItem?.installed_version}</span>
                </div>
            );
        else if (pItem?.work_in_progress) return <Loader width="12px" height="12px" />;
        else return <></>;
    };

    return (
        <div className={`app-store-item ${showRuntimeIndicator ? 'app-store-item-with-runtime' : ''}`}>
            <div className="app-store-item-thumb">
                {pItem?.github?.owner?.avatar_url && pItem?.github?.owner?.avatar_url !== '' ? <img src={pItem?.github?.owner?.avatar_url} /> : <VscExtensions />}
            </div>
            <div className="app-store-item-contents">
                <div className="app-store-item-contents-top">
                    <div className="app-store-item-contents-top-title">
                        <span>{pItem?.name ?? ''}</span>
                    </div>
                    <div className="app-store-item-contents-top-version">
                        <span>v{pItem?.latest_version ?? ''}</span>
                        {showRuntimeIndicator && (
                            <>
                                <span
                                    className={`runtime runtime-${runtimeStatus}`}
                                    role="status"
                                    aria-label={`Runtime status: ${runtimeStatus}`}
                                    data-tooltip-id={runtimeTooltipId}
                                    data-tooltip-content={runtimeTooltipContent}
                                />
                                <Tooltip id={runtimeTooltipId} className="app-store-runtime-tooltip" place="top" />
                            </>
                        )}
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

export const AppList = ({
    pList,
    pTitle,
    pStatus,
    pRuntimeStatusMap,
}: {
    pList: APP_INFO[] | string[];
    pTitle: string;
    pStatus: PKG_STATUS;
    pRuntimeStatusMap?: Record<string, RuntimeStatus>;
}) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseState, setCollapseState] = useState<boolean>(true);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const TAB_TYPE = 'appStore';

    const handleSelectApp = (app: APP_INFO) => {
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
            return;
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
            return;
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
                        const runtimeStatus = pRuntimeStatusMap?.[aItem?.name];
                        return (
                            <div key={'pStatus-' + aIdx} onClick={() => handleSelectApp(aItem)}>
                                <AppItem pItem={aItem} pRuntimeStatus={runtimeStatus} />
                            </div>
                        );
                    })}
                </Side.List>
            )}
        </>
    ) : null;
};
