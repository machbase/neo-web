import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveBridge, gBoardList, gBridgeList } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { BridgeItemType, CommandBridgeStateType, commandBridge, delBridge, getBridge } from '@/api/repository/bridge';
import { CreateBridge } from './createBridge';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';

export const Bridge = ({ pCode }: { pCode: BridgeItemType }) => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveBridge);
    const [sPayload, setPayload] = useState<any>(pCode);
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCommandRes, setCommandRes] = useState<{ exec: { message: string; data: any }; query: { message: string; data: any } }>({
        exec: { message: '', data: [] },
        query: { message: '', data: [] },
    });
    const setResList = useSetRecoilState<BridgeItemType[] | undefined>(gBridgeList);
    const TYPE = 'bridge';

    /** delete item */
    const deleteItem = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Do you want to delete the ${TYPE} "${pCode.name}"?`)) {
            const sRes = await delBridge(pCode.name);
            if (sRes.success) {
                const sBridgeList = await getBridge();
                if (sBridgeList.success) setResList(sBridgeList?.data || []);
                else setResList([]);

                const sTempList = sBridgeList.data ? sBridgeList.data.filter((aInfo: any) => aInfo.name !== pCode.name) : [];
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
            }
        } else {
            alert('Delete Has Been Canceled.');
        }
    };
    const handlePayload = (aState: CommandBridgeStateType, e: React.FormEvent<HTMLTextAreaElement>) => {
        const sTmp = JSON.parse(JSON.stringify(sPayload));
        sTmp[aState] = (e.target as HTMLInputElement).value;
        setPayload(sTmp);
    };
    const handleCommand = async (aState: CommandBridgeStateType) => {
        let sCommand: any = undefined;
        switch (aState) {
            case 'exec':
                sCommand = sPayload.exec;
                break;
            case 'query':
                sCommand = sPayload.query;
                break;
            default:
                break;
        }
        const sResCommand = await commandBridge(aState, pCode.name, sCommand);
        const sTmpRes = JSON.parse(JSON.stringify(sCommandRes));
        if (sResCommand.success) {
            sTmpRes[aState].data = sResCommand.data;
            sTmpRes[aState].message = '';

            // const sBridgeList = await getBridge();
            // if (sBridgeList.success) setResList(sBridgeList.data);
            // else setResList([]);
            // const sTarget = sBridgeList.data.find((aKeyInfo: any) => aKeyInfo.name === pCode.name);
            // if (sTarget) {
            //     const aTarget = sBoardList.find((aBoard: any) => aBoard.type === TYPE);
            //     setBoardList((aBoardList: any) => {
            //         return aBoardList.map((aBoard: any) => {
            //             if (aBoard.id === aTarget.id) {
            //                 return {
            //                     ...aTarget,
            //                     code: sTarget,
            //                     savedCode: sTarget,
            //                 };
            //             }
            //             return aBoard;
            //         });
            //     });
            // }
        } else {
            // sTmpRes[aState].data = [];
            sTmpRes[aState].message = sResCommand.reason;
        }
        // example data
        if (aState === 'query')
            sTmpRes[aState].data = {
                column: ['id', 'company', 'employee', 'discount', 'plan', 'code', 'valid', 'memo', 'created_on'],
                rows: [
                    [2, 'test-company', 10, 1.234, 2.3456, 'c2d29867-3d0b-d497-9191-18a9d8ee7830', true, 'test memo', '2023-08-09T14:20:00+09:00'],
                    [3, 'test-company2', 10, 1.234, 2.3456, null, null, null, '2023-08-09T14:20:00+09:00'],
                ],
            };

        console.log('sTmpRes', sTmpRes);
        setCommandRes(sTmpRes);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        console.log('test', pCode);
        setPayload(pCode);
        setCommandRes({ exec: { message: '', data: [] }, query: { message: '', data: [] } });
    }, [pCode]);
    useEffect(() => {
        if (sBodyRef && sBodyRef.current) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);

    return (
        <>
            {/* Show info */}
            {sPayload && sActiveName !== '' && (
                <ExtensionTab pRef={sBodyRef}>
                    <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Bridge name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.name}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Type</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.type}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Path</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.path}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                {/* Exec  */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextArea pContent={sPayload.exec} pHeight={100} pCallback={(event) => handlePayload('exec', event)} />
                                    <ExtensionTab.TextButton pText="Exec" pType="COPY" pCallback={() => handleCommand('exec')} />
                                    {sCommandRes.exec.message !== '' && <ExtensionTab.TextResErr pText={sCommandRes.exec.message} />}
                                </ExtensionTab.ContentBlock>
                                {/* Command */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextArea pContent={sPayload.query} pHeight={100} pCallback={(event) => handlePayload('query', event)} />
                                    <ExtensionTab.TextButton pText="Query" pType="COPY" pCallback={() => handleCommand('query')} />
                                    {sCommandRes.query.message !== '' && <ExtensionTab.TextResErr pText={sCommandRes.query.message} />}
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextButton pText="Delete" pType="DELETE" pCallback={deleteItem} />
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.Body>
                        </Pane>
                        <Pane>
                            <ExtensionTab.Header>
                                <div style={{ display: 'flex' }}>
                                    <IconButton pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />} pIsActive={isVertical} onClick={() => setIsVertical(true)} />
                                    <IconButton pIcon={<LuFlipVertical />} pIsActive={!isVertical} onClick={() => setIsVertical(false)} />
                                </div>
                            </ExtensionTab.Header>
                            <ExtensionTab.Body>
                                {sCommandRes.query.data && sCommandRes.query.data.column && sCommandRes.query.data.rows && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>{'query response'}</ExtensionTab.ContentTitle>
                                        <div style={{ margin: '10px 20px', padding: '12px 16px 12px 0' }}>
                                            <ExtensionTab.Table pList={{ columns: sCommandRes.query.data.column, rows: sCommandRes.query.data.rows }} />
                                        </div>
                                    </ExtensionTab.ContentBlock>
                                )}
                            </ExtensionTab.Body>
                        </Pane>
                    </SplitPane>
                </ExtensionTab>
            )}
            {/* Show create */}
            {!sActiveName && <CreateBridge />}
        </>
    );
};
