import { ApiTokenItemType, delApiToken, getApiTokens } from '@/api/repository/token';
import { Page, SplitPane, Pane, Alert } from '@/design-system/components';
import { CreateToken } from '@/components/securityKey/createToken';
import { useRecoilState } from 'recoil';
import { gActiveToken, gBoardList, gTokenList } from '@/recoil/recoil';
import { SashContent } from 'split-pane-react';
import { useState } from 'react';
import { ConfirmModal } from '../modal/ConfirmModal';
import { TokenIcon } from './icons';
import { StatusBadge, ValidityBar, FactRow, UsageBlock, expiryState, asDateTime, humanizeSpan, detailStyles as styles } from './detailParts';

// API token board. `gActiveToken` holds the numeric id of the selected token; empty means the
// create form. The list never carries the plaintext token — only `hint` — so this view offers no
// copy action for the secret; a lost token has to be reissued.

export const ApiToken = ({ pCode }: { pCode: ApiTokenItemType & { reissueName?: string } }) => {
    const [sTokenList, setTokenList] = useRecoilState<ApiTokenItemType[] | undefined>(gTokenList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sActiveToken, setActiveToken] = useRecoilState<any>(gActiveToken);
    // sizes must be state: a frozen literal with a no-op onChange leaves the sash unable to move
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sDeleteError, setDeleteError] = useState<string | undefined>(undefined);

    const sTarget = sBoardList.find((aBoard: any) => aBoard.type === 'token');

    /** delete token — `token.delete(id)` */
    const deleteToken = async () => {
        const sRes = await delApiToken(pCode.id);
        if (!sRes.success) {
            setDeleteError(sRes.reason);
            setIsDeleteModal(false);
            return;
        }
        setDeleteError(undefined);
        const sList = await getApiTokens();
        setTokenList(sList.success ? sList.data : undefined);

        const sRemain = (sTokenList ?? []).filter((aToken) => aToken.id !== pCode.id);
        if (sRemain.length > 0) {
            setActiveToken(sRemain[0].id);
            setBoardList((aBoardList: any) =>
                aBoardList.map((aBoard: any) => (aBoard.id === sTarget?.id ? { ...sTarget, name: `TOKEN: ${sRemain[0].name}`, code: sRemain[0], savedCode: sRemain[0] } : aBoard))
            );
        } else {
            setActiveToken('');
            setBoardList((aBoardList: any) =>
                aBoardList.map((aBoard: any) => (aBoard.id === sTarget?.id ? { ...sTarget, name: 'TOKEN: create', code: undefined, savedCode: undefined } : aBoard))
            );
        }
        setIsDeleteModal(false);
    };
    /*
     * Reissue — hidden for now, kept because the secret is unrecoverable and so "renewing" is always
     * issue-new-then-delete-old. Restoring it is this block plus the button below.
     *
     * const handleReissue = () => {
     *     setActiveToken('');
     *     setBoardList((aBoardList: any) =>
     *         aBoardList.map((aBoard: any) => (aBoard.id === sTarget?.id ? { ...sTarget, name: 'TOKEN: create', code: { reissueName: pCode.name }, savedCode: false } : aBoard))
     *     );
     * };
     */
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const Resizer = () => <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;

    const sHasSelection = sActiveToken !== '' && sActiveToken !== undefined && sActiveToken !== null && !!pCode?.hint;
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
                                                <TokenIcon size={20} className={styles.glyph} />
                                                <span className={styles.title}>{pCode.name}</span>
                                                <StatusBadge pState={sState} pNotAfter={pCode.notAfter} />
                                            </div>
                                            <span className={styles.subline}>{`API bearer token · id ${pCode.id} · user ${pCode.user}`}</span>
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
                                                    ? 'This token has expired. Clients presenting it can no longer authenticate — issue a replacement and deploy it.'
                                                    : `Expires in ${humanizeSpan(pCode.notAfter - Date.now() / 1000)}. Issue a replacement, deploy it to the client, then delete this one.`
                                            }
                                        />
                                    </Page.ContentBlock>
                                )}

                                <Page.ContentBlock>
                                    <ValidityBar pFrom={pCode.createdAt} pTo={pCode.notAfter} pState={sState} />
                                </Page.ContentBlock>

                                <Page.ContentBlock>
                                    <div className={styles.facts}>
                                        <FactRow pLabel="id" pValue={String(pCode.id)} />
                                        <FactRow pLabel="user" pValue={pCode.user} />
                                        <FactRow pLabel="hint" pValue={pCode.hint} pMono />
                                        <FactRow pLabel="createdAt" pValue={asDateTime(pCode.createdAt)} />
                                        <FactRow pLabel="notAfter" pValue={asDateTime(pCode.notAfter)} pTone={sState} />
                                        {/* omitempty on the server — absent means never used, not epoch 0 */}
                                        <FactRow pLabel="lastUsedAt" pValue={pCode.lastUsedAt ? asDateTime(pCode.lastUsedAt) : '— never used'} />
                                    </div>
                                </Page.ContentBlock>

                                {sDeleteError && (
                                    <Page.ContentBlock>
                                        <Alert variant="error" message={sDeleteError} />
                                    </Page.ContentBlock>
                                )}
                            </Page.Body>
                        </Pane>
                        <Pane minSize={360}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <UsageBlock
                                        pWhere="HTTP API · MQTT client auth"
                                        pCode={`curl -H "Authorization: Bearer $TOKEN" \\\n  http://127.0.0.1:5654/db/query?q=select+1\n\nmosquitto_pub -u "$TOKEN" \\\n  -h 127.0.0.1 -p 5653 -t db/append/EXAMPLE`}
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentDesc>The plaintext token exists only in the issue response. The list keeps just the hint, so if lost, reissue.</Page.ContentDesc>
                                </Page.ContentBlock>
                            </Page.Body>
                        </Pane>
                    </SplitPane>
                </Page>
            )}
            {!sHasSelection && <CreateToken pInitialName={pCode?.reissueName} />}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteToken}
                    pContents={
                        <div className="body-content">
                            {/* names are not unique — show the id that actually identifies the row */}
                            <span>{pCode.name}</span>
                            <span>(id {pCode.id})</span>
                            <span>{`Do you want to delete this token?`}</span>
                        </div>
                    }
                />
            )}
        </>
    );
};
