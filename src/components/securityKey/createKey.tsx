import { Copy, LuFlipVertical, VscWarning } from '@/assets/icons/Icon';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/buttons/IconButton';
import { CreatePayloadType, GenKeyResType, KeyItemType, genKey, getKeyList } from '@/api/repository/key';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { ExtensionTab } from '../extension/ExtensionTab';
import { gBoardList, gKeyList } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import moment from 'moment';
import './createKey.scss';

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
    const [sGroupWidth, setGroupWidth] = useState<number[]>([0, 0]);
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
        if (sBodyRef && sBodyRef.current) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);
    useEffect(() => {
        init();
    }, []);

    return (
        <ExtensionTab pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <ExtensionTab.Header />
                    <ExtensionTab.Body>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>Client id</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>
                                    <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.ContentDesc>Used to generate keys</ExtensionTab.ContentDesc>
                            <ExtensionTab.Input pAutoFocus pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>Valid After</ExtensionTab.ContentTitle>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.DatePicker pTime={sStartTime} pSetApply={(e: any) => handleTime('startTime', e)} />
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>Valid Before</ExtensionTab.ContentTitle>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.DatePicker pTime={sEndTime} pSetApply={(e: any) => handleTime('endTime', e)} />
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.TextButton pText="Generate" pType="CREATE" pCallback={createKey} />
                        </ExtensionTab.ContentBlock>
                        {!sGenKeyInfo && sResErrMessage && (
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
                                pToolTipId="se-key-tab-hori"
                                pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                pIsActive={isVertical}
                                onClick={() => setIsVertical(true)}
                            />
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Horizontal"
                                pToolTipId="se-key-tab-ver"
                                pIcon={<LuFlipVertical />}
                                pIsActive={!isVertical}
                                onClick={() => setIsVertical(false)}
                            />
                        </div>
                    </ExtensionTab.Header>
                    {sGenKeyInfo && sGenKeyInfo.success && (
                        <ExtensionTab.Body>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.SubTitle>Response</ExtensionTab.SubTitle>
                                <ExtensionTab.ContentDesc>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <VscWarning style={{ fill: 'rgb(223 217 82)' }} />
                                        <span style={{ margin: '8px', color: 'rgb(223 217 82)' }}>{RES_CAUTION}</span>
                                    </div>
                                </ExtensionTab.ContentDesc>
                            </ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRow>
                                    <div style={{ marginRight: '4px' }}>
                                        <ExtensionTab.TextButton pWidth="120px" pText={`Download *.zip`} pType="CREATE" pCallback={handleDownloadFile} />
                                    </div>
                                </ExtensionTab.DpRow>
                            </ExtensionTab.ContentBlock>
                            {DOWNLOAD_LIST.map((aTxt: string) => {
                                return (
                                    <ExtensionTab.ContentBlock key={aTxt}>
                                        <ExtensionTab.DpRow>
                                            <ExtensionTab.ContentTitle>{aTxt}</ExtensionTab.ContentTitle>
                                            <IconButton
                                                pIsToopTip
                                                pToolTipContent={sTooltipTxt}
                                                pToolTipId={'shell-key-' + aTxt + '-block-math'}
                                                pWidth={25}
                                                pHeight={25}
                                                pIcon={<Copy />}
                                                onClick={() => handleCopy(aTxt)}
                                            />
                                        </ExtensionTab.DpRow>
                                        <ExtensionTab.ContentText pContent={sGenKeyInfo[aTxt] as string} />
                                    </ExtensionTab.ContentBlock>
                                );
                            })}
                        </ExtensionTab.Body>
                    )}
                </Pane>
            </SplitPane>
        </ExtensionTab>
    );
};
