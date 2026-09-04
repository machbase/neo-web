import { Page, Toast } from '@/design-system/components';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveSubr, gDelSubr, gStateSubr } from '@/recoil/recoil';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { commandSubr, delSubr, getSubrItem } from '@/api/repository/bridge';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../../modal/ConfirmModal';
import { SUBR_AUTO_START_DESC } from './content';
import { CreateSubr } from './createSubr';
import { resMessage } from '@/utils/resMessage';

export const Subscriber = ({ pCode }: { pCode: any }) => {
    const setDelSubr = useSetRecoilState(gDelSubr);
    const sActiveSubr = useRecoilValue<any>(gActiveSubr);
    const setStateSubr = useSetRecoilState(gStateSubr);
    const [sPayload, setPayload] = useState<any>(pCode);
    // sizes must be state: a frozen literal with a no-op onChange leaves the sash unable to move
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sState, setState] = useState<any>('');
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);

    /** delete item */
    const deleteItem = async () => {
        const sRes: any = await delSubr(pCode.subr.id);
        if (sRes.success) {
            setDelSubr(pCode);
            Toast.success(`Subscriber '${pCode.subr.name}' deleted`, { id: 'subr-delete' });
        } else {
            Toast.error(resMessage(sRes, `Failed to delete subscriber '${pCode.subr.name}'`), { id: 'subr-delete' });
        }
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
        const sResCommand: any = await commandSubr(sSetState === 'STOP' ? 'stop' : 'start', pCode.subr.id);
        const sResSubrInfo = await getSubrItem(pCode.subr.id);
        // success needs no toast — the switch and its state badge already say it
        if (!sResCommand.success) {
            Toast.error(resMessage(sResCommand, `Failed to ${sSetState === 'STOP' ? 'stop' : 'start'} subscriber`), { id: 'subr-command' });
        }
        setStateSubr({ target: pCode, state: sResSubrInfo?.success ? sResSubrInfo.data.state : 'UNKNWON' });
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;
    };

    useEffect(() => {
        setPayload(pCode);
        setState(pCode?.subr?.state ?? '');
    }, [pCode]);

    return (
        <>
            {/* Show info */}
            {sPayload.subr && sActiveSubr && (
                <Page>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={sGroupWidth} onChange={setGroupWidth}>
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
                                        <Page.Checkbox label={SUBR_AUTO_START_DESC} pValue={sPayload.subr.autoStart} pDisable />
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

                                {/* Queue — readable since the subscriber.* split; it used to be write-only */}
                                {sPayload?.subr?.queue && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>Queue</Page.ContentTitle>
                                        <Page.ContentDesc>{sPayload.subr.queue}</Page.ContentDesc>
                                    </Page.ContentBlock>
                                )}
                                {/* Stream (NATS JetStream) */}
                                {sPayload?.subr?.stream && (
                                    <Page.ContentBlock>
                                        <Page.ContentTitle>Stream</Page.ContentTitle>
                                        <Page.ContentDesc>{sPayload.subr.stream}</Page.ContentDesc>
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
