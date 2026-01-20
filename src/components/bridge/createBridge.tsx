import { useRef, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Page, Alert, Button } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { gBoardList, gBridgeList } from '@/recoil/recoil';
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

    return (
        <Page pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <Page.Header />
                    <Page.Body>
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>name</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.Input pValue={sCreatePayload.name} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>type</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.Selector
                                pList={SELECTE_TYPE.map((type) => {
                                    return { name: type, data: type };
                                })}
                                pSelectedItem={sCreatePayload.type}
                                pCallback={(value: string) => handlePayload('type', { target: { value } } as any)}
                            />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>Connection string</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.Input pValue={sCreatePayload.path} pWidth={'400px'} pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('path', event)} />
                        </Page.ContentBlock>
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
                        <></>
                    </Page.Body>
                </Pane>
            </SplitPane>
        </Page>
    );
};
