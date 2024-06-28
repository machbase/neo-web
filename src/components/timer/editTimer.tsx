import { useEffect, useRef, useState } from 'react';
import { ExtensionTab } from '../extension/ExtensionTab';
import { useRecoilState } from 'recoil';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { CreatePayloadType, TimerItemType, genTimer, getTimerItem } from '@/api/repository/timer';
import { gBoardList, gTimerList } from '@/recoil/recoil';
import { VscWarning } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { AUTO_START_DESC, CRON_EXPRESSION, CRON_EXPRESSION_HINT, INTERVAL, INTERVAL_DESC, PREDEFINED_SCHEDULES, TIMER_SPEC } from './content';
import { SelectFileBtn } from '../buttons/SelectFileBtn';
import { OpenFileBtn } from '../buttons/OpenFileBtn';

export const EditTimer = () => {
    const [sTimerList, setTimerList] = useRecoilState<TimerItemType[]>(gTimerList);
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50', '50']);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCreateName, setCreateName] = useState<string>('');
    const [sCreatePayload, setCreatePayload] = useState<CreatePayloadType>({
        autoStart: false,
        schedule: '', //@every 1h30m
        path: '', ///sql_select_log.tql
    });
    const [sResOpenFile, setResOpenFile] = useState<string | undefined>(undefined);

    /** create timer */
    const createTimer = async () => {
        const sRes = await genTimer(sCreatePayload, sCreateName);
        if (sRes.success) {
            setResErrMessage(undefined);
        } else {
            setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
        }
        const sTimerInfo: any = await getTimerItem(sCreateName);
        if (sTimerInfo?.success) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `TIMER: create`,
                            code: sTimerInfo.success ? sTimerInfo.data : { ...sCreatePayload, name: sCreateName },
                            savedCode: sTimerInfo.success ? sTimerInfo.data : { ...sCreatePayload, name: sCreateName },
                        };
                    }
                    return aBoard;
                });
            });
            const sTmpTimerList = [...sTimerList, sTimerInfo.success ? sTimerInfo.data : { ...sCreatePayload, name: sCreateName, type: 'TIMER', state: 'UNKNWON' }];
            sTimerList &&
                sTimerList.map((aTimerInfo: any) => {
                    if (aTimerInfo.name === sCreateName) {
                        return sTimerInfo.success ? sTimerInfo.data : aTimerInfo;
                    } else return aTimerInfo;
                });
            setTimerList(sTmpTimerList);
        }
    };
    /** handle timer info */
    const handlePayload = (aTarget: string, aEvent: React.FormEvent<HTMLInputElement>) => {
        const sTarget = aEvent.target as HTMLInputElement;
        if (aTarget === 'name') {
            setCreateName(sTarget.value);
            const sTargetBoard = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === sTargetBoard.id) {
                        return {
                            ...sTargetBoard,
                            name: `TIMER: create`,
                            code: { ...sCreatePayload, name: sTarget.value },
                        };
                    }
                    return aBoard;
                });
            });
        } else {
            const sTempPayload = JSON.parse(JSON.stringify(sCreatePayload));
            sTempPayload[aTarget] = sTarget.value;
            setCreatePayload(sTempPayload);

            const sTargetBoard = sBoardList.find((aBoard: any) => aBoard.type === 'timer');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === sTargetBoard.id) {
                        return {
                            ...sTargetBoard,
                            name: `TIMER: create`,
                            code: { ...sTempPayload, name: sCreateName },
                        };
                    }
                    return aBoard;
                });
            });
        }
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        if (sBodyRef && sBodyRef.current && sBodyRef.current.offsetWidth !== 0) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);

    return (
        <ExtensionTab pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <ExtensionTab.Header />
                    <ExtensionTab.Body>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>Timer id</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.ContentDesc>Task’s name</ExtensionTab.ContentDesc>
                            <ExtensionTab.Input pAutoFocus pValue={sCreateName} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.Checkbox pValue={sCreatePayload.autoStart} pCallback={(value: boolean) => handlePayload('autoStart', { target: { value } } as any)} />
                                <ExtensionTab.ContentDesc>{AUTO_START_DESC}</ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>timer spec</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.ContentDesc>
                                Specifies when this task runs.
                                <span style={{ marginLeft: '8px', color: 'dodgerblue', fontSize: '12px' }}>Check the example on the right</span>
                            </ExtensionTab.ContentDesc>
                            <ExtensionTab.Input
                                pValue={sCreatePayload.schedule}
                                pWidth={'400px'}
                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('schedule', event)}
                            />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>tql path</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.ContentDesc>The tql script as a task</ExtensionTab.ContentDesc>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.Input
                                    pValue={sCreatePayload.path}
                                    pWidth={'400px'}
                                    pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('path', event)}
                                />
                                <SelectFileBtn
                                    pType="tql"
                                    pCallback={(aKey: string) => handlePayload('path', { target: { value: aKey } } as any)}
                                    btnWidth={'100px'}
                                    btnHeight="26px"
                                />
                                <OpenFileBtn pType="tql" pFileInfo={{ path: sCreatePayload.path }} btnWidth={'80px'} btnHeight="26px" pErrorCallback={setResOpenFile} />
                            </ExtensionTab.DpRow>
                            {sResOpenFile && <ExtensionTab.TextResErr pText={sResOpenFile} />}
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.TextButton pText="Create" pType="CREATE" pCallback={createTimer} />
                        </ExtensionTab.ContentBlock>
                        {sResErrMessage && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRow>
                                    <VscWarning style={{ fill: '#ff5353' }} />
                                    <span style={{ margin: '8px', color: '#ff5353' }}>{sResErrMessage}</span>
                                </ExtensionTab.DpRow>
                            </ExtensionTab.ContentBlock>
                        )}
                    </ExtensionTab.Body>
                </Pane>
                <Pane>
                    <ExtensionTab.Header>
                        <div />
                        <div style={{ display: 'flex' }}>
                            <IconButton pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />} pIsActive={isVertical} onClick={() => setIsVertical(true)} />
                            <IconButton pIcon={<LuFlipVertical />} pIsActive={!isVertical} onClick={() => setIsVertical(false)} />
                        </div>
                    </ExtensionTab.Header>
                    <ExtensionTab.Body>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.SubTitle>{'Timer Spec'}</ExtensionTab.SubTitle>
                            <ExtensionTab.Space pHeight="4px" />
                            <ExtensionTab.ContentDesc>{'There three possible examples)'}</ExtensionTab.ContentDesc>
                            <div style={{ margin: '10px 20px', padding: '12px 16px 12px 0' }}>
                                <ExtensionTab.Table pList={TIMER_SPEC} dotted />
                            </div>
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentTitle>CRON expression</ExtensionTab.ContentTitle>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.Table pList={CRON_EXPRESSION} />
                            </ExtensionTab.ContentBlock>
                            {CRON_EXPRESSION_HINT.map((aHint, aIdx: number) => {
                                return (
                                    <ExtensionTab.ContentBlock key={aHint.name + aIdx + ''}>
                                        <ExtensionTab.ContentDesc>{aHint.name}</ExtensionTab.ContentDesc>
                                        <ExtensionTab.ContentText pContent={aHint.content} />
                                    </ExtensionTab.ContentBlock>
                                );
                            })}
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentTitle>Predefined schedules</ExtensionTab.ContentTitle>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.Table pList={PREDEFINED_SCHEDULES} />
                            </ExtensionTab.ContentBlock>
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentTitle>Intervals</ExtensionTab.ContentTitle>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentDesc>{INTERVAL_DESC}</ExtensionTab.ContentDesc>
                                <ExtensionTab.Table pList={INTERVAL} />
                            </ExtensionTab.ContentBlock>
                        </ExtensionTab.ContentBlock>
                    </ExtensionTab.Body>
                </Pane>
            </SplitPane>
        </ExtensionTab>
    );
};
