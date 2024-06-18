import { MdRefresh } from 'react-icons/md';
import { SideTitle, SideCollapse } from './SideForm';
import { IconButton } from '../buttons/IconButton';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { TimerItemType, getTimer } from '@/api/repository/timer';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveTimer, gBoardList, gSelectedTab, gTimerList } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import icons from '@/utils/icons';

export const TimerSide = ({ pServer }: any) => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sIsCollapse, setIsCollapse] = useState<boolean>(true);
    const [sTimerList, setTimerList] = useRecoilState<TimerItemType[]>(gTimerList);
    const [sActiveTimer, setActiveTimer] = useRecoilState<any>(gActiveTimer);

    const getTimerList = async () => {
        const sResTimer = await getTimer();
        if (sResTimer.success) setTimerList(sResTimer.data);
        else setTimerList([]);
    };
    const openInfo = (aTimerInfo: TimerItemType) => {
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'timer';
        }, false);

        setActiveTimer(aTimerInfo.name);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `TIMER: ${aTimerInfo.name}`,
                            code: aTimerInfo,
                            savedCode: aTimerInfo,
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
                    type: 'timer',
                    name: `TIMER: ${aTimerInfo.name}`,
                    code: aTimerInfo,
                    savedCode: aTimerInfo,
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handleCreate = (e: React.MouseEvent) => {
        e && e.stopPropagation();
        setActiveTimer(undefined);

        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'timer';
        }, false);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            const sId = generateUUID();
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            id: sId,
                            type: 'timer',
                            name: `TIMER: create`,
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
                    type: 'timer',
                    name: `TIMER: create`,
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
        getTimerList();
    };
    const handleCollapse = () => {
        setIsCollapse(!sIsCollapse);
    };
    const getState = (aState: string) => {
        if (aState.toUpperCase() === 'RUNNING') return '#5CA3DC';
        return 'RGB(117, 117, 120)';
    };

    /** init timer list */
    useEffect(() => {
        getTimerList();
    }, []);

    return (
        <div className="side-form">
            <SideTitle pServer={pServer} />
            <SideCollapse pCallback={handleCollapse} pCollapseState={sIsCollapse}>
                <span className="title-text">TIMER</span>
                <span className="sub-title-navi">
                    <IconButton pWidth={20} pHeight={20} pIcon={<GoPlus size={15} />} onClick={handleCreate} />
                    <IconButton pWidth={20} pHeight={20} pIcon={<MdRefresh size={15} />} onClick={handleRefresh} />
                </span>
            </SideCollapse>

            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sIsCollapse &&
                    sTimerList &&
                    sTimerList.length !== 0 &&
                    sTimerList.map((aItem, aIdx: number) => {
                        return (
                            <div key={aIdx} className={aItem.name === sActiveTimer ? 'file-wrap file-wrap-active' : 'file-wrap'} onClick={() => openInfo(aItem)}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons" style={{ color: getState(aItem.state) }}>
                                        {icons('timer')}
                                    </span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aItem.name}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
