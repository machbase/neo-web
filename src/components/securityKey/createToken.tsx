import { useState } from 'react';
import { ApiTokenItemType, GenApiTokenResType, genApiToken, getApiTokens } from '@/api/repository/token';
import { gBoardList, gTokenList } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Page, Alert } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import moment from 'moment';
import { TokenIcon } from './icons';
import { FactRow, UsageBlock, asDateTime, detailStyles as styles } from './detailParts';

// `token.generate(name, notAfter)` — two params only. There is deliberately NO notBefore control:
// the server pins the start to `now`, so offering one would be a field the API cannot honor.
// The plaintext token comes back on this response alone; `token.list` afterwards only carries a hint.

const EXPIRE_LIST: { name: string; data: string }[] = [
    { name: 'default (+10 years)', data: 'default' },
    { name: 'pick a date', data: 'custom' },
];
const RESPONSE_CAUTION = 'The plaintext token appears in this response only — the list keeps just the hint.';

/** @param pInitialName prefilled name, handed over by the detail view's Reissue action */
export const CreateToken = ({ pInitialName }: { pInitialName?: string }) => {
    const [sGenInfo, setGenInfo] = useState<GenApiTokenResType | undefined>(undefined);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const setTokenList = useSetRecoilState<ApiTokenItemType[] | undefined>(gTokenList);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sName, setName] = useState<string>(pInitialName ?? '');
    const [sExpireMode, setExpireMode] = useState<string>('default');
    const [sEndDate, setEndDate] = useState<string>('');

    const sIsCustomExpire = sExpireMode === 'custom';

    /** chosen expiry as unix seconds; 0 hands the decision to the server (now + 10y) */
    const notAfterUnix = (): number => {
        if (!sIsCustomExpire || !sEndDate) return 0;
        const sMoment = moment(`${sEndDate} 00:00:00`);
        return sMoment.isValid() ? sMoment.unix() : 0;
    };
    /** what the server will land on, shown before issuing so the default is not a mystery */
    const sExpirePreview = sIsCustomExpire ? asDateTime(notAfterUnix()) : moment().add(10, 'y').format('YYYY-MM-DD HH:mm:ss');

    /**
     * The server accepts a notAfter that is already past and issues a token nobody can use — the
     * existing `tesaaaa` token is exactly that. The start is pinned to `now` server-side, so the
     * only meaningful check is that the expiry lies ahead of now.
     */
    const sExpireError = sIsCustomExpire && notAfterUnix() > 0 && notAfterUnix() <= Math.floor(Date.now() / 1000) ? 'notAfter must be in the future' : undefined;
    // the server only rejects blank/whitespace-only names — mirror exactly that, nothing stricter
    const sCanSubmit = sName.trim().length > 0 && !sExpireError;

    const handleSavedCode = (aSavedStatus: boolean) => {
        setBoardList((aBoardList: any) => aBoardList.map((aBoard: any) => (aBoard.type === 'token' ? { ...aBoard, name: 'TOKEN: create', savedCode: aSavedStatus } : aBoard)));
    };

    /** issue token — `token.generate(name, notAfter)` */
    const issueToken = async () => {
        if (!sCanSubmit) return;
        const sRes = await genApiToken(sName, notAfterUnix());
        if (sRes.success && sRes.data) {
            setGenInfo(sRes.data);
            const sList = await getApiTokens();
            setTokenList(sList.success ? sList.data : undefined);
            handleSavedCode(true);
            setResErrMessage(undefined);
        } else {
            setGenInfo(undefined);
            setResErrMessage(sRes.reason);
        }
    };

    /** hand the plaintext token over as a file — it cannot be re-fetched from the server */
    const handleDownload = () => {
        if (!sGenInfo?.token) return;
        const sBlob = new Blob([sGenInfo.token], { type: 'text/plain' });
        const sUrl = URL.createObjectURL(sBlob);
        const sLink = document.createElement('a');
        sLink.href = sUrl;
        sLink.setAttribute('download', `${sGenInfo.name || 'api'}.token`);
        document.body.appendChild(sLink);
        sLink.click();
        document.body.removeChild(sLink);
        URL.revokeObjectURL(sUrl);
    };

    const Resizer = () => <SashContent className={`security-key-sash-style`} />;

    return (
        <Page>
            <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <Page.Header />
                    <Page.Body>
                        <Page.ContentBlock>
                            <div className={styles.titleRow}>
                                <TokenIcon size={20} className={styles.glyph} />
                                <span className={styles.title}>New token</span>
                            </div>
                            <span className={styles.subline}>Bearer token for HTTP API and MQTT clients · start is pinned to now by the server</span>
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>name</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span className={styles.req}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>label only — spaces, uppercase and non-ASCII allowed, duplicates permitted</Page.ContentDesc>
                            <Page.Input
                                pAutoFocus
                                pValue={sName}
                                pPlaceholder="dashboard"
                                pCallback={(aEvent: React.FormEvent<HTMLInputElement>) => {
                                    setName((aEvent.target as HTMLInputElement).value);
                                    handleSavedCode(false);
                                }}
                            />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>notAfter</Page.ContentTitle>
                            <Page.Selector
                                pList={EXPIRE_LIST}
                                pSelectedItem={sExpireMode}
                                pCallback={(aValue: string) => {
                                    setExpireMode(aValue);
                                    handleSavedCode(false);
                                }}
                            />
                            {sIsCustomExpire && (
                                <>
                                    {/* ContentBlock has no internal gap, so stacked controls sit flush */}
                                    <Page.Space pHeight="8px" />
                                    <Page.DatePicker
                                        pTime={sEndDate}
                                        pPlaceholder="empty = +10 years"
                                        pSetApply={(aValue: any) => {
                                            setEndDate(aValue);
                                            handleSavedCode(false);
                                        }}
                                    />
                                </>
                            )}
                            <Page.ContentDesc>{sExpirePreview ? `expires ${sExpirePreview}` : 'server default — now + 10 years'}</Page.ContentDesc>
                            {sExpireError && (
                                <>
                                    <Page.Space pHeight="8px" />
                                    <Page.TextResErr pText={sExpireError} />
                                </>
                            )}
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.TextButton pText="Issue token" pWidth="110px" pType="CREATE" pIsDisable={!sCanSubmit} pCallback={issueToken} />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <div className={styles.formNote}>
                                <span>ⓘ</span>
                                <span>{RESPONSE_CAUTION} Clients that only need a token do not have to create a certificate.</span>
                            </div>
                        </Page.ContentBlock>

                        {!sGenInfo && sResErrMessage && (
                            <Page.ContentBlock>
                                <Alert variant="error" message={sResErrMessage} />
                            </Page.ContentBlock>
                        )}
                    </Page.Body>
                </Pane>

                <Pane minSize={360}>
                    <Page.Header />
                    {sGenInfo && (
                        <Page.Body>
                            <Page.ContentBlock>
                                <div className={styles.titleRow}>
                                    <span className={styles.title}>Response</span>
                                </div>
                                <span className={styles.subline}>{`id ${sGenInfo.id} · user ${sGenInfo.user}`}</span>
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <Alert variant="warning" message={RESPONSE_CAUTION} />
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <Page.CopyBlock pTitle="token" pContent={sGenInfo.token} />
                                <Page.TextButton pText="Download *.token" pWidth="140px" pType="CREATE" pCallback={handleDownload} />
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <div className={styles.facts}>
                                    <FactRow pLabel="id" pValue={String(sGenInfo.id)} />
                                    <FactRow pLabel="name" pValue={sGenInfo.name} />
                                    <FactRow pLabel="hint" pValue={sGenInfo.hint} pMono />
                                    <FactRow pLabel="createdAt" pValue={asDateTime(sGenInfo.createdAt)} />
                                    <FactRow pLabel="notAfter" pValue={asDateTime(sGenInfo.notAfter)} />
                                    {/* omitempty on the server — undefined means "never used", not epoch 0 */}
                                    <FactRow pLabel="lastUsedAt" pValue={sGenInfo.lastUsedAt ? asDateTime(sGenInfo.lastUsedAt) : '— never used'} />
                                </div>
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <UsageBlock pWhere="HTTP API · MQTT client auth" pCode={`curl -H "Authorization: Bearer $TOKEN" \\\n  http://127.0.0.1:5654/db/query?q=select+1`} />
                            </Page.ContentBlock>
                        </Page.Body>
                    )}
                </Pane>
            </SplitPane>
        </Page>
    );
};
