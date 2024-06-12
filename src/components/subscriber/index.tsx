import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveBridge, gBoardList, gBridgeList } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { BridgeItemType, delBridge, getBridge } from '@/api/repository/bridge';
import { CreateBridge } from './createBridge';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { ConfirmModal } from '../modal/ConfirmModal';
import { AUTO_START_DESC } from '../timer/content';

export const SubScriber = ({ pCode }: { pCode: BridgeItemType }) => {
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
    const setResList = useSetRecoilState<BridgeItemType[] | undefined>(gBridgeList);
    const TYPE = 'subscriber';
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);

    /** delete item */
    const deleteItem = async () => {
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
        setIsDeleteModal(false);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        console.log('pCode', pCode);
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
                <ExtensionTab pRef={sBodyRef}>
                    <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>subscriber name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.name}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>bridge</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.bridge}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>topic</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.topic}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>task</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.task}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>subscriber state</ExtensionTab.ContentTitle>
                                    {!(sPayload?.state?.includes('STOP') || sPayload?.state?.includes('RUNNING')) ? (
                                        <ExtensionTab.ContentDesc>
                                            <ExtensionTab.TextResErr pText={sPayload.state} />
                                        </ExtensionTab.ContentDesc>
                                    ) : (
                                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'row' }}>
                                            <ExtensionTab.Switch
                                                pState={sPayload.state === 'RUNNING'}
                                                pCallback={() => {}}
                                                pBadge={sPayload.state.includes('STOP') ? 'STOP' : 'RUNNING'}
                                            />
                                        </div>
                                    )}
                                </ExtensionTab.ContentBlock>

                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>qos</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.qos}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Checkbox pValue={sPayload.autoStart} pDisable />
                                        <ExtensionTab.ContentDesc>{AUTO_START_DESC}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
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
                                {sCommandRes.test.data && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>{'test response'}</ExtensionTab.ContentTitle>
                                        <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(sCommandRes.test.data, null, 4)}</pre>
                                    </ExtensionTab.ContentBlock>
                                )}
                                {sCommandRes.command.data && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>{'Command response'}</ExtensionTab.ContentTitle>
                                        {sCommandRes.command.data.column && sCommandRes.command.data.rows ? (
                                            <div style={{ margin: '10px 20px', padding: '12px 16px 12px 0' }}>
                                                <ExtensionTab.Table pList={{ columns: sCommandRes.command.data.column, rows: sCommandRes.command.data.rows }} />
                                            </div>
                                        ) : (
                                            <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(sCommandRes.command.data, null, 4)}</pre>
                                        )}
                                    </ExtensionTab.ContentBlock>
                                )}
                            </ExtensionTab.Body>
                        </Pane>
                    </SplitPane>
                </ExtensionTab>
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
