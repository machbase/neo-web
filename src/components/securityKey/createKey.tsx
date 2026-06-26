import { Copy, LuFlipVertical } from '@/assets/icons/Icon';
import { useRef, useState } from 'react';
import { IconButton } from '@/components/buttons/IconButton';
import { CreatePayloadType, GenKeyResType, KeyItemType, genKey, getKeyList } from '@/api/repository/key';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { gBoardList, gKeyList } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Page, Button, Alert } from '@/design-system/components';
import { SashContent } from 'split-pane-react';

// key.generate returns { certificate, key(privateKey), token }; serverKey is merged in by genKey via
// server.certificate.get. No zip (validity is fixed to 10 years server-side, zip download removed).
const KEY_TYPE_LIST: { name: string; data: string }[] = [
    { name: 'ECDSA', data: 'ecdsa' },
    { name: 'RSA', data: 'rsa' },
];

export const CreateKey = () => {
    const DOWNLOAD_LIST: string[] = ['certificate', 'privateKey', 'token', 'serverKey'];
    const RES_CAUTION: string = 'Caution: This is the last chance to copy and store PRIVATE KEY and TOKEN. It can not be redo.';
    const [sGenKeyInfo, setGenKeyInfo] = useState<GenKeyResType | undefined>(undefined);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const setSecurityKeyList = useSetRecoilState<KeyItemType[] | undefined>(gKeyList);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const [sTooltipTxt, setTooltipTxt] = useState<string>('Copy');
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCreatePayload, setCreatePayload] = useState<CreatePayloadType>({
        name: '',
        type: 'ecdsa',
        store: true,
    });

    /** create key — `key.generate(id, type, store)` */
    const createKey = async () => {
        const sRes = await genKey({
            name: sCreatePayload.name,
            type: sCreatePayload.type,
            store: sCreatePayload.store,
        });
        if (sRes.success) {
            setGenKeyInfo({ ...sRes, name: sCreatePayload.name as string });
            const sKeyList = await getKeyList();
            if (sKeyList.success) setSecurityKeyList(sKeyList.data);
            else setSecurityKeyList(undefined);
            handleSavedCode(true);
            setResErrMessage(undefined);
        } else {
            setGenKeyInfo(undefined);
            setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
        }
    };
    /** handle key info */
    const handlePayload = (aTarget: string, aEvent: React.FormEvent<HTMLInputElement>) => {
        const sTarget = aEvent.target as HTMLInputElement;
        setCreatePayload((prev) => ({ ...prev, [aTarget]: sTarget.value }));
        handleSavedCode(false);
    };
    /** Saved status */
    const handleSavedCode = (aSavedStatus: boolean) => {
        setBoardList((aBoardList: any) => {
            return aBoardList.map((aBoard: any) => {
                if (aBoard.type === 'key') {
                    return {
                        ...aBoard,
                        name: `KEY: create`,
                        savedCode: aSavedStatus,
                    };
                }
                return aBoard;
            });
        });
    };
    /** copy clipboard */
    const handleCopy = (aKey: string) => {
        setTooltipTxt('Copied!');
        sGenKeyInfo && ClipboardCopy(sGenKeyInfo[aKey] as string);
        setTimeout(() => {
            setTooltipTxt('Copy');
        }, 600);
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
                                <Page.ContentTitle>Client id</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>Used to generate keys</Page.ContentDesc>
                            <Page.Input pAutoFocus pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </Page.ContentBlock>
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>Type</Page.ContentTitle>
                            </Page.DpRow>
                            <Page.ContentDesc>Key encoding algorithm</Page.ContentDesc>
                            <Page.Selector
                                pList={KEY_TYPE_LIST}
                                pSelectedItem={sCreatePayload.type}
                                pCallback={(aSelectedItem: string) => handlePayload('type', { target: { value: aSelectedItem } } as any)}
                            />
                        </Page.ContentBlock>
                        <Page.ContentBlock>
                            <Page.ContentTitle>Store</Page.ContentTitle>
                            <Page.DpRow>
                                <Page.Checkbox
                                    label="Store the generated key on the server (so it appears in the key list)"
                                    pValue={sCreatePayload.store as boolean}
                                    pCallback={(value: boolean) => handlePayload('store', { target: { value } } as any)}
                                />
                            </Page.DpRow>
                        </Page.ContentBlock>
                        <Page.ContentBlock>
                            <Page.TextButton pText="Generate" pType="CREATE" pCallback={createKey} />
                        </Page.ContentBlock>
                        {!sGenKeyInfo && sResErrMessage && (
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
                                active={isVertical}
                                isToolTip
                                toolTipContent="Vertical"
                                icon={<LuFlipVertical size={16} style={{ transform: 'rotate(90deg)' }} />}
                                onClick={() => setIsVertical(true)}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                active={!isVertical}
                                isToolTip
                                toolTipContent="Horizontal"
                                icon={<LuFlipVertical size={16} />}
                                onClick={() => setIsVertical(false)}
                            />
                        </Button.Group>
                    </Page.Header>
                    {sGenKeyInfo && sGenKeyInfo.success && (
                        <Page.Body>
                            <Page.ContentBlock>
                                <Page.SubTitle>Response</Page.SubTitle>
                                <Page.ContentDesc>
                                    <Alert variant="warning" message={RES_CAUTION} />
                                </Page.ContentDesc>
                            </Page.ContentBlock>
                            {DOWNLOAD_LIST.map((aTxt: string) => {
                                return (
                                    <Page.ContentBlock key={aTxt}>
                                        <Page.DpRow>
                                            <Page.ContentTitle>{aTxt}</Page.ContentTitle>
                                            <IconButton
                                                pIsToopTip
                                                pToolTipContent={sTooltipTxt}
                                                pToolTipId={'shell-key-' + aTxt + '-block-math'}
                                                pWidth={25}
                                                pHeight={25}
                                                pIcon={<Copy />}
                                                onClick={() => handleCopy(aTxt)}
                                            />
                                        </Page.DpRow>
                                        <Page.ContentText pContent={sGenKeyInfo[aTxt] as string} />
                                    </Page.ContentBlock>
                                );
                            })}
                        </Page.Body>
                    )}
                </Pane>
            </SplitPane>
        </Page>
    );
};
