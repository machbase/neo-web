import { MdRefresh } from 'react-icons/md';
import { SideTitle, SideCollapse } from './SideForm';
import { IconButton } from '../buttons/IconButton';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveBridge, gActiveSubr, gBoardList, gBridgeList, gSelectedTab, setBridgeTree } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import { BridgeItemType, getBridge, getSubr } from '@/api/repository/bridge';
import icons from '@/utils/icons';
import { SUBSCRIBER_TYPE } from '../bridge/content';

import './Bridge.scss';

export const BridgeSide = ({ pServer }: any) => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sIsCollapse, setIsCollapse] = useState<boolean>(true);
    const [sBridge, setBridge] = useRecoilState<BridgeItemType[]>(gBridgeList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveBridge);
    const [sActiveSubrName, setActiveSubrName] = useRecoilState<any>(gActiveSubr);
    const BRIDGE_TYPE = 'bridge';
    const SUBR_TYPE = 'subscriber';

    const getBridgeList = async () => {
        const sResBridge = await getBridge();
        if (sResBridge?.success) {
            const sResSubr = await getSubr();
            if (sResSubr?.success) setBridge(setBridgeTree(sResBridge.data, sResSubr.data));
            else setBridge(setBridgeTree(sResBridge.data, []));
        } else setBridge([]);
    };
    const checkExistTab = (aType: string) => {
        const sResut = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === aType;
        }, false);
        return sResut;
    };
    // OPEN SUBSCRIBER
    const openSubrInfo = (aItem: any, aInfo: any) => {
        const sExistKeyTab = checkExistTab(SUBR_TYPE);
        setActiveSubrName(aInfo.name);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === SUBR_TYPE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `SUBR: ${aInfo.name}`,
                            code: { bridge: aItem, subr: aInfo },
                            savedCode: { bridge: aItem, subr: aInfo },
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
                    type: SUBR_TYPE,
                    name: `SUBR: ${aInfo.name}`,
                    code: { bridge: aItem, subr: aInfo },
                    savedCode: { bridge: aItem, subr: aInfo },
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    // OPEN BRIDGE
    const openBridgeInfo = (aInfo: BridgeItemType) => {
        const sExistKeyTab = checkExistTab(BRIDGE_TYPE);
        setActiveName(aInfo.name);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === BRIDGE_TYPE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `BRIDGE: ${aInfo.name}`,
                            code: aInfo,
                            savedCode: aInfo,
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
                    type: BRIDGE_TYPE,
                    name: `BRIDGE: ${aInfo.name}`,
                    code: aInfo,
                    savedCode: aInfo,
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handleCreate = (e: React.MouseEvent) => {
        e && e.stopPropagation();
        setActiveName(undefined);
        const sExistKeyTab = checkExistTab(BRIDGE_TYPE);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === BRIDGE_TYPE);
            const sId = generateUUID();
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            id: sId,
                            type: BRIDGE_TYPE,
                            name: `BRIDGE: create`,
                            code: undefined,
                            savedCode: false,
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(sId);
            return;
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: BRIDGE_TYPE,
                    name: `BRIDGE: create`,
                    code: undefined,
                    savedCode: false,
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handleRefresh = (e: React.MouseEvent) => {
        e && e.stopPropagation();
        getBridgeList();
    };
    const handleCollapse = () => {
        setIsCollapse(!sIsCollapse);
    };
    const getState = (aState: string) => {
        if (aState.toUpperCase() === 'RUNNING' || aState.toUpperCase() === 'STARTING') return '#5CA3DC';
        return 'RGB(117, 117, 120)';
    };

    /** init bridge list */
    useEffect(() => {
        getBridgeList();
    }, []);

    return (
        <div className="side-form">
            <SideTitle pServer={pServer} />
            <SideCollapse pCallback={handleCollapse} pCollapseState={sIsCollapse}>
                <span className="title-text">BRIDGE</span>
                <span className="sub-title-navi">
                    <IconButton
                        pIsToopTip
                        pToolTipContent="New bridge"
                        pToolTipId="bridge-explorer-new-bridge"
                        pWidth={20}
                        pHeight={20}
                        pIcon={<GoPlus size={15} />}
                        onClick={handleCreate}
                    />
                    <IconButton
                        pIsToopTip
                        pToolTipContent="Refresh"
                        pToolTipId="bridge-explorer-refresh"
                        pWidth={20}
                        pHeight={20}
                        pIcon={<MdRefresh size={15} />}
                        onClick={handleRefresh}
                    />
                </span>
            </SideCollapse>

            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sIsCollapse &&
                    sBridge &&
                    sBridge.length !== 0 &&
                    sBridge.map((aItem, aIdx: number) => {
                        return (
                            <div key={aIdx}>
                                <div className={aItem.name === sActiveName ? 'file-wrap file-wrap-active' : 'file-wrap'} onClick={() => openBridgeInfo(aItem)}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        <span className="icons">
                                            {icons(SUBSCRIBER_TYPE.includes(aItem?.type) ? ((aItem?.type as any) === 'mqtt' ? 'bridge-mqtt' : 'bridge-nats') : 'bridge-db')}
                                        </span>
                                        <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aItem.name}</span>
                                    </div>
                                </div>

                                {aItem?.childs &&
                                    aItem.childs.map((aChild, bIdx) => {
                                        return (
                                            <div
                                                key={bIdx}
                                                className={aChild.name === sActiveSubrName ? 'file-wrap file-wrap-active' : 'file-wrap'}
                                                style={{ paddingLeft: '16px' }}
                                                onClick={() => openSubrInfo(aItem, aChild)}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'nowrap',
                                                        textOverflow: 'ellipsis',
                                                        wordBreak: 'break-all',
                                                    }}
                                                >
                                                    {/* Child tree style */}
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div
                                                            style={{
                                                                marginLeft: '7px',
                                                                width: '8px',
                                                                height: '8px',
                                                                borderLeft: '1px solid #ffffff',
                                                                borderBottom: '1px solid #ffffff',
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                marginLeft: '7px',
                                                                width: '8px',
                                                                height: '8px',
                                                                borderLeft: aItem?.childs?.length !== bIdx + 1 ? '1px solid #ffffff' : '',
                                                            }}
                                                        />
                                                    </div>

                                                    <span className="icons" style={{ marginLeft: '4px', color: getState(aChild.state) }}>
                                                        {icons('bridge-child')}
                                                    </span>
                                                    <span style={{ marginLeft: '1px', fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                        {aChild.name}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
