import { Copy, LuFlipVertical } from '@/assets/icons/Icon';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/buttons/IconButton';
import { CreatePayloadType, GenKeyResType, KeyItemType, genKey, getKeyList } from '@/api/repository/key';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { gBoardList, gKeyList } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Page, Button, Alert } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import moment from 'moment';

export const CreateKey = () => {
    const DOWNLOAD_LIST: string[] = ['certificate', 'privateKey', 'token', 'serverKey'];
    const RES_CAUTION: string = 'Caution: This is the last chance to copy and store PRIVATE KEY and TOKEN. It can not be redo.';
    const [sGenKeyInfo, setGenKeyInfo] = useState<GenKeyResType | undefined>(undefined);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const setSecurityKeyList = useSetRecoilState<KeyItemType[] | undefined>(gKeyList);
    const [sStartTime, sSetStartTime] = useState<any>('');
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const [sEndTime, sSetEndTime] = useState<any>('');
    const [sTooltipTxt, setTooltipTxt] = useState<string>('Copy');
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sCreatePayload, setCreatePayload] = useState<CreatePayloadType>({
        name: '',
        notBefore: 0,
        notAfter: 0,
    });

    /** check time format */
    const isTimeFormat = (aTxt: string): boolean => {
        if (aTxt === '0') return false;
        if (Number(aTxt)) return false;
        return moment(aTxt).isValid();
    };
    /** create key */
    const createKey = async () => {
        const sPayload = {
            name: sCreatePayload.name,
            notBefore: isTimeFormat(sStartTime + ' 00:00:00') ? moment(sStartTime + ' 00:00:00').unix() : 0,
            notAfter: isTimeFormat(sEndTime + ' 00:00:00') ? moment(sEndTime + ' 00:00:00').unix() : 0,
        };
        const sRes = await genKey(sPayload);
        if (sRes.success) {
            setGenKeyInfo({ ...sRes, name: sCreatePayload.name });
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
        const sTempPayload = sCreatePayload;
        sTempPayload[aTarget] = sTarget.value;
        setCreatePayload(sTempPayload);
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
    /** download zip file (cert, key, token, pubkey) */
    const handleDownloadFile = async () => {
        if (sGenKeyInfo) {
            const byteCharacters = atob(sGenKeyInfo.zip as string);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/zip' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `${sGenKeyInfo.name as string}.zip`);
            document.body.appendChild(link);
            link.click();
        }
    };
    /** copy clipboard */
    const handleCopy = (aKey: string) => {
        setTooltipTxt('Copied!');
        sGenKeyInfo && ClipboardCopy(sGenKeyInfo[aKey] as string);
        setTimeout(() => {
            setTooltipTxt('Copy');
        }, 600);
    };
    /** Handle time */
    const handleTime = (aKey: string, aValue: any) => {
        handleSavedCode(false);
        if (aKey === 'startTime') sSetStartTime(aValue);
        else sSetEndTime(aValue);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };
    /** Set init time */
    const init = () => {
        const sDate = new Date();
        sSetStartTime(moment(sDate).format('YYYY-MM-DD'));
        sSetEndTime(moment(sDate).add(3, 'y').format('YYYY-MM-DD'));
    };

    useEffect(() => {
        init();
    }, []);

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
                                <Page.ContentTitle>Valid After</Page.ContentTitle>
                            </Page.DpRow>
                            <Page.DatePicker pTime={sStartTime} pSetApply={(e: any) => handleTime('startTime', e)} />
                        </Page.ContentBlock>
                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>Valid Before</Page.ContentTitle>
                            </Page.DpRow>
                            <Page.DatePicker pTime={sEndTime} pSetApply={(e: any) => handleTime('endTime', e)} />
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
                            <Page.ContentBlock>
                                <Page.DpRow>
                                    <div style={{ marginRight: '4px' }}>
                                        <Page.TextButton pWidth="120px" pText={`Download *.zip`} pType="CREATE" pCallback={handleDownloadFile} />
                                    </div>
                                </Page.DpRow>
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
