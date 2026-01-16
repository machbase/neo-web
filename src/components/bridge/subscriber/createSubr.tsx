import { useEffect, useRef, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Alert, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import {
    gBoardList,
    gBridgeList,
    setBridgeTree,
    // gBridgeNameList
} from '@/recoil/recoil';
import { LuFlipVertical } from 'react-icons/lu';
import { Page } from '@/design-system/components';
import { SelectFileBtn } from '@/components/buttons/SelectFileBtn';
import { OpenFileBtn } from '@/components/buttons/OpenFileBtn';
import { genSubr, getBridge, getSubr } from '@/api/repository/bridge';
import { SUBR_FORMAT_TABLE, SUBR_METHOD_TABLE, SUBR_OPTIONS_TABLE } from './content';

export const CreateSubr = ({ pInit }: { pInit: any }) => {
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const [sBridgeList, setBridge] = useRecoilState(gBridgeList);
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
        compress: 'no compress',
        options: '',
        QoS: 0,
        queue: '',
    });
    const [sResOpenFile, setResOpenFile] = useState<string | undefined>(undefined);

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
                task: `db/${sCreatePayload.method}/${sCreatePayload.table_name}:${sCreatePayload.format}${sCreatePayload.compress === 'gzip' ? ':gzip' : ''}${
                    sCreatePayload.options !== '' ? '?' + sCreatePayload.options : ''
                }`,
            };
        }
        if (sCreatePayload.bridge_type === 'mqtt' && parseInt(sCreatePayload.QoS) !== 0) sParsedPayload.QoS = parseInt(sCreatePayload.QoS);
        if (sCreatePayload.bridge_type === 'nats' && sCreatePayload.queue !== '') sParsedPayload.queue = sCreatePayload.queue;

        const sGenRes: any = await genSubr(sParsedPayload);
        if (sGenRes.success) {
            setResErrMessage(undefined);
        } else {
            setResErrMessage(sGenRes?.data ? (sGenRes as any).data.reason : (sGenRes.statusText as string));
        }

        const sResBridge = await getBridge();
        if (sResBridge?.success) {
            const sResSubr = await getSubr();
            if (sResSubr?.success) setBridge(setBridgeTree(sResBridge.data, sResSubr.data));
            else setBridge(setBridgeTree(sResBridge.data, []));
            handleSavedCode(true);
        } else setBridge([]);
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
        <Page pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <Page.Header />
                    <Page.Body>
                        <Page.ContentBlock>
                            <Page.SubTitle>Subscriber</Page.SubTitle>
                            <Page.Hr />
                        </Page.ContentBlock>
                        {/* Subr name */}
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>name</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>{`The name of the subscriber.`}</Page.ContentDesc>
                            <Page.Input pValue={sCreatePayload.name} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} pMaxLen={40} />
                        </Page.ContentBlock>
                        {/* Auto start */}
                        <Page.ContentBlock>
                            <Page.ContentTitle>Auto start</Page.ContentTitle>
                            <Page.DpRow>
                                <Page.Checkbox
                                    label="Makes the task to start automatically when machbase-neo starts"
                                    pValue={sCreatePayload.autoStart}
                                    pCallback={(value: boolean) => handlePayload('autoStart', { target: { value } } as any)}
                                />
                            </Page.DpRow>
                        </Page.ContentBlock>
                        {/* Bridge name */}
                        {/* <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>bridge</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>{`The name of the subscriber.`}</Page.ContentDesc>
                            <Page.Selector
                                pList={sBridgeNameList}
                                pSelectedItem={sCreatePayload.bridge}
                                pCallback={(aSelectedItem: string) => {
                                    handlePayload('bridge', { target: { value: aSelectedItem } } as any);
                                }}
                            />
                        </Page.ContentBlock> */}
                        {/* Topic | Subject*/}
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>{sCreatePayload.bridge_type === 'mqtt' ? 'Topic' : 'Subject'}</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>
                                {sCreatePayload.bridge_type === 'mqtt'
                                    ? 'Topic name to subscribe. it supports standard MQTT topic syntax includes # and +.'
                                    : 'Subject name to subscribe. it should be in NATS subject syntax.'}
                            </Page.ContentDesc>
                            <Page.Input pValue={sCreatePayload.topic} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('topic', event)} />
                        </Page.ContentBlock>
                        {/* QoS - MQTT */}
                        {sCreatePayload.bridge_type === 'mqtt' && (
                            <Page.ContentBlock>
                                <Page.ContentTitle>QoS</Page.ContentTitle>
                                <Page.ContentDesc>{'Subscribe to the topic QoS 1, MQTT bridges support QoS 0 and 1.'}</Page.ContentDesc>
                                <Page.Selector
                                    pList={[
                                        { name: '0', data: '0' },
                                        { name: '1', data: '1' },
                                    ]}
                                    pSelectedItem={sCreatePayload.QoS}
                                    pCallback={(aSelectedItem: string) => {
                                        handlePayload('QoS', { target: { value: aSelectedItem } } as any);
                                    }}
                                />
                            </Page.ContentBlock>
                        )}
                        {/* Queue - NATS */}
                        {sCreatePayload.bridge_type === 'nats' && (
                            <Page.ContentBlock>
                                <Page.ContentTitle>Queue</Page.ContentTitle>
                                <Page.ContentDesc>{'If the bridge is NATS type, it specifies the Queue Group.'}</Page.ContentDesc>
                                <Page.Input pValue={sCreatePayload.Queue} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('Queue', event)} />
                            </Page.ContentBlock>
                        )}
                        {/* Task (writing descriptor vs tql path) */}
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>Destination</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.DpRow>
                                <Page.ContentDesc>{'The path of tql script or writing path descriptor.'}</Page.ContentDesc>
                                <span style={{ marginLeft: '8px', color: 'dodgerblue', fontSize: '12px' }}>Check the example on the right</span>
                            </Page.DpRow>
                            <Page.Selector
                                pList={[
                                    { name: 'Writing Descriptor', data: 'Writing Descriptor' },
                                    { name: 'TQL Script', data: 'TQL Script' },
                                ]}
                                pSelectedItem={sTaskSelect}
                                pCallback={(aSelectedItem: any) => {
                                    setTaskSelect(aSelectedItem);
                                }}
                            />
                            <Page.Space pHeight="16px" />
                            {/* TQL Script */}
                            {sTaskSelect === 'TQL Script' && (
                                <>
                                    <Page.ContentBlock>
                                        <Page.DpRow>
                                            <Page.ContentTitle>Tql path</Page.ContentTitle>
                                            <Page.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </Page.ContentDesc>
                                        </Page.DpRow>
                                        <Page.ContentDesc>The tql script as a task</Page.ContentDesc>
                                        <Page.DpRow>
                                            <Page.Input
                                                pValue={sCreatePayload.task}
                                                pWidth={'400px'}
                                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('task', event)}
                                            />
                                            <div style={{ marginLeft: '4px' }}>
                                                <SelectFileBtn pType="tql" pCallback={(aKey: string) => handlePayload('task', { target: { value: aKey } } as any)} />
                                            </div>
                                            <div style={{ marginLeft: '4px' }}>
                                                <OpenFileBtn
                                                    pType="tql"
                                                    pFileInfo={{ path: sCreatePayload.task }}
                                                    btnWidth={'80px'}
                                                    btnHeight="26px"
                                                    pErrorCallback={setResOpenFile}
                                                />
                                            </div>
                                        </Page.DpRow>
                                        {sResOpenFile && <Page.TextResErr pText={sResOpenFile} />}
                                    </Page.ContentBlock>
                                </>
                            )}
                            {/* Writing Descriptor */}
                            {sTaskSelect === 'Writing Descriptor' && (
                                <>
                                    {/* DESTINATION - method */}
                                    <Page.ContentBlock>
                                        <Page.DpRow>
                                            <Page.ContentTitle>Method</Page.ContentTitle>
                                            <Page.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </Page.ContentDesc>
                                        </Page.DpRow>
                                        <Page.Selector
                                            pWidth={'364px'}
                                            pList={[
                                                { name: 'append', data: 'append' },
                                                { name: 'write', data: 'write' },
                                            ]}
                                            pSelectedItem={sCreatePayload.method}
                                            pCallback={(aSelectedItem: string) => {
                                                handlePayload('method', { target: { value: aSelectedItem } } as any);
                                            }}
                                        />
                                    </Page.ContentBlock>
                                    {/* DESTINATION - table_name */}
                                    <Page.ContentBlock>
                                        <Page.DpRow>
                                            <Page.ContentTitle>Table name</Page.ContentTitle>
                                            <Page.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </Page.ContentDesc>
                                        </Page.DpRow>
                                        <Page.Input
                                            pWidth={'364px'}
                                            pValue={sCreatePayload.table_name}
                                            pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('table_name', event)}
                                        />
                                    </Page.ContentBlock>
                                    {/* DESTINATION - format */}
                                    <Page.ContentBlock>
                                        <Page.DpRow>
                                            <Page.ContentTitle>Format</Page.ContentTitle>
                                            <Page.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </Page.ContentDesc>
                                        </Page.DpRow>
                                        <Page.Selector
                                            pWidth={'364px'}
                                            pList={[
                                                { name: 'json', data: 'json' },
                                                { name: 'csv', data: 'csv' },
                                            ]}
                                            pSelectedItem={sCreatePayload.format}
                                            pCallback={(aSelectedItem: string) => {
                                                handlePayload('format', { target: { value: aSelectedItem } } as any);
                                            }}
                                        />
                                    </Page.ContentBlock>
                                    {/* DESTINATION - compress */}
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>Compress</Page.ContentTitle>
                                        <Page.Selector
                                            pWidth={'364px'}
                                            pList={[
                                                { name: 'no compress', data: 'no compress' },
                                                { name: 'gzip', data: 'gzip' },
                                            ]}
                                            pSelectedItem={sCreatePayload.compress}
                                            pCallback={(aSelectedItem: string) => {
                                                handlePayload('compress', { target: { value: aSelectedItem } } as any);
                                            }}
                                        />

                                        {/* <Page.DpRow>
                                            <Page.Checkbox
                                                pValue={sCreatePayload.compress}
                                                pCallback={(value: boolean) => handlePayload('compress', { target: { value } } as any)}
                                            />
                                            <Page.ContentDesc>{`use gzip`}</Page.ContentDesc>
                                        </Page.DpRow> */}
                                    </Page.ContentBlock>
                                    {/* DESTINATION - options */}
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>Options</Page.ContentTitle>
                                        <Page.Input
                                            pWidth={'364px'}
                                            pValue={sCreatePayload.options}
                                            pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('options', event)}
                                        />
                                    </Page.ContentBlock>
                                </>
                            )}
                        </Page.ContentBlock>
                        {/* Create btn */}
                        <Page.ContentBlock>
                            <Page.TextButton pText="Create" pType="CREATE" pCallback={createItem} />
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
                            <Page.SubTitle>Destination</Page.SubTitle>
                        </Page.ContentBlock>
                        {/* Writing Descriptor */}
                        <Page.ContentBlock>
                            <Page.ContentTitle>Writing Descriptor</Page.ContentTitle>
                            <Page.ContentDesc>Parses the message and write it in the specified table.</Page.ContentDesc>
                            <Page.ContentDesc>The syntax of writing descriptor is …</Page.ContentDesc>
                            <Page.CopyBlock pContent={'db/{method}/{table_name}:{format}:{compress}?{options}'} />
                            <Page.ContentBlock pHoverNone>
                                {/* method */}
                                <Page.ContentDesc>Method</Page.ContentDesc>
                                <Page.ContentText pContent={`There are two methods append and write.`} />
                                <div style={{ width: 'auto', maxWidth: '400px' }}>
                                    <Page.Table pList={SUBR_METHOD_TABLE} dotted />
                                </div>
                                {/* table_name */}
                                <Page.Space pHeight="16px" />
                                <Page.ContentDesc>Table name</Page.ContentDesc>
                                <Page.ContentText pContent={`Specify the destination table name, case insensitive.`} />
                                {/* format */}
                                <Page.Space pHeight="16px" />
                                <Page.ContentDesc>Format</Page.ContentDesc>
                                <div style={{ width: 'auto', maxWidth: '150px' }}>
                                    <Page.Table pList={SUBR_FORMAT_TABLE} dotted />
                                </div>
                                {/* compress */}
                                <Page.Space pHeight="16px" />
                                <Page.ContentDesc>Compress</Page.ContentDesc>
                                <Page.ContentText pContent={`Currently gzip is supported, If :{compress} part is omitted, it means the data is not compressed.`} />
                                {/* Options */}
                                <Page.Space pHeight="16px" />
                                <Page.ContentDesc>Options</Page.ContentDesc>
                                <Page.ContentText pContent="The writing description can contain an optional question-mark-separated URL-encoded parameters." />
                                <Page.Space pHeight="16px" />
                                <Page.Hr />
                                <Page.Space pHeight="12px" />
                                <Page.Table pList={SUBR_OPTIONS_TABLE} />
                            </Page.ContentBlock>
                        </Page.ContentBlock>
                        {/* TQL SCRIPT */}
                        <Page.ContentBlock>
                            <Page.ContentTitle>TQL script</Page.ContentTitle>
                            <Page.ContentDesc>{'The place of writing descriptor can be replaced with a file path of TQL script.'}</Page.ContentDesc>
                            <Page.ContentDesc>{'Pass the message to payload() in the TQL script.'}</Page.ContentDesc>
                            <Page.Space pHeight="16px" />
                            <Page.ContentDesc>Data writing TQL script example)</Page.ContentDesc>
                            <Page.CopyBlock pContent={'CSV(payload())\nMAPVALUE(1, parseTime(value(1), "ns"))\nMAPVALUE(2, parseFloat(value(2)))\nAPPEND( table("example") )'} />
                        </Page.ContentBlock>
                    </Page.Body>
                </Pane>
            </SplitPane>
        </Page>
    );
};
