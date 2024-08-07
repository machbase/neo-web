import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilState } from 'recoil';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import { EditTimer } from './editTimer';
import { TimerItemType, delTimer, getTimer, getTimerItem, modTimer, sendTimerCommand } from '@/api/repository/timer';
import { useState, useEffect } from 'react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { AUTO_START_DESC } from './content';
import { SelectFileBtn } from '../buttons/SelectFileBtn';
import { OpenFileBtn } from '../buttons/OpenFileBtn';
import { ConfirmModal } from '../modal/ConfirmModal';

export const Timer = ({ pCode }: { pCode: TimerItemType }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sTimerList, setResTimerList] = useRecoilState<TimerItemType[] | undefined>(gTimerList);
    const [sActiveTimer, setActiveTimer] = useRecoilState<any>(gActiveTimer);
    const [sCommandRes, setCommandRes] = useState<string | undefined>(undefined);
    const [sResMessage, setResMessage] = useState<string | undefined>(undefined);
    const [sPayload, setPayload] = useState<any>(undefined);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sResOpenFile, setResOpenFile] = useState<string | undefined>(undefined);

    /** delete timer */
    const deleteTimer = async () => {
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

        setIsDeleteModal(false);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    /** edit item */
    const editItem = async () => {
        const sResult: any = await modTimer({ autoStart: sPayload.autoStart, schedule: sPayload.schedule, path: sPayload.task }, sPayload.name);

        if (sResult.success) {
            const sTimerInfo: any = await getTimerItem(sPayload.name);
            const sTmpTimerList =
                sTimerList &&
                sTimerList.map((aTimerInfo: any) => {
                    if (aTimerInfo.name === sPayload.name) {
                        return sTimerInfo.success ? sTimerInfo.data : aTimerInfo;
                    } else return aTimerInfo;
                });
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `TIMER: ${sPayload.name}`,
                            code: sTimerInfo.success ? sTimerInfo.data : sPayload,
                            savedCode: sTimerInfo.success ? sTimerInfo.data : sPayload,
                        };
                    }
                    return aBoard;
                });
            });
            setResTimerList(sTmpTimerList);
            setPayload(sTimerInfo.success ? sTimerInfo.data : sPayload);
            setResMessage(undefined);
        } else {
            if (sResult?.data && sResult?.data.reason) setResMessage(sResult?.data.reason);
            else setResMessage(sResult.statusText);
        }
    };
    const handleCommand = async () => {
        const sResCommand = await sendTimerCommand(
            commandConverter(pCode.state.includes('RUNNING') || pCode.state.includes('STARTING') ? 'RUNNING' : 'STOP').toLowerCase(),
            pCode.name
        );
        if (sResCommand.success) {
            setCommandRes(undefined);
            const sTimerInfo: any = await getTimerItem(pCode.name);
            const sTmpTimerList =
                sTimerList &&
                sTimerList.map((aTimerInfo: any) => {
                    if (aTimerInfo.name === pCode.name) {
                        return sTimerInfo.success ? sTimerInfo.data : aTimerInfo;
                    } else return aTimerInfo;
                });
            setResTimerList(sTmpTimerList);
            if (sTimerInfo.success) {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                code: { ...sPayload, state: sTimerInfo.data.state },
                                savedCode: { ...aTarget.savedCode, state: sTimerInfo.data.state, autoStart: sPayload.autoStart },
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
            case 'RUNNING':
                return 'Stop';
            default:
                return 'Start';
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
    const handleTql = (aKey: string) => {
        handlePayload('task', { target: { value: aKey } } as any);
    };

    useEffect(() => {
        setCommandRes(undefined);
        setResMessage(undefined);
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
                                    <ExtensionTab.SubTitle>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', alignContent: 'center' }}>
                                            <div style={{ display: 'flex' }}>Timer</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', marginTop: '20px' }}>
                                                <ExtensionTab.Switch
                                                    pState={sPayload.state === 'RUNNING' || sPayload.state === 'STARTING'}
                                                    pCallback={handleCommand}
                                                    pBadge={sPayload.state}
                                                    pBadgeL={true}
                                                />
                                                {sCommandRes && (
                                                    <ExtensionTab.ContentDesc>
                                                        <div style={{ marginTop: '-10px' }}>
                                                            <ExtensionTab.TextResErr pText={sCommandRes} />
                                                        </div>
                                                    </ExtensionTab.ContentDesc>
                                                )}
                                            </div>
                                        </div>
                                    </ExtensionTab.SubTitle>

                                    <ExtensionTab.Hr />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    {/* NAME */}
                                    <ExtensionTab.ContentTitle>Name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.name}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    {/* Auto start */}
                                    <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Checkbox
                                            pValue={sPayload.autoStart}
                                            pCallback={(value: boolean) => handlePayload('autoStart', { target: { value } } as any)}
                                        />
                                        <ExtensionTab.ContentDesc>{AUTO_START_DESC}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    {/* Schedule */}
                                    <ExtensionTab.ContentTitle>schedule</ExtensionTab.ContentTitle>
                                    <ExtensionTab.Input pValue={sPayload.schedule} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('schedule', event)} />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    {/* Task */}
                                    <ExtensionTab.ContentTitle>task</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Input pValue={sPayload.task} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('task', event)} />
                                        <SelectFileBtn pType="tql" pCallback={handleTql} btnWidth={'100px'} btnHeight="26px" />
                                        <OpenFileBtn pType="tql" pFileInfo={{ path: sPayload.task }} btnWidth={'80px'} btnHeight="26px" pErrorCallback={setResOpenFile} />
                                    </ExtensionTab.DpRow>
                                    {sResOpenFile && <ExtensionTab.TextResErr pText={sResOpenFile} />}
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    {/* BTN */}
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.TextButton pText="Delete" pType="DELETE" pCallback={handleDelete} />
                                        <ExtensionTab.TextButton pText="Save" pType="CREATE" pCallback={editItem} />
                                    </ExtensionTab.DpRow>
                                    {sResMessage && <ExtensionTab.TextResErr pText={sResMessage} />}
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
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteTimer}
                    pContents={<div className="body-content">{`Do you want to delete this timer?`}</div>}
                />
            )}
        </>
    );
};
