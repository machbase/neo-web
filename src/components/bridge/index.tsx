import { Button, Page } from '@/design-system/components';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveBridge, gActiveSubr, gBoardList, gBridgeList, gSelectedTab } from '@/recoil/recoil';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { BridgeItemType, commandBridge, delBridge } from '@/api/repository/bridge';
import { CreateBridge } from './createBridge';
import { useEffect, useRef, useState } from 'react';
import { LuFlipVertical } from 'react-icons/lu';
import { ConfirmModal } from '../modal/ConfirmModal';
import { getCommandState } from '@/utils/bridgeCommandHelper';
import { SUBSCRIBER_TYPE, bridgeTypeHelper } from './content';
import { generateUUID } from '@/utils';

export const Bridge = ({ pCode }: { pCode: BridgeItemType }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveBridge);
    const [sPayload, setPayload] = useState<any>(pCode);
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCommandRes, setCommandRes] = useState<{
        command: { message: string; data: any };
        test: { message: string; data: any };
    }>({
        command: { message: '', data: undefined },
        test: { message: '', data: undefined },
    });
    const [sBridgeList, setBridgeList] = useRecoilState<BridgeItemType[] | undefined>(gBridgeList);
    const TYPE = 'bridge';
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const setActiveSubrName = useSetRecoilState<any>(gActiveSubr);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);

    /** delete item */
    const deleteItem = async () => {
        const sRes = await delBridge(pCode.name);
        if (sRes.success) {
            const sTempList = sBridgeList ? sBridgeList.filter((aInfo: any) => aInfo.name !== pCode.name) : [];
            if (sTempList && sTempList.length > 0) {
                setActiveName(sTempList[0].name);
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TYPE);
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                name: `${TYPE.toUpperCase()}: ${sTempList[0].name}`,
                                code: sTempList[0],
                                savedCode: sTempList[0],
                            };
                        }
                        return aBoard;
                    });
                });
            } else {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TYPE);
                setActiveName(undefined);
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                name: `${TYPE.toUpperCase()}: create`,
                                code: undefined,
                                savedCode: false,
                            };
                        }
                        return aBoard;
                    });
                });
            }
            setBridgeList(sTempList);
        }
        setIsDeleteModal(false);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const handlePayload = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const sTmp = JSON.parse(JSON.stringify(sPayload));
        sTmp.command = (e.target as HTMLInputElement).value;
        setPayload(sTmp);
    };
    const checkExistTab = (aType: string) => {
        const sResut = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === aType;
        }, false);
        return sResut;
    };
    /** Open subr create page */
    const handleNewSubr = () => {
        const sExistKeyTab = checkExistTab('subscriber');
        setActiveSubrName(undefined);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'subscriber');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `SUBR: create`,
                            code: { bridge: pCode, subr: {} },
                            savedCode: false,
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
                    type: 'subscriber',
                    name: `SUBR: create`,
                    code: { bridge: pCode, subr: {} },
                    savedCode: false,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handleCommand = async (aState: 'test' | 'command') => {
        let sCommand: any = undefined;
        let sState: any = undefined;

        switch (aState) {
            case 'command':
                sCommand = sPayload?.command ?? '';
                sState = getCommandState(sPayload?.command ?? '');
                break;
            default:
                sState = 'test';
                break;
        }
        const sTmpRes: any = JSON.parse(JSON.stringify(sCommandRes));

        const sResCommand = await commandBridge(sState, pCode.name, sCommand);
        if (sResCommand.success) {
            sTmpRes[aState].message = '';
            if (sResCommand.data) {
                sTmpRes[aState].data = (sResCommand as any).data;
            } else {
                sTmpRes[aState].data = sResCommand as any;
            }
        } else {
            if (sResCommand.data && (sResCommand as any).data?.reason) {
                sTmpRes[aState].data = (sResCommand as any).data;
                sTmpRes[aState].message = (sResCommand as any).data?.reason;
            } else {
                sTmpRes[aState].data = (sResCommand as any).statusText;
                sTmpRes[aState].message = (sResCommand as any).statusText;
            }
        }
        setCommandRes(sTmpRes);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        setPayload(pCode);
        setCommandRes({ command: { message: '', data: undefined }, test: { message: '', data: undefined } });
    }, [pCode]);
    useEffect(() => {
        if (sBodyRef && sBodyRef.current && sBodyRef.current.offsetWidth) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);

    return (
        <>
            {/* Show info */}
            {sPayload && sActiveName !== '' && (
                <Page pRef={sBodyRef}>
                    <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                        <Pane minSize={400}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Bridge name</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.name}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Type</Page.ContentTitle>
                                    <Page.ContentDesc>{bridgeTypeHelper(sPayload.type)}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Connection string</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.path}</Page.ContentDesc>
                                </Page.ContentBlock>
                                {/* Test  */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>bridge connection</Page.ContentTitle>
                                    <div style={{ marginTop: '8px' }}>
                                        <Page.TextButton pText="Delete" pType="DELETE" pCallback={handleDelete} pIsDisable={sPayload?.childs?.length > 0} />
                                        <Page.TextButton pText="Test" pType="CREATE" pCallback={() => handleCommand('test')} />
                                        {SUBSCRIBER_TYPE.includes(sPayload.type) && (
                                            <Page.TextButton pWidth="120px" pText="New subscriber" pType="CREATE" pCallback={handleNewSubr} />
                                        )}
                                    </div>
                                    {sCommandRes.test?.data && sCommandRes.test?.data?.success && <Page.TextResSuccess pText={'success'} />}
                                    {sCommandRes.test.message !== '' && <Page.TextResErr pText={sCommandRes.test.message} />}
                                </Page.ContentBlock>

                                {!SUBSCRIBER_TYPE.includes(sPayload.type) && (
                                    <>
                                        {/* Command */}
                                        <Page.ContentBlock>
                                            <Page.Collapse pTrigger={<Page.ContentTitle>Command</Page.ContentTitle>}>
                                                <Page.TextArea pContent={sPayload.exec} pHeight={100} pCallback={(event) => handlePayload(event)} />
                                                <Page.Space />
                                                <Page.TextButton pText="Send" pType="CREATE" pCallback={() => handleCommand('command')} />
                                                {sCommandRes.command.message === '' && sCommandRes.command?.data && <Page.TextResSuccess pText={'success'} />}
                                                {sCommandRes.command.message !== '' && <Page.TextResErr pText={sCommandRes.command.message} />}
                                            </Page.Collapse>
                                        </Page.ContentBlock>
                                    </>
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
                                {sCommandRes.test.data && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>{'test response'}</Page.ContentTitle>
                                        <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(sCommandRes.test.data, null, 4)}</pre>
                                    </Page.ContentBlock>
                                )}
                                {sCommandRes.command.data && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>{'Command response'}</Page.ContentTitle>
                                        {sCommandRes.command.data.column && sCommandRes.command.data.rows ? (
                                            <div style={{ margin: '10px 20px', padding: '12px 16px 12px 0' }}>
                                                <Page.Table pList={{ columns: sCommandRes.command.data.column, rows: sCommandRes.command.data.rows }} />
                                            </div>
                                        ) : (
                                            <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(sCommandRes.command.data, null, 4)}</pre>
                                        )}
                                    </Page.ContentBlock>
                                )}
                            </Page.Body>
                        </Pane>
                    </SplitPane>
                </Page>
            )}
            {/* Show create */}
            {!sActiveName && <CreateBridge />}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteItem}
                    pContents={<div className="body-content">{`Do you want to delete this bridge?`}</div>}
                />
            )}
        </>
    );
};
