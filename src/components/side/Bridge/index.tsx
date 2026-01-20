import { MdRefresh } from 'react-icons/md';
import { Button, Side } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveBridge, gActiveSubr, gBoardList, gBridgeList, gSelectedTab, setBridgeTree } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import { BridgeItemType, getBridge, getSubr } from '@/api/repository/bridge';
import icons from '@/utils/icons';
import { SUBSCRIBER_TYPE } from '../../bridge/content';

export const BridgeSide = () => {
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
                    path: '',
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
                    path: '',
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
                            path: '',
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
                    path: '',
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
    // const getState = (aState: string) => {
    //     if (aState.toUpperCase() === 'RUNNING' || aState.toUpperCase() === 'STARTING') return '#5CA3DC';
    //     return 'RGB(117, 117, 120)';
    // };

    /** init bridge list */
    useEffect(() => {
        getBridgeList();
    }, []);

    return (
        <Side.Container>
            <Side.Section>
                <Side.Collapse pCallback={handleCollapse} pCollapseState={sIsCollapse}>
                    <span>BRIDGE</span>
                    <Button.Group>
                        <Button size="side" variant="ghost" icon={<GoPlus size={16} />} isToolTip toolTipContent="New bridge" onClick={handleCreate} />
                        <Button size="side" variant="ghost" icon={<MdRefresh size={16} />} isToolTip toolTipContent="Refresh" onClick={handleRefresh} />
                    </Button.Group>
                </Side.Collapse>

                {sIsCollapse && (
                    <Side.List>
                        {sBridge &&
                            sBridge.length !== 0 &&
                            sBridge.map((aItem, aIdx: number) => {
                                return (
                                    <Side.Box key={aIdx}>
                                        <Side.Item onClick={() => openBridgeInfo(aItem)} active={sActiveName === aItem?.name}>
                                            <Side.ItemContent>
                                                <Side.ItemIcon style={{ width: '16px' }}>
                                                    {icons(SUBSCRIBER_TYPE.includes(aItem?.type) ? ((aItem?.type as any) === 'mqtt' ? 'bridge-mqtt' : 'bridge-nats') : 'bridge-db')}
                                                </Side.ItemIcon>
                                                <Side.ItemText>{aItem?.name}</Side.ItemText>
                                            </Side.ItemContent>
                                        </Side.Item>

                                        {aItem?.childs &&
                                            aItem.childs.map((aChild, bIdx) => {
                                                return (
                                                    <Side.Item key={bIdx} onClick={() => openSubrInfo(aItem, aChild)} active={sActiveSubrName === aChild.name}>
                                                        <Side.ItemContent>
                                                            <Side.ItemIcon>{aItem?.childs?.length == bIdx + 1 ? '└' : '├'}</Side.ItemIcon>
                                                            <Side.ItemIcon>{icons('bridge-child')}</Side.ItemIcon>
                                                            <Side.ItemText>{aChild.name}</Side.ItemText>
                                                        </Side.ItemContent>
                                                    </Side.Item>
                                                );
                                            })}
                                    </Side.Box>
                                );
                            })}
                    </Side.List>
                )}
            </Side.Section>
        </Side.Container>
    );
};
