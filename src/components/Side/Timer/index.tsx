import { MdRefresh } from 'react-icons/md';
import { Button, Side, StatusIndicator } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { TimerItemType, getTimer } from '@/api/repository/timer';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveTimer, gBoardList, gSelectedTab, gTimerList } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import icons from '@/utils/icons';
import type { StatusIndicatorVariant } from '@/design-system/components';

export const TimerSide = () => {
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
                    path: '',
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
                    type: 'timer',
                    name: `TIMER: create`,
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
        getTimerList();
    };
    const handleCollapse = () => {
        setIsCollapse(!sIsCollapse);
    };
    const getStatusVariant = (aState: string): StatusIndicatorVariant => {
        if (aState.toUpperCase() === 'RUNNING') return 'running';
        return 'neutral';
    };

    /** init timer list */
    useEffect(() => {
        getTimerList();
    }, []);

    return (
        <Side.Container>
            <Side.Section>
                <Side.Collapse pCallback={handleCollapse} pCollapseState={sIsCollapse}>
                    <span>TIMER</span>
                    <Button.Group>
                        <Button size="side" variant="ghost" icon={<GoPlus size={16} />} isToolTip toolTipContent="New timer" onClick={handleCreate} />
                        <Button size="side" variant="ghost" icon={<MdRefresh size={16} />} isToolTip toolTipContent="Refresh" onClick={handleRefresh} />
                    </Button.Group>
                </Side.Collapse>

                {sIsCollapse && (
                    <Side.List>
                        {sTimerList &&
                            sTimerList.length !== 0 &&
                            sTimerList.map((aItem, aIdx: number) => {
                                const isActive = sActiveTimer === aItem.name;
                                return (
                                    <Side.Item key={aIdx} onClick={() => openInfo(aItem)} active={isActive}>
                                        <Side.ItemContent>
                                            <Side.ItemIcon>{icons('timer')}</Side.ItemIcon>
                                            <Side.ItemText>{aItem.name}</Side.ItemText>
                                        </Side.ItemContent>
                                        <StatusIndicator variant={getStatusVariant(aItem.state)} size="sm" style={{ marginRight: '12px' }} />
                                    </Side.Item>
                                );
                            })}
                    </Side.List>
                )}
            </Side.Section>
        </Side.Container>
    );
};
