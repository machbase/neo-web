import { useEffect, useRef, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { gAddSubr, gBoardList, gBridgeList, gBridgeNameList } from '@/recoil/recoil';
import { VscWarning } from 'react-icons/vsc';
import { LuFlipVertical } from 'react-icons/lu';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { IconButton } from '@/components/buttons/IconButton';
import { SUBR_FORMAT_TABLE, SUBR_METHOD_TABLE, SUBR_OPTIONS_EXAMPLE_TABLE, SUBR_OPTIONS_TABLE } from './content';
import { SelectFileBtn } from '@/components/buttons/SelectFileBtn';
import { OpenFileBtn } from '@/components/buttons/OpenFileBtn';
import { genSubr, getSubr } from '@/api/repository/bridge';

export const CreateSubr = ({ pInit }: { pInit: any }) => {
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const setAddSubr = useSetRecoilState<any>(gAddSubr);
    const sBridgeNameList = useRecoilValue(gBridgeNameList);
    const sBridgeList = useRecoilValue(gBridgeList);
    const sBodyRef: any = useRef(null);
    const [sTaskSelect, setTaskSelect] = useState<'Writing Descriptor' | 'TQL Script'>('Writing Descriptor');
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50', '50']);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCreatePayload, setCreatePayload] = useState<any>({
        autoStart: false,
        name: '',
        bridge: '',
        bridge_type: '',
        topic: '',
        task: '',
        type: '',
        method: 'append',
        table_name: '',
        format: 'json',
        compress: false,
        options: '',
        QoS: 0,
        queue: '',
    });

    /** create item */
    const createItem = async () => {
        let sParsedPayload: any = {};
        if (sTaskSelect === 'TQL Script') {
            sParsedPayload = {
                autoStart: sCreatePayload.autoStart,
                name: sCreatePayload.name,
                bridge: sCreatePayload.bridge,
                topic: sCreatePayload.topic,
                task: sCreatePayload.task,
            };
        }
        if (sTaskSelect === 'Writing Descriptor') {
            sParsedPayload = {
                autoStart: sCreatePayload.autoStart,
                name: sCreatePayload.name,
                bridge: sCreatePayload.bridge,
                topic: sCreatePayload.topic,
                task: `db/${sCreatePayload.method}/${sCreatePayload.table_name}:${sCreatePayload.format}${sCreatePayload.compress ? ':gzip' : ''}${
                    sCreatePayload.options !== '' ? '?' + sCreatePayload.options : ''
                }`,
            };
        }
        if (sCreatePayload.bridge_type === 'mqtt') sParsedPayload.QoS = parseInt(sCreatePayload.QoS);
        if (sCreatePayload.bridge_type === 'nats') sParsedPayload.queue = sCreatePayload.queue;

        const sGenRes: any = await genSubr(sParsedPayload);

        if (sGenRes.success) {
            const sGetSubrRes: any = await getSubr();
            const sTargetSubrInfo = sGetSubrRes?.data ? sGetSubrRes.data.filter((aSubr: any) => aSubr.bridge === sCreatePayload.bridge) : undefined;
            if (sTargetSubrInfo) setAddSubr(sParsedPayload);
            handleSavedCode(true);
            setResErrMessage(undefined);
        } else {
            setResErrMessage(sGenRes?.data ? (sGenRes as any).data.reason : (sGenRes.statusText as string));
        }
    };
    /** handle info */
    const handlePayload = (aTarget: string, aEvent: React.FormEvent<HTMLInputElement>) => {
        const sTarget = aEvent.target as HTMLInputElement;
        const sTempPayload = JSON.parse(JSON.stringify(sCreatePayload));
        sTempPayload[aTarget] = sTarget.value;
        if (aTarget === 'bridge') {
            const sTargetType = sBridgeList.filter((aBridge: any) => aBridge.name === sTarget.value)[0].type;
            sTempPayload.bridge_type = sTargetType;
        }
        setCreatePayload(sTempPayload);
        handleSavedCode(false);
    };
    /** Saved status (Tab state) */
    const handleSavedCode = (aSavedStatus: boolean) => {
        setBoardList((aBoardList: any) => {
            return aBoardList.map((aBoard: any) => {
                if (aBoard.type === 'subscriber') {
                    return {
                        ...aBoard,
                        name: `SUBR: create`,
                        savedCode: aSavedStatus,
                    };
                }
                return aBoard;
            });
        });
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        if (sBodyRef && sBodyRef.current && sBodyRef.current.offsetWidth !== 0) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);
    useEffect(() => {
        setCreatePayload((preV: any) => {
            return { ...preV, bridge: pInit.bridge.name, bridge_type: pInit.bridge.type };
        });
    }, [pInit]);

    return (
        <ExtensionTab pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <ExtensionTab.Header />
                    <ExtensionTab.Body>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.SubTitle>Subscriber</ExtensionTab.SubTitle>
                            <ExtensionTab.Hr />
                        </ExtensionTab.ContentBlock>
                        {/* Auto start */}
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.Checkbox pValue={sCreatePayload.autoStart} pCallback={(value: boolean) => handlePayload('autoStart', { target: { value } } as any)} />
                                <ExtensionTab.ContentDesc>{`Makes the task to start automatically when machbase-neo starts`}</ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                        </ExtensionTab.ContentBlock>
                        {/* Subr name */}
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>name</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.Input pValue={sCreatePayload.name} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </ExtensionTab.ContentBlock>
                        {/* Bridge name */}
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>bridge</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            {/* recoil bridge name list */}
                            <ExtensionTab.Selector
                                pList={sBridgeNameList}
                                pSelectedItem={sCreatePayload.bridge}
                                pCallback={(aSelectedItem: string) => {
                                    handlePayload('bridge', { target: { value: aSelectedItem } } as any);
                                }}
                            />
                        </ExtensionTab.ContentBlock>
                        {/* Topic | Subject*/}
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>{sCreatePayload.bridge_type === 'mqtt' ? 'Topic' : 'Subject'}</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.Input pValue={sCreatePayload.topic} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('topic', event)} />
                        </ExtensionTab.ContentBlock>
                        {/* Task (writing descriptor vs tql path) */}
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>Destination</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.TwoItemSwitch
                                pItemA={'Writing Descriptor'}
                                pItemB={'TQL Script'}
                                pSelectedItem={sTaskSelect}
                                pCallback={(aItem: any) => setTaskSelect(aItem)}
                            />
                        </ExtensionTab.ContentBlock>
                        {/* TQL Script */}
                        {sTaskSelect === 'TQL Script' && (
                            <>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.ContentTitle>Tql path</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>
                                            <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                        </ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                    <ExtensionTab.ContentDesc>The tql script as a task</ExtensionTab.ContentDesc>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Input
                                            pValue={sCreatePayload.task}
                                            pWidth={'400px'}
                                            pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('task', event)}
                                        />
                                        <SelectFileBtn
                                            pType="tql"
                                            pCallback={(aKey: string) => handlePayload('task', { target: { value: aKey } } as any)}
                                            btnWidth={'100px'}
                                            btnHeight="26px"
                                        />
                                        <OpenFileBtn pType="tql" pFileInfo={{ path: sCreatePayload.task }} btnWidth={'80px'} btnHeight="26px" />
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.ContentBlock>
                                {/* QoS - MQTT */}
                                {sCreatePayload.bridge_type === 'mqtt' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>QoS</ExtensionTab.ContentTitle>
                                        <ExtensionTab.Selector
                                            pList={['0', '1']}
                                            pSelectedItem={sCreatePayload.QoS}
                                            pCallback={(aSelectedItem: string) => {
                                                handlePayload('QoS', { target: { value: aSelectedItem } } as any);
                                            }}
                                        />
                                    </ExtensionTab.ContentBlock>
                                )}
                                {/* Queue - NATS */}
                                {sCreatePayload.bridge_type === 'nats' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Queue</ExtensionTab.ContentTitle>
                                        <ExtensionTab.Input pValue={sCreatePayload.Queue} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('Queue', event)} />
                                    </ExtensionTab.ContentBlock>
                                )}
                            </>
                        )}
                        {/* Writing Descriptor */}
                        {sTaskSelect === 'Writing Descriptor' && (
                            <>
                                {/* DESTINATION - method */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.ContentTitle>Method</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>
                                            <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                        </ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                    <ExtensionTab.Selector
                                        pList={['append', 'write']}
                                        pSelectedItem={sCreatePayload.method}
                                        pCallback={(aSelectedItem: string) => {
                                            handlePayload('method', { target: { value: aSelectedItem } } as any);
                                        }}
                                    />
                                </ExtensionTab.ContentBlock>
                                {/* DESTINATION - table_name */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.ContentTitle>Table name</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>
                                            <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                        </ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                    <ExtensionTab.Input
                                        pValue={sCreatePayload.table_name}
                                        pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('table_name', event)}
                                    />
                                </ExtensionTab.ContentBlock>
                                {/* DESTINATION - format */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.ContentTitle>Format</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>
                                            <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                        </ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                    <ExtensionTab.Selector
                                        pList={['json', 'csv']}
                                        pSelectedItem={sCreatePayload.format}
                                        pCallback={(aSelectedItem: string) => {
                                            handlePayload('format', { target: { value: aSelectedItem } } as any);
                                        }}
                                    />
                                </ExtensionTab.ContentBlock>
                                {/* DESTINATION - compress */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Compress</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Checkbox
                                            pValue={sCreatePayload.compress}
                                            pCallback={(value: boolean) => handlePayload('compress', { target: { value } } as any)}
                                        />
                                        <ExtensionTab.ContentDesc>{`use gzip`}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.ContentBlock>
                                {/* DESTINATION - options */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Options</ExtensionTab.ContentTitle>
                                    <ExtensionTab.Input pValue={sCreatePayload.options} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('options', event)} />
                                </ExtensionTab.ContentBlock>
                                {/* QoS - MQTT */}
                                {sCreatePayload.bridge_type === 'mqtt' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Qos</ExtensionTab.ContentTitle>
                                        <ExtensionTab.Selector
                                            pList={['0', '1']}
                                            pSelectedItem={sCreatePayload.QoS}
                                            pCallback={(aSelectedItem: string) => {
                                                handlePayload('QoS', { target: { value: aSelectedItem } } as any);
                                            }}
                                        />
                                    </ExtensionTab.ContentBlock>
                                )}
                                {/* Queue - NATS */}
                                {sCreatePayload.bridge_type === 'nats' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Queue</ExtensionTab.ContentTitle>
                                        <ExtensionTab.Input pValue={sCreatePayload.Queue} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('Queue', event)} />
                                    </ExtensionTab.ContentBlock>
                                )}
                            </>
                        )}
                        {/* Create btn */}
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.TextButton pText="Create" pType="CREATE" pCallback={createItem} />
                            {sResErrMessage && (
                                <ExtensionTab.DpRow>
                                    <VscWarning style={{ fill: 'rgb(236 118 118)' }} />
                                    <span style={{ margin: '8px', color: 'rgb(236 118 118)' }}>{sResErrMessage}</span>
                                </ExtensionTab.DpRow>
                            )}
                        </ExtensionTab.ContentBlock>
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
                        {/* Writing Descriptor */}
                        {sTaskSelect === 'Writing Descriptor' && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>writing descriptor</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Spec</ExtensionTab.ContentTitle>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>AutoStart</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="makes the subscriber starts along with machbase-neo starts. Ommit this to start/stop manually."></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Name</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="the name of the subscriber."></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Bridge</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="the name of the bridge that the subscriber is going to use."></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>{sCreatePayload.bridge_type === 'mqtt' ? 'Topic' : 'Subject'}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="subject name to subscribe. it should be in NATS subject syntax."></ExtensionTab.ContentText>
                                    {sCreatePayload.bridge_type === 'mqtt' && (
                                        <>
                                            <ExtensionTab.Space pHeight="16px" />
                                            <ExtensionTab.ContentDesc>QoS</ExtensionTab.ContentDesc>
                                            <ExtensionTab.ContentText pContent="subscribe to the topic QoS 1, MQTT bridges support QoS 0 and 1."></ExtensionTab.ContentText>
                                        </>
                                    )}
                                    {sCreatePayload.bridge_type === 'nats' && (
                                        <>
                                            <ExtensionTab.Space pHeight="16px" />
                                            <ExtensionTab.ContentDesc>Queue</ExtensionTab.ContentDesc>
                                            <ExtensionTab.ContentText pContent="if the bridge is NATS type, it specifies the Queue Group."></ExtensionTab.ContentText>
                                        </>
                                    )}
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Destination</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="writing descriptor, it means the incoming data is in CSV format and writing data into the table EXAMPLE in append mode."></ExtensionTab.ContentText>
                                    <ExtensionTab.CopyBlock pContent={'db/{method}/{table_name}:{format}:{compress}?{options}'} />
                                    {/* method */}
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Method</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent={`There are two methods append and write. The append is recommended on the stream environment like NATS.`} />
                                    <div style={{ width: '400px' }}>
                                        <ExtensionTab.Table pList={SUBR_METHOD_TABLE} dotted />
                                    </div>
                                    {/* table_name */}
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>table_name</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent={`Specify the destination table name, case insensitive.`} />
                                    {/* format */}
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Format</ExtensionTab.ContentDesc>
                                    <div style={{ width: '150px' }}>
                                        <ExtensionTab.Table pList={SUBR_FORMAT_TABLE} dotted />
                                    </div>
                                    {/* compress */}
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Compress</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent={`Currently gzip is supported, If :{compress} part is omitted, it means the data is not compressed.`} />
                                    {/* Options */}
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Options</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="The writing description can contain an optional question-mark-separated URL-encoded parameters." />
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.Hr />
                                    <ExtensionTab.Space pHeight="12px" />
                                    <ExtensionTab.Table pList={SUBR_OPTIONS_TABLE} />
                                </ExtensionTab.ContentBlock>
                                {/* EX */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>Examples)</ExtensionTab.ContentDesc>
                                    <ExtensionTab.Space pHeight="8px" />
                                    <div style={{ width: '600px' }}>
                                        <ExtensionTab.Table pList={SUBR_OPTIONS_EXAMPLE_TABLE} dotted />
                                    </div>
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.ContentBlock>
                        )}
                        {/* TQL Script */}
                        {sTaskSelect === 'TQL Script' && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>TQL script</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>The place of writing description can be replaced with a file path of TQL script.</ExtensionTab.ContentDesc>
                                <ExtensionTab.Space pHeight="4px" />
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Spec</ExtensionTab.ContentTitle>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>AutoStart</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="makes the subscriber starts along with machbase-neo starts."></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Name</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="the name of the subscriber"></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Bridge</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="the name of the bridge that the subscriber is going to use"></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>{sCreatePayload.bridge_type === 'mqtt' ? 'Topic' : 'Subject'}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="subject name to subscribe. it supports NATS subject syntax."></ExtensionTab.ContentText>
                                    <ExtensionTab.Space pHeight="16px" />
                                    <ExtensionTab.ContentDesc>Tql Path</ExtensionTab.ContentDesc>
                                    <ExtensionTab.ContentText pContent="the tql file path which will receive the incoming data."></ExtensionTab.ContentText>
                                    {sCreatePayload.bridge_type === 'mqtt' && (
                                        <>
                                            <ExtensionTab.Space pHeight="16px" />
                                            <ExtensionTab.ContentDesc>QoS</ExtensionTab.ContentDesc>
                                            <ExtensionTab.ContentText pContent="subscribe to the topic QoS 1, MQTT bridges support QoS 0 and 1."></ExtensionTab.ContentText>
                                        </>
                                    )}
                                    {sCreatePayload.bridge_type === 'nats' && (
                                        <>
                                            <ExtensionTab.Space pHeight="16px" />
                                            <ExtensionTab.ContentDesc>Queue</ExtensionTab.ContentDesc>
                                            <ExtensionTab.ContentText pContent="if the bridge is NATS type, it specifies the Queue Group."></ExtensionTab.ContentText>
                                        </>
                                    )}
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>Data writing TQL script example)</ExtensionTab.ContentDesc>
                                    <ExtensionTab.CopyBlock
                                        pContent={'CSV(payload())\nMAPVALUE(1, parseTime(value(1), "ns"))\nMAPVALUE(2, parseFloat(value(2)))\nAPPEND( table("example") )'}
                                    />
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.ContentBlock>
                        )}
                    </ExtensionTab.Body>
                </Pane>
            </SplitPane>
        </ExtensionTab>
    );
};
