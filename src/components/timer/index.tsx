import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import { EditTimer } from './editTimer';
import { TimerItemType, delTimer, getTimer, modTimer, sendTimerCommand } from '@/api/repository/timer';
import { useState, useEffect } from 'react';
import SplitPane from 'split-pane-react/esm/SplitPane';

export const Timer = ({ pCode }: { pCode: TimerItemType }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setResTimerList = useSetRecoilState<TimerItemType[] | undefined>(gTimerList);
    const [sActiveTimer, setActiveTimer] = useRecoilState<any>(gActiveTimer);
    const [sCommandRes, setCommandRes] = useState<string | undefined>(undefined);
    const [sResMessage, setResMessage] = useState<string | undefined>(undefined);
    const [sPayload, setPayload] = useState<any>(undefined);

    /** delete timer */
    const deleteTimer = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Do you want to delete the timer "${pCode.name}"?`)) {
            const sRes = await delTimer(pCode.name);
            if (sRes.success) {
                const sTimerList = await getTimer();
                if (sTimerList.success) setResTimerList(sTimerList.data);
                else setResTimerList([]);

                const sTempTimerList = sTimerList.data.filter((aKeyInfo: any) => aKeyInfo.name !== pCode.name);
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
    /** edit item */
    const editItem = async () => {
        const sResult: any = await modTimer({ autoStart: sPayload.autoStart, schedule: sPayload.schedule, path: sPayload.task }, sPayload.name);

        if (sResult.success) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `TIMER: ${sPayload.name}`,
                            code: sPayload,
                            savedCode: sPayload,
                        };
                    }
                    return aBoard;
                });
            });
            updateList();
            setResMessage(undefined);
        } else {
            if (sResult?.data && sResult?.data.reason) setResMessage(sResult?.data.reason);
            else setResMessage(sResult.statusText);
        }
    };
    /** update list */
    const updateList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sResList: any = await getTimer();
        if (sResList.success) {
            setResTimerList(sResList.data || []);
            return sResList.data || [];
        } else {
            setResTimerList(undefined);
            return [];
        }
    };
    const handleCommand = async () => {
        const sResCommand = await sendTimerCommand(commandConverter(pCode.state).toLowerCase(), pCode.name);
        if (sResCommand.success) {
            setCommandRes(undefined);
            const sTimerList = await getTimer();
            if (sTimerList.success) setResTimerList(sTimerList.data);
            else setResTimerList([]);
            const sTargetTimer = sTimerList.data.find((aKeyInfo: any) => aKeyInfo.name === pCode.name);
            if (sTargetTimer) {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                code: { ...sPayload, state: sTargetTimer.state },
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
    const handlePayload = (aKey: string, e: React.FormEvent) => {
        const sTmpPayload = JSON.parse(JSON.stringify(sPayload));
        sTmpPayload[aKey] = (e.target as React.InputHTMLAttributes<string>).value;
        setBoardList((curBoardList: any) => {
            return curBoardList.map((aBoard: any) => {
                if (aBoard.type === 'timer') {
                    return { ...aBoard, code: sTmpPayload };
                } else return aBoard;
            });
        });
    };

    useEffect(() => {
        setCommandRes(undefined);
        pCode &&
            setPayload({
                name: pCode.name || '',
                type: pCode.type || 'TIMER',
                state: pCode.state || 'STOP',
                task: pCode.task || '',
                schedule: pCode.schedule || '',
                autoStart: pCode?.autoStart || false,
            });
    }, [pCode]);

    return (
        <>
            {/* Show info */}
            {sActiveTimer && sPayload && (
                <ExtensionTab>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={['50', '50']} onChange={() => {}}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Timer name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.name}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Checkbox
                                            pValue={sPayload.autoStart}
                                            pCallback={(value: boolean) => handlePayload('autoStart', { target: { value } } as any)}
                                        />
                                        <ExtensionTab.ContentDesc>Makes the task will start automatically when machbase-neo starts.</ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>schedule</ExtensionTab.ContentTitle>
                                    <ExtensionTab.Input pValue={sPayload.schedule} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('schedule', event)} />
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>task</ExtensionTab.ContentTitle>
                                    <ExtensionTab.Input pValue={sPayload.task} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('task', event)} />
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Timer state</ExtensionTab.ContentTitle>
                                    {!(sPayload?.state?.includes('STOP') || sPayload?.state?.includes('RUNNING')) ? (
                                        <ExtensionTab.ContentDesc>
                                            <ExtensionTab.TextResErr pText={sPayload.state} />
                                        </ExtensionTab.ContentDesc>
                                    ) : (
                                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'row' }}>
                                            <ExtensionTab.Switch pState={sPayload.state === 'RUNNING'} pCallback={handleCommand} pBadge={sPayload.state} />
                                        </div>
                                    )}
                                    {sCommandRes && (
                                        <ExtensionTab.ContentDesc>
                                            <ExtensionTab.TextResErr pText={sCommandRes} />
                                        </ExtensionTab.ContentDesc>
                                    )}
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.TextButton pText="Delete" pType="DELETE" pCallback={deleteTimer} />
                                        <ExtensionTab.TextButton pText="Save" pType="CREATE" pCallback={editItem} />
                                        {sResMessage && <ExtensionTab.TextResErr pText={sResMessage} />}
                                    </ExtensionTab.DpRow>
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
