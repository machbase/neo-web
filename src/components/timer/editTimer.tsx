import { useEffect, useRef, useState } from 'react';
import { ExtensionTab } from '../extension/ExtensionTab';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { CreatePayloadType, TimerItemType, genTimer, getTimer } from '@/api/repository/timer';
import { gBoardList, gTimerList } from '@/recoil/recoil';
import { VscWarning } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { CRON_EXPRESSION, CRON_EXPRESSION_HINT, INTERVAL, PREDEFINED_SCHEDULES, TIMER_SPEC } from './content';

export const EditTimer = () => {
    const setTimerList = useSetRecoilState<TimerItemType[]>(gTimerList);
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50', '50']);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCreateName, setCreateName] = useState<string>('');
    const [sCreatePayload, setCreatePayload] = useState<CreatePayloadType>({
        autoStart: false,
        spec: '', //@every 1h30m
        tqlPath: '', ///sql_select_log.tql
    });

    /** create timer */
    const createTimer = async () => {
        const sRes = await genTimer(sCreatePayload, sCreateName);
        if (sRes.success) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'timer');

            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `TIMER: create`,
                            code: { ...sCreatePayload, name: sCreateName },
                            savedCode: { ...sCreatePayload, name: sCreateName },
                        };
                    }
                    return aBoard;
                });
            });

            const sResTimerList = await getTimer();
            if (sResTimerList.success) setTimerList(sResTimerList.list);
            else setTimerList([]);
            setResErrMessage(undefined);
        } else {
            setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
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
        if (sBodyRef && sBodyRef.current) {
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
                            <ExtensionTab.Input pValue={sCreateName} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.Checkbox pValue={sCreatePayload.autoStart} pCallback={(value: boolean) => handlePayload('autoStart', { target: { value } } as any)} />
                                <ExtensionTab.ContentDesc>Makes the task will start automatically when machbase-neo starts.</ExtensionTab.ContentDesc>
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
                                pValue={sCreatePayload.spec}
                                pWidth={'400px'}
                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('spec', event)}
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
                            <ExtensionTab.Input
                                pValue={sCreatePayload.tqlPath}
                                pWidth={'400px'}
                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('tqlPath', event)}
                            />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.TextButton pText="Create" pType="CREATE" pCallback={createTimer} />
                        </ExtensionTab.ContentBlock>
                        {sResErrMessage && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRow>
                                    <VscWarning style={{ fill: 'rgb(236 118 118)' }} />
                                    <span style={{ margin: '8px', color: 'rgb(236 118 118)' }}>{sResErrMessage}</span>
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
                            <ExtensionTab.ContentTitle>{'timer spec '}</ExtensionTab.ContentTitle>
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
                            {CRON_EXPRESSION_HINT.map((aHint) => {
                                return (
                                    <ExtensionTab.ContentBlock>
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
                                <ExtensionTab.ContentDesc>
                                    {
                                        '@every <duration> where “duration” is a string that is a possibly signed sequence of decimal numbers, each with optional fraction and a unit suffix, such as “300ms”, “-1.5h” or “2h45m”. Valid time units are “ms”, “s”, “m”, “h”.'
                                    }
                                </ExtensionTab.ContentDesc>
                                <ExtensionTab.Table pList={INTERVAL} />
                            </ExtensionTab.ContentBlock>
                        </ExtensionTab.ContentBlock>
                    </ExtensionTab.Body>
                </Pane>
            </SplitPane>
        </ExtensionTab>
    );
};
