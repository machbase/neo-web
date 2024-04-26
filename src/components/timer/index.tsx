import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import { EditTimer } from './editTimer';
import { TimerItemType, delTimer, getTimer, sendTimerCommand } from '@/api/repository/timer';
import { useState, useEffect } from 'react';
import SplitPane from 'split-pane-react/esm/SplitPane';

export const Timer = ({ pCode }: { pCode: TimerItemType }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setResTimerList = useSetRecoilState<TimerItemType[] | undefined>(gTimerList);
    const [sActiveTimer, setActiveTimer] = useRecoilState<any>(gActiveTimer);
    const [sCommandRes, setCommandRes] = useState<string | undefined>(undefined);

    /** delete timer */
    const deleteTimer = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Do you want to delete the timer "${pCode.name}"?`)) {
            const sRes = await delTimer(pCode.name);
            if (sRes.success) {
                const sTimerList = await getTimer();
                if (sTimerList.success) setResTimerList(sTimerList.list);
                else setResTimerList([]);

                const sTempTimerList = sTimerList.list.filter((aKeyInfo: any) => aKeyInfo.name !== pCode.name);
                if (sTempTimerList && sTempTimerList.length > 0) {
                    setActiveTimer(sTempTimerList[0].name);
                    const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
                    setBoardList((aBoardList: any) => {
                        return aBoardList.map((aBoard: any) => {
                            if (aBoard.id === aTarget.id) {
                                return {
                                    ...aTarget,
                                    name: `TIMER: ${sTempTimerList[0].name}`,
                                    code: sTempTimerList[0],
                                    savedCode: sTempTimerList[0],
                                };
                            }
                            return aBoard;
                        });
                    });
                } else {
                    const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
                    setActiveTimer(undefined);
                    setBoardList((aBoardList: any) => {
                        return aBoardList.map((aBoard: any) => {
                            if (aBoard.id === aTarget.id) {
                                return {
                                    ...aTarget,
                                    name: `TIMER: create`,
                                    code: undefined,
                                    savedCode: false,
                                };
                            }
                            return aBoard;
                        });
                    });
                }
            }
        } else {
            alert('Delete Has Been Canceled.');
        }
    };
    const handleCommand = async () => {
        const sResCommand = await sendTimerCommand(commandConverter(pCode.state).toLowerCase(), pCode.name);
        if (sResCommand.success) {
            setCommandRes(undefined);
            const sTimerList = await getTimer();
            if (sTimerList.success) setResTimerList(sTimerList.list);
            else setResTimerList([]);
            const sTargetTimer = sTimerList.list.find((aKeyInfo: any) => aKeyInfo.name === pCode.name);
            if (sTargetTimer) {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                code: sTargetTimer,
                                savedCode: sTargetTimer,
                            };
                        }
                        return aBoard;
                    });
                });
            }
        } else {
            setCommandRes(sResCommand?.data?.reason || 'Cannot connect to server');
        }
    };
    const commandConverter = (aCommand: string) => {
        switch (aCommand) {
            case 'STOP':
                return 'Start';
            case 'RUNNING':
                return 'Stop';
            default:
                return aCommand;
        }
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;
    };

    useEffect(() => {
        setCommandRes(undefined);
    }, [pCode]);

    return (
        <>
            {/* Show info */}
            {sActiveTimer && (
                <ExtensionTab>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={['50', '50']} onChange={() => {}}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Timer name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{pCode.name}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>task</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{pCode.task}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>schedule</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{pCode.schedule}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Timer state</ExtensionTab.ContentTitle>
                                    {!(pCode.state.includes('STOP') || pCode.state.includes('RUNNING')) ? (
                                        <ExtensionTab.ContentDesc>
                                            <ExtensionTab.TextResErr pText={pCode.state} />
                                        </ExtensionTab.ContentDesc>
                                    ) : (
                                        <div style={{ marginTop: '16px' }}>
                                            <ExtensionTab.Switch pState={pCode.state === 'RUNNING'} pCallback={handleCommand} />
                                        </div>
                                    )}
                                    {sCommandRes && (
                                        <ExtensionTab.ContentDesc>
                                            <ExtensionTab.TextResErr pText={sCommandRes} />
                                        </ExtensionTab.ContentDesc>
                                    )}
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextButton pText="Delete" pType="DELETE" pCallback={deleteTimer} />
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.Body>
                        </Pane>
                        <Pane>
                            <ExtensionTab.Header />
                        </Pane>
                    </SplitPane>
                </ExtensionTab>
            )}
            {/* Show create */}
            {!sActiveTimer && <EditTimer />}
        </>
    );
};
