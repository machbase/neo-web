import './item.scss';
import { APP_INFO, PKG_STATUS } from '@/api/repository/appStore';
import { useState } from 'react';
import { VscChevronDown, VscChevronRight, VscExtensions } from 'react-icons/vsc';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { generateUUID } from '@/utils';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';

export const AppItem = ({ pItem }: { pItem: APP_INFO }) => {
    const STATUS_ICON = () => {
        if (pItem?.installed_version && pItem?.installed_version !== '')
            return (
                <div className="app-store-item-contents-bottom-status">
                    <span className="install">Installed v{pItem?.installed_version}</span>
                </div>
            );
        else return <></>;
    };

    return (
        <div className="app-store-item">
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
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handleCollapse = () => {
        setCollapseState(() => !sCollapseState);
    };

    return (
        <>
            {pList && pList.length > 0 && (
                <div className="app-store-list-wrap">
                    <div className="app-store" onClick={handleCollapse}>
                        <div className="app-store-collapse-icon">{sCollapseState ? <VscChevronDown /> : <VscChevronRight />}</div>
                        <div className="app-store-list-title">
                            <span>{pTitle ?? ''}</span>
                        </div>
                    </div>
                    <div className="app-store-list">
                        {sCollapseState &&
                            pList.map((aItem: any, aIdx: number) => {
                                return (
                                    <div key={'pStatus-' + aIdx} onClick={() => handleSelectApp(aItem)}>
                                        <AppItem pItem={aItem} />
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </>
    );
};
