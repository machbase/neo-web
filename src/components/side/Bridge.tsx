import { MdRefresh } from 'react-icons/md';
import { SideTitle, SideCollapse } from './SideForm';
import { IconButton } from '../buttons/IconButton';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveBridge, gBoardList, gBridgeList, gSelectedTab } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import { BridgeItemType, getBridge } from '@/api/repository/bridge';
import icons from '@/utils/icons';

export const BridgeSide = ({ pServer }: any) => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sIsCollapse, setIsCollapse] = useState<boolean>(true);
    const [sList, setList] = useRecoilState<BridgeItemType[]>(gBridgeList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveBridge);
    const TYPE = 'bridge';

    const getBridgeList = async () => {
        const sResBridge = await getBridge();
        if (sResBridge.success) setList(sResBridge.data);
        else setList([]);
    };
    const openInfo = (aInfo: BridgeItemType) => {
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === TYPE;
        }, false);

        setActiveName(aInfo.name);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TYPE);
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
                    type: TYPE,
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

        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === TYPE;
        }, false);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TYPE);
            const sId = generateUUID();
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            id: sId,
                            type: TYPE,
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
                    type: TYPE,
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
                    <IconButton pWidth={20} pHeight={20} pIcon={<GoPlus size={15} />} onClick={handleCreate} />
                    <IconButton pWidth={20} pHeight={20} pIcon={<MdRefresh size={15} />} onClick={handleRefresh} />
                </span>
            </SideCollapse>

            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sIsCollapse &&
                    sList &&
                    sList.length !== 0 &&
                    sList.map((aItem, aIdx: number) => {
                        return (
                            <div key={aIdx} className={aItem.name === sActiveName ? 'file-wrap file-wrap-active' : 'file-wrap'} onClick={() => openInfo(aItem)}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons">{icons('bridge')}</span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aItem.name}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
