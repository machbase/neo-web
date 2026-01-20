import { Alert, Page } from '@/design-system/components';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveSubr, gDelSubr, gStateSubr } from '@/recoil/recoil';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { commandSubr, delSubr, getSubrItem } from '@/api/repository/bridge';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../../modal/ConfirmModal';
import { AUTO_START_DESC } from '../../timer/content';
import { CreateSubr } from './createSubr';

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
                <Page>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={['50', '50']} onChange={() => {}}>
                        <Pane minSize={400}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <Page.SubTitle>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', alignContent: 'center' }}>
                                            <div style={{ display: 'flex' }}> Subscriber</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', marginTop: '20px' }}>
                                                {/* STATE */}
                                                <Page.Switch
                                                    pState={sState.includes('RUNNING') || sState.includes('STARTING')}
                                                    pCallback={handleCommand}
                                                    pBadge={sState}
                                                    pBadgeL={true}
                                                />
                                                {sCommandResMessage && (
                                                    <Page.ContentDesc>
                                                        <div style={{ marginTop: '-10px' }}>
                                                            <Page.TextResErr pText={sCommandResMessage} />
                                                        </div>
                                                    </Page.ContentDesc>
                                                )}
                                            </div>
                                        </div>
                                    </Page.SubTitle>
                                    <Page.Hr />
                                </Page.ContentBlock>
                                {/* name */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>name</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.subr.name}</Page.ContentDesc>
                                </Page.ContentBlock>
                                {/* Auto start */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Auto start</Page.ContentTitle>
                                    <Page.DpRow>
                                        <Page.Checkbox label={AUTO_START_DESC} pValue={sPayload.subr.autoStart} pDisable />
                                    </Page.DpRow>
                                </Page.ContentBlock>
                                {/* bridge */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>bridge</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.subr.bridge}</Page.ContentDesc>
                                </Page.ContentBlock>
                                {/* topic */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>topic</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.subr.topic}</Page.ContentDesc>
                                </Page.ContentBlock>
                                {/* QoS */}
                                {sPayload?.bridge?.type === 'mqtt' && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>QoS</Page.ContentTitle>
                                        <Page.ContentDesc>{sPayload?.subr?.QoS ?? '0'}</Page.ContentDesc>
                                    </Page.ContentBlock>
                                )}

                                {/* Queue */}
                                {sPayload?.subr?.queue && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>Queue</Page.ContentTitle>
                                        <Page.ContentDesc>{sPayload.subr.queue}</Page.ContentDesc>
                                    </Page.ContentBlock>
                                )}
                                {/* TASK */}
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Destination</Page.ContentTitle>
                                    <Page.ContentDesc>{sPayload.subr.task}</Page.ContentDesc>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.TextButton pText="Delete" pWidth="80px" pType="DELETE" pCallback={handleDelete} mr="0px" />
                                </Page.ContentBlock>
                                {sResErrMessage && (
                                    <Page.ContentBlock>
                                        <Alert variant="error" message={sResErrMessage} />
                                    </Page.ContentBlock>
                                )}
                            </Page.Body>
                        </Pane>
                        <Pane>
                            <Page.Header />
                        </Pane>
                    </SplitPane>
                </Page>
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
