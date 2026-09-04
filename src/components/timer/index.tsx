import { Alert, Button, Checkbox, Page, Toast } from '@/design-system/components';
import { useRecoilState } from 'recoil';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { EditTimer } from './editTimer';
import { TimerItemType, delTimer, getTimer, getTimerItem, modTimer } from '@/api/repository/timer';
import { useState, useEffect } from 'react';
import { AUTO_START_DESC } from './content';
import { SelectFileBtn } from '../buttons/SelectFileBtn';
import { OpenFileBtn } from '../buttons/OpenFileBtn';
import { ConfirmModal } from '../modal/ConfirmModal';
import { isTimerRunningState, useTimerStateAction } from './useTimerStateAction';
import { resMessage } from '@/utils/resMessage';

export const Timer = ({ pCode }: { pCode: TimerItemType }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    // sizes must be state: a frozen literal with a no-op onChange leaves the sash unable to move
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sTimerList, setResTimerList] = useRecoilState<TimerItemType[] | undefined>(gTimerList);
    const [sActiveTimer, setActiveTimer] = useRecoilState<any>(gActiveTimer);
    const [sResMessage, setResMessage] = useState<string | undefined>(undefined);
    const [sPayload, setPayload] = useState<any>(undefined);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sResOpenFile, setResOpenFile] = useState<string | undefined>(undefined);
    const [sIsCommandLoading, setIsCommandLoading] = useState<boolean>(false);
    const { toggleTimerState } = useTimerStateAction();

    /** delete timer */
    const deleteTimer = async () => {
        const sRes = await delTimer(pCode.id);
        if (sRes.success) {
            const sTimerList = await getTimer();
            if (sTimerList.success) setResTimerList(sTimerList.data);
            else setResTimerList([]);

            const sTempTimerList = sTimerList.data.filter((aKeyInfo: any) => aKeyInfo.id !== pCode.id);
            if (sTempTimerList && sTempTimerList.length > 0) {
                setActiveTimer(sTempTimerList[0].id);
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
            Toast.success(`Timer '${pCode.name}' deleted`, { id: 'timer-delete' });
        } else {
            // the confirm modal closes either way — without this the failure is indistinguishable
            // from a no-op
            Toast.error(resMessage(sRes, `Failed to delete timer '${pCode.name}'`), { id: 'timer-delete' });
        }

        setIsDeleteModal(false);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    /** edit item */
    const editItem = async () => {
        // `timer.update` REPLACES the definition — every editable field has to go in every time,
        // or the omitted one is reset on the server (omitting autoStart turns it off).
        const sResult = await modTimer({ autoStart: sPayload.autoStart, schedule: sPayload.schedule, path: sPayload.task }, sPayload.id);

        if (sResult.success) {
            const sTimerInfo = await getTimerItem(sPayload.id);
            const sTmpTimerList =
                sTimerList &&
                sTimerList.map((aTimerInfo: any) => {
                    if (aTimerInfo.id === sPayload.id) {
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
            Toast.success(`Timer '${sPayload.name}' saved`, { id: 'timer-save' });
        } else {
            // failure stays inline under the Save button — the schedule/path that has to change is
            // right there
            setResMessage(resMessage(sResult, 'Failed to save timer'));
        }
    };
    const handleCommand = async () => {
        if (!sPayload || sIsCommandLoading) return;

        setIsCommandLoading(true);

        const sResCommand = await toggleTimerState(sPayload);

        // success needs no toast — the switch and its state badge already say it
        if (sResCommand.success) {
            if (sResCommand.updatedTimer) {
                setPayload((currentPayload: any) =>
                    currentPayload ? { ...currentPayload, state: sResCommand.updatedTimer?.state } : sResCommand.updatedTimer
                );
            }
        } else {
            // same toast the side panel's toggle raises, so the two entry points behave alike
            Toast.error(resMessage(sResCommand, 'Cannot connect to server'), { id: 'timer-command' });
        }

        setIsCommandLoading(false);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;
    };
    const handlePayload = (aKey: string, e: React.FormEvent) => {
        const sTmpPayload = JSON.parse(JSON.stringify(sPayload));
        sTmpPayload[aKey] = (e.target as React.InputHTMLAttributes<string>).value;
        setPayload(sTmpPayload);
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
        setResMessage(undefined);
        pCode &&
            setPayload({
                id: pCode.id,
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
                <Page>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={sGroupWidth} onChange={setGroupWidth}>
                        <Pane minSize={400}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <Page.SubTitle>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', alignContent: 'center' }}>
                                            <div style={{ display: 'flex' }}>Timer</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', marginTop: '20px' }}>
                                                <Page.Switch
                                                    pState={isTimerRunningState(sPayload.state)}
                                                    pCallback={handleCommand}
                                                    pBadge={sPayload.state}
                                                    pBadgeL={true}
                                                    pReadOnly={sIsCommandLoading}
                                                />
                                            </div>
                                        </div>
                                    </Page.SubTitle>

                                    <Page.Hr />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    {/* NAME */}
                                    <Page.ContentTitle>Name</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.name}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    {/* Auto start */}
                                    <Page.ContentTitle>Auto start</Page.ContentTitle>
                                    <Checkbox
                                        size="sm"
                                        label={<Page.ContentDesc>{AUTO_START_DESC}</Page.ContentDesc>}
                                        checked={sPayload.autoStart}
                                        onChange={(e: any) => handlePayload('autoStart', { target: { value: e.target.checked } } as any)}
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    {/* Schedule */}
                                    <Page.ContentTitle>schedule</Page.ContentTitle>
                                    <Page.Input pValue={sPayload.schedule} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('schedule', event)} />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    {/* Task */}
                                    <Page.ContentTitle>task</Page.ContentTitle>
                                    <Page.DpRow>
                                        <Page.Input pValue={sPayload.task} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('task', event)} />
                                        <Button.Group>
                                            <div />
                                            <SelectFileBtn pType="tql" pCallback={handleTql} />
                                            <OpenFileBtn pType="tql" pFileInfo={{ path: sPayload.task }} pErrorCallback={setResOpenFile} />
                                        </Button.Group>
                                    </Page.DpRow>
                                </Page.ContentBlock>
                                <Page.ContentBlock pHoverNone>{sResOpenFile && <Alert variant="error" message={sResOpenFile} />}</Page.ContentBlock>
                                <Page.ContentBlock>
                                    {/* BTN */}
                                    <Page.DpRow>
                                        <Page.TextButton pText="Delete" pType="DELETE" pCallback={handleDelete} />
                                        <Page.TextButton pText="Save" pType="CREATE" pCallback={editItem} />
                                    </Page.DpRow>
                                    {sResMessage && <Alert variant="error" message={sResMessage} />}
                                </Page.ContentBlock>
                            </Page.Body>
                        </Pane>
                        <Pane>
                            <Page.Header />
                        </Pane>
                    </SplitPane>
                </Page>
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
