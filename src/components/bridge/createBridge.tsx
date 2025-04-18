import { useEffect, useRef, useState } from 'react';
import { ExtensionTab } from '../extension/ExtensionTab';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { Pane, SashContent } from 'split-pane-react';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { gBoardList, gBridgeList } from '@/recoil/recoil';
import { VscWarning } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { BridgeItemType, CreatePayloadType, genBridge } from '@/api/repository/bridge';
import { SELECTE_TYPE } from './content';

export const CreateBridge = () => {
    const [sBridgeList, setBridgeList] = useRecoilState<BridgeItemType[]>(gBridgeList);
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<any[]>(['50', '50']);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCreatePayload, setCreatePayload] = useState<CreatePayloadType>({
        name: '',
        type: '',
        path: '',
    });
    const TYPE = 'bridge';

    /** create item */
    const createItem = async () => {
        const sRes = await genBridge(sCreatePayload);

        if (sRes.success) {
            setBridgeList([...sBridgeList, { ...sCreatePayload, type: sCreatePayload.type.toLowerCase() }] as any);
            handleSavedCode(true);
            setResErrMessage(undefined);
        } else {
            setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
        }
    };
    /** handle info */
    const handlePayload = (aTarget: string, aEvent: React.FormEvent<HTMLInputElement>) => {
        const sTarget = aEvent.target as HTMLInputElement;
        const sTempPayload = JSON.parse(JSON.stringify(sCreatePayload));
        sTempPayload[aTarget] = sTarget.value;
        setCreatePayload(sTempPayload);
        handleSavedCode(false);
    };
    /** Saved status */
    const handleSavedCode = (aSavedStatus: boolean) => {
        setBoardList((aBoardList: any) => {
            return aBoardList.map((aBoard: any) => {
                if (aBoard.type === TYPE) {
                    return {
                        ...aBoard,
                        name: `${TYPE.toUpperCase()}: create`,
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
                                <ExtensionTab.ContentTitle>name</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.Input pValue={sCreatePayload.name} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>type</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.Selector
                                pList={SELECTE_TYPE.map((type) => {
                                    return { name: type, data: type };
                                })}
                                pSelectedItem={sCreatePayload.type}
                                pCallback={(value: string) => handlePayload('type', { target: { value } } as any)}
                            />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>Connection string</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.Input
                                pValue={sCreatePayload.path}
                                pWidth={'400px'}
                                pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('path', event)}
                            />
                        </ExtensionTab.ContentBlock>

                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.TextButton pText="Create" pType="CREATE" pCallback={createItem} />
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
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Vertical"
                                pToolTipId="bridge-tab-hori"
                                pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                pIsActive={isVertical}
                                onClick={() => setIsVertical(true)}
                            />
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Horizontal"
                                pToolTipId="bridge-tab-ver"
                                pIcon={<LuFlipVertical />}
                                pIsActive={!isVertical}
                                onClick={() => setIsVertical(false)}
                            />
                        </div>
                    </ExtensionTab.Header>
                    <ExtensionTab.Body>
                        <></>
                    </ExtensionTab.Body>
                </Pane>
            </SplitPane>
        </ExtensionTab>
    );
};
