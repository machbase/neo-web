import { Copy, LuFlipVertical, VscWarning } from '@/assets/icons/Icon';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/buttons/IconButton';
import { CreatePayloadType, GenKeyResType, KeyItemType, genKey, getKeyList } from '@/api/repository/key';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { ExtensionTab } from '../extension/ExtensionTab';
import { gKeyList } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { Pane, SashContent } from 'split-pane-react';
import moment from 'moment';
import SplitPane from 'split-pane-react/esm/SplitPane';
import './createKey.scss';

export const CreateKey = () => {
    const DOWNLOAD_LIST: string[] = ['certificate', 'privateKey', 'token', 'serverKey'];
    const RES_CAUTION: string = 'Caution: This is the last chance to copy and store PRIVATE KEY and TOKEN. It can not be redo';
    const [sGenKeyInfo, setGenKeyInfo] = useState<GenKeyResType | undefined>(undefined);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const setSecurityKeyList = useSetRecoilState<KeyItemType[] | undefined>(gKeyList);
    const [sStartTime, sSetStartTime] = useState<any>('');
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
            if (sKeyList.success) setSecurityKeyList(sKeyList.list);
            else setSecurityKeyList(undefined);
            setResErrMessage(undefined);
        } else {
            setGenKeyInfo(undefined);
            setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusTex as string));
        }
    };
    /** handle key info */
    const handlePayload = (aTarget: string, aEvent: React.FormEvent<HTMLInputElement>) => {
        const sTarget = aEvent.target as HTMLInputElement;
        const sTempPayload = sCreatePayload;
        sTempPayload[aTarget] = sTarget.value;
        setCreatePayload(sTempPayload);
    };
    /** download file (cert, key, token) */
    const handleDownloadFile = async () => {
        for await (const aTarget of DOWNLOAD_LIST) {
            if (sGenKeyInfo) {
                const blob = new Blob([sGenKeyInfo[aTarget] as string], { type: getFileType(sGenKeyInfo.name as string) });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = getFileName(aTarget, sGenKeyInfo.name as string);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
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
    /** return file type */
    const getFileType = (aKey: string): string => {
        switch (aKey) {
            case 'certificate':
            case 'privateKey':
                return 'text/plain';
            default:
                return 'application/octet-stream';
        }
    };
    /** return file name */
    const getFileName = (aKey: string, aFileName: string): string => {
        switch (aKey) {
            case 'certificate':
                return `${aFileName}_cert.pem`;
            case 'privateKey':
                return `${aFileName}_key.pem`;
            case 'serverKey':
                return `${aFileName}_key.crt`;
            default:
                return `${aFileName}_token`;
        }
    };
    /** Handle time */
    const handleTime = (aKey: string, aValue: any) => {
        if (aKey === 'startTime') sSetStartTime(aValue);
        else {
            console.log('end time', aValue);
            sSetEndTime(aValue);
        }
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
                            <ExtensionTab.Input pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('name', event)} />
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>valid date</ExtensionTab.ContentTitle>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.DatePicker pTime={sStartTime} pSetApply={(e: any) => handleTime('startTime', e)} />
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.DpRow>
                                <ExtensionTab.ContentTitle>expiry date</ExtensionTab.ContentTitle>
                            </ExtensionTab.DpRow>
                            <ExtensionTab.DatePicker pTime={sEndTime} pSetApply={(e: any) => handleTime('endTime', e)} />
                        </ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentBlock>
                            <ExtensionTab.TextButton pText="Generate" pType="CREATE" pCallback={createKey} />
                        </ExtensionTab.ContentBlock>
                        {!sGenKeyInfo && sResErrMessage && (
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRow>
                                    <VscWarning style={{ fill: 'rgb(236 118 118)' }} />
                                    <span style={{ margin: '8px', color: 'rgb(236 118 118)' }}>{sResErrMessage}</span>
                                </ExtensionTab.DpRow>
                            </ExtensionTab.ContentBlock>
                        )}
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
                                        <ExtensionTab.TextButton pWidth="150px" pText={`Download *.zip`} pType="CREATE" pCallback={handleDownloadFile} />
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
