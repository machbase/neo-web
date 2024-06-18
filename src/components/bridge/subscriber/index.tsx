import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveSubr, gDelSubr, gStateSubr } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import { commandSubr, delSubr, getSubrItem } from '@/api/repository/bridge';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../../modal/ConfirmModal';
import { AUTO_START_DESC } from '../../timer/content';
import { CreateSubr } from './createSubr';
import { VscWarning } from 'react-icons/vsc';
import SplitPane from 'split-pane-react/esm/SplitPane';

export const Subscriber = ({ pCode }: { pCode: any }) => {
    const setDelSubr = useSetRecoilState(gDelSubr);
    const sActiveSubr = useRecoilValue<any>(gActiveSubr);
    const setStateSubr = useSetRecoilState(gStateSubr);
    const [sPayload, setPayload] = useState<any>(pCode);
    const [sState, setState] = useState<any>('');
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const [sCommandResMessage, setCommandResMessage] = useState<string | undefined>(undefined);

    /** delete item */
    const deleteItem = async () => {
        const sRes: any = await delSubr(pCode.subr.name);
        if (sRes.success) {
            setDelSubr(pCode);
            setResErrMessage(undefined);
        } else setResErrMessage(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
        setIsDeleteModal(false);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const handleCommand = async () => {
        let sSetState: any = undefined;
        if (sState === 'STARTING' || sState === 'RUNNING') sSetState = 'STOP';
        else sSetState = 'STARTING';
        const sResCommand: any = await commandSubr(sSetState === 'STOP' ? 'stop' : 'start', pCode.subr.name);
        const sResSubrInfo: any = await getSubrItem(pCode.subr.name);
        if (sResCommand.success) {
            setCommandResMessage(undefined);
        } else setCommandResMessage(sResCommand?.data ? (sResCommand as any).data.reason : (sResCommand.statusText as string));
        setStateSubr({ target: pCode, state: sResSubrInfo?.success ? sResSubrInfo.data.state : 'UNKNWON' });
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;
    };

    useEffect(() => {
        setPayload(pCode);
        setState(pCode?.subr?.state ?? '');
        if (sPayload?.subr?.name !== pCode?.subr?.name) {
            setResErrMessage(undefined);
            setCommandResMessage(undefined);
        }
    }, [pCode]);

    return (
        <>
            {/* Show info */}
            {sPayload.subr && sActiveSubr && (
                <ExtensionTab>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={['50', '50']} onChange={() => {}}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.SubTitle>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', alignContent: 'center' }}>
                                            <div style={{ display: 'flex' }}> Subscriber</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', marginTop: '20px' }}>
                                                {/* STATE */}
                                                <ExtensionTab.Switch
                                                    pState={sState.includes('RUNNING') || sState.includes('STARTING')}
                                                    pCallback={handleCommand}
                                                    pBadge={sState}
                                                    pBadgeL={true}
                                                />
                                                {sCommandResMessage && (
                                                    <ExtensionTab.DpRow>
                                                        <VscWarning style={{ fill: 'rgb(236 118 118)' }} />
                                                        <span style={{ margin: '8px', color: 'rgb(236 118 118)' }}>{sCommandResMessage}</span>
                                                    </ExtensionTab.DpRow>
                                                )}
                                            </div>
                                        </div>
                                    </ExtensionTab.SubTitle>
                                    <ExtensionTab.Hr />
                                </ExtensionTab.ContentBlock>
                                {/* name */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.subr.name}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                {/* Auto start */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Auto start</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.Checkbox pValue={sPayload.subr.autoStart} pDisable />
                                        <ExtensionTab.ContentDesc>{AUTO_START_DESC}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.ContentBlock>
                                {/* bridge */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>bridge</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.subr.bridge}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                {/* topic */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>topic</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.subr.topic}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                {/* QoS */}
                                {sPayload?.bridge?.type === 'mqtt' && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>QoS</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>{sPayload?.subr?.QoS ?? '0'}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.ContentBlock>
                                )}

                                {/* Queue */}
                                {sPayload?.subr?.queue && (
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Queue</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>{sPayload.subr.queue}</ExtensionTab.ContentDesc>
                                    </ExtensionTab.ContentBlock>
                                )}
                                {/* TASK */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Destination</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{sPayload.subr.task}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextButton pText="Delete" pWidth="80px" pType="DELETE" pCallback={handleDelete} mr="0px" />
                                    {sResErrMessage && (
                                        <ExtensionTab.DpRow>
                                            <VscWarning style={{ fill: 'rgb(236 118 118)' }} />
                                            <span style={{ margin: '8px', color: 'rgb(236 118 118)' }}>{sResErrMessage}</span>
                                        </ExtensionTab.DpRow>
                                    )}
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.Body>
                        </Pane>
                        <Pane>
                            <ExtensionTab.Header />
                        </Pane>
                    </SplitPane>
                </ExtensionTab>
            )}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteItem}
                    pContents={<div className="body-content">{`Do you want to delete this subscriber?`}</div>}
                />
            )}

            {!sActiveSubr && <CreateSubr pInit={pCode} />}
        </>
    );
};
