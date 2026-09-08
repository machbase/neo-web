import { KeyItemType, delKey, getKeyList } from '@/api/repository/key';
import { Page, SplitPane, Pane, Alert, Toast } from '@/design-system/components';
import { CreateKey } from '@/components/securityKey/createKey';
import { useRecoilState } from 'recoil';
import { gActiveKey, gBoardList, gKeyList } from '@/recoil/recoil';
import { SashContent } from 'split-pane-react';
import { useState } from 'react';
import { ConfirmModal } from '../modal/ConfirmModal';
import { resMessage } from '@/utils/resMessage';
import { PiCertificateLight } from 'react-icons/pi';
import { StatusBadge, ValidityBar, FactRow, UsageBlock, expiryState, asDate, humanizeSpan, detailStyles as styles } from './detailParts';

// Certificate board. `gActiveKey` holds the numeric management id of the selected certificate;
// an empty value means the create form. Names are NOT unique, so every lookup and the delete
// confirmation are keyed on `id`.

export const SecurityKey = ({ pCode }: { pCode: KeyItemType & { reissueName?: string } }) => {
    const [sCertList, setCertList] = useRecoilState<KeyItemType[] | undefined>(gKeyList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sActiveKey, setActiveKey] = useRecoilState<any>(gActiveKey);
    // sizes must be state: a frozen literal with a no-op onChange leaves the sash unable to move
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);

    const sTarget = sBoardList.find((aBoard: any) => aBoard.type === 'key');

    /** delete certificate — `key.delete(id)` takes the numeric management id */
    const deleteKey = async () => {
        const sRes = await delKey(pCode.id);
        if (!sRes.success) {
            // toast, not inline: the old Alert sat at the bottom of this pane, below the fold on a
            // long certificate page, while the confirm modal had already closed
            Toast.error(resMessage(sRes, `Failed to delete certificate '${pCode.name}'`), { id: 'cert-delete' });
            setIsDeleteModal(false);
            return;
        }
        Toast.success(`Certificate '${pCode.name}' deleted`, { id: 'cert-delete' });
        const sList = await getKeyList();
        setCertList(sList.success ? sList.data : undefined);

        const sRemain = (sCertList ?? []).filter((aCert) => aCert.id !== pCode.id);
        if (sRemain.length > 0) {
            setActiveKey(sRemain[0].id);
            setBoardList((aBoardList: any) =>
                aBoardList.map((aBoard: any) => (aBoard.id === sTarget?.id ? { ...sTarget, name: `CERT: ${sRemain[0].name}`, code: sRemain[0], savedCode: sRemain[0] } : aBoard))
            );
        } else {
            setActiveKey('');
            setBoardList((aBoardList: any) =>
                aBoardList.map((aBoard: any) => (aBoard.id === sTarget?.id ? { ...sTarget, name: 'CERT: create', code: undefined, savedCode: undefined } : aBoard))
            );
        }
        setIsDeleteModal(false);
    };
    /*
     * Reissue — hidden for now, kept because the flow is the only way to renew: a certificate cannot
     * be renewed in place, so it means generating a new key pair under the same client id, deploying
     * it, then deleting this one. Restoring it is this block plus the button below.
     *
     * const handleReissue = () => {
     *     setActiveKey('');
     *     setBoardList((aBoardList: any) =>
     *         aBoardList.map((aBoard: any) => (aBoard.id === sTarget?.id ? { ...sTarget, name: 'CERT: create', code: { reissueName: pCode.name }, savedCode: false } : aBoard))
     *     );
     * };
     */
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const Resizer = () => <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;

    const sHasSelection = sActiveKey !== '' && sActiveKey !== undefined && sActiveKey !== null && !!pCode?.name;
    const sState = sHasSelection ? expiryState(pCode.notAfter) : 'ok';

    return (
        <>
            {sHasSelection && (
                <Page>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={sGroupWidth} onChange={setGroupWidth}>
                        <Pane minSize={400}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <div className={styles.head}>
                                        <div className={styles.headMain}>
                                            <div className={styles.titleRow}>
                                                <PiCertificateLight size={20} className={styles.glyph} />
                                                <span className={styles.title}>{pCode.name}</span>
                                                <StatusBadge pState={sState} pNotAfter={pCode.notAfter} />
                                            </div>
                                            <span className={styles.subline}>{`X.509 client certificate · id ${pCode.id} · CN ${pCode.name}`}</span>
                                        </div>
                                        <div className={styles.actions}>
                                            {/* <Page.TextButton pText="Reissue" pWidth="80px" pType="CREATE" mr="0px" mb="0px" pCallback={handleReissue} /> */}
                                            <Page.TextButton pText="Delete" pWidth="70px" pType="DELETE" mr="0px" mb="0px" pCallback={handleDelete} />
                                        </div>
                                    </div>
                                </Page.ContentBlock>

                                {sState !== 'ok' && (
                                    <Page.ContentBlock>
                                        <Alert
                                            variant={sState === 'expired' ? 'error' : 'warning'}
                                            message={
                                                sState === 'expired'
                                                    ? 'This certificate has expired. Clients presenting it can no longer authenticate — issue a replacement and deploy it.'
                                                    : `Expires in ${humanizeSpan(pCode.notAfter - Date.now() / 1000)}. Issue a replacement, deploy it to the client, then delete this one.`
                                            }
                                        />
                                    </Page.ContentBlock>
                                )}

                                <Page.ContentBlock>
                                    <ValidityBar pFrom={pCode.notBefore} pTo={pCode.notAfter} pState={sState} />
                                </Page.ContentBlock>

                                <Page.ContentBlock>
                                    <div className={styles.facts}>
                                        <FactRow pLabel="id" pValue={String(pCode.id)} />
                                        <FactRow pLabel="notBefore" pValue={asDate(pCode.notBefore)} />
                                        <FactRow pLabel="notAfter" pValue={asDate(pCode.notAfter)} pTone={sState} />
                                        {/*
                                          * The certificate's SAN URI (`urn:machbase:neo:client:<name>`) is deliberately NOT shown here.
                                          * `key.list` does not return it — it would have to be reassembled client-side from the server's
                                          * formatting rule, so it would sit in this table looking like API data while actually being a guess
                                          * that goes stale the moment the server changes the format. It also carries nothing the name above
                                          * does not already say.
                                          */}
                                    </div>
                                </Page.ContentBlock>
                            </Page.Body>
                        </Pane>
                        <Pane minSize={360}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <UsageBlock
                                        pWhere="MQTT TLS client auth"
                                        pCode={`mosquitto_pub --cafile server.pem \\\n  --cert ${pCode.name}_cert.pem --key ${pCode.name}_key.pem \\\n  -h 127.0.0.1 -p 5653 -t db/append/EXAMPLE`}
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentDesc>
                                        The certificate body and private key exist only in the issue response and cannot be retrieved here. If lost, reissue.
                                    </Page.ContentDesc>
                                </Page.ContentBlock>
                            </Page.Body>
                        </Pane>
                    </SplitPane>
                </Page>
            )}
            {!sHasSelection && <CreateKey pInitialName={pCode?.reissueName} />}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteKey}
                    pContents={
                        <div className="body-content">
                            {/* names are not unique — show the id that actually identifies the row */}
                            <span>{pCode.name}</span>
                            <span>(id {pCode.id})</span>
                            <span>{`Do you want to delete this certificate?`}</span>
                        </div>
                    }
                />
            )}
        </>
    );
};
