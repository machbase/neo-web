import { useEffect, useRef, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Page, Alert, Checkbox, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { CreatePayloadType, TimerItemType, genTimer, getTimer } from '@/api/repository/timer';
import { gBoardList, gTimerList } from '@/recoil/recoil';
import { LuFlipVertical } from 'react-icons/lu';
import { AUTO_START_DESC, CRON_EXPRESSION, CRON_EXPRESSION_HINT, INTERVAL, INTERVAL_DESC, PREDEFINED_SCHEDULES, TIMER_SPEC } from './content';
import { SelectFileBtn } from '../buttons/SelectFileBtn';
import { OpenFileBtn } from '../buttons/OpenFileBtn';

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
        schedule: '', //@every 1h30m
        path: '', ///sql_select_log.tql
    });
    const [sResOpenFile, setResOpenFile] = useState<string | undefined>(undefined);

    /** create timer */
    const createTimer = async () => {
        const sRes = await genTimer(sCreatePayload, sCreateName);
        if (sRes?.success) {
            setResErrMessage(undefined);
        } else {
            setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
        }

        const sResTimerList: any = await getTimer();
        if (sResTimerList?.success) {
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
            setTimerList(sResTimerList.data);
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
        <Page pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <Page.Header />
                    <Page.Body>
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>Timer id</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>Task’s name</Page.ContentDesc>
                            <Page.Input pAutoFocus pValue={sCreateName} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>Auto start</Page.ContentTitle>
                            <Checkbox
                                size="sm"
                                label={<Page.ContentDesc>{AUTO_START_DESC}</Page.ContentDesc>}
                                checked={sCreatePayload.autoStart}
                                onChange={(e: any) => handlePayload('autoStart', { target: { value: e.target.checked } } as any)}
                            />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>timer spec</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>
                                Specifies when this task runs.
                                <span style={{ marginLeft: '8px', color: 'dodgerblue', fontSize: '12px' }}>Check the example on the right</span>
                            </Page.ContentDesc>
                            <Page.Input
                                pValue={sCreatePayload.schedule}
                                pWidth={'400px'}
                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('schedule', event)}
                            />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>tql path</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>The tql script as a task</Page.ContentDesc>
                            <Page.DpRow>
                                <Page.Input pValue={sCreatePayload.path} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('path', event)} />
                                <Button.Group>
                                    <div />
                                    <SelectFileBtn pType="tql" pCallback={(aKey: string) => handlePayload('path', { target: { value: aKey } } as any)} />
                                    <OpenFileBtn pType="tql" pFileInfo={{ path: sCreatePayload.path }} pErrorCallback={setResOpenFile} />
                                </Button.Group>
                            </Page.DpRow>
                            {sResOpenFile && <Page.TextResErr pText={sResOpenFile} />}
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.TextButton pText="Create" pType="CREATE" pCallback={createTimer} />
                        </Page.ContentBlock>

                        {sResErrMessage && (
                            <Page.ContentBlock>
                                <Alert variant="error" message={sResErrMessage} />
                            </Page.ContentBlock>
                        )}
                    </Page.Body>
                </Pane>
                <Pane>
                    <Page.Header>
                        <div />
                        <Button.Group>
                            <Button
                                size="icon"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Vertical"
                                icon={<LuFlipVertical size={16} style={{ transform: 'rotate(90deg)' }} />}
                                active={isVertical}
                                onClick={() => setIsVertical(true)}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Horizontal"
                                icon={<LuFlipVertical size={16} />}
                                active={!isVertical}
                                onClick={() => setIsVertical(false)}
                            />
                        </Button.Group>
                    </Page.Header>
                    <Page.Body>
                        <Page.ContentBlock>
                            <Page.SubTitle>{'Timer Spec'}</Page.SubTitle>
                            <Page.Space pHeight="4px" />
                            <Page.ContentDesc>{'There three possible examples)'}</Page.ContentDesc>
                            <div style={{ margin: '10px 20px', padding: '12px 16px 12px 0' }}>
                                <Page.Table pList={TIMER_SPEC} dotted />
                            </div>
                        </Page.ContentBlock>
                        <Page.ContentBlock>
                            <Page.ContentTitle>CRON expression</Page.ContentTitle>
                            <Page.ContentBlock pHoverNone>
                                <Page.Table pList={CRON_EXPRESSION} />
                            </Page.ContentBlock>
                            {CRON_EXPRESSION_HINT.map((aHint, aIdx: number) => {
                                return (
                                    <Page.ContentBlock key={aHint.name + aIdx + ''}>
                                        <Page.ContentDesc>{aHint.name}</Page.ContentDesc>
                                        <Page.ContentText pContent={aHint.content} />
                                    </Page.ContentBlock>
                                );
                            })}
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>Predefined schedules</Page.ContentTitle>
                            <Page.ContentBlock pHoverNone>
                                <Page.Table pList={PREDEFINED_SCHEDULES} />
                            </Page.ContentBlock>
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>Intervals</Page.ContentTitle>
                            <Page.ContentBlock pHoverNone>
                                <Page.ContentDesc>{INTERVAL_DESC}</Page.ContentDesc>
                                <Page.Table pList={INTERVAL} />
                            </Page.ContentBlock>
                        </Page.ContentBlock>
                    </Page.Body>
                </Pane>
            </SplitPane>
        </Page>
    );
};
