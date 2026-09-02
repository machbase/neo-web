import { useRef, useState } from 'react';
import { CreatePayloadType, GenKeyResType, KeyItemType, genKey, getKeyList } from '@/api/repository/key';
import { gBoardList, gKeyList } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { SplitPane, Pane, Page, Alert } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import moment from 'moment';
import { PiCertificateLight } from 'react-icons/pi';
import { FactRow, detailStyles as styles } from './detailParts';

// `key.generate(name, typ, notBefore, notAfter, store)` returns { id, name, certificate, key } and —
// only when store=true — `serverKey` and `zip`. There is no token: API tokens moved to `token.*`.
// None of certificate / privateKey / zip can be fetched again, hence the warnings before and after issuing.

const KEY_TYPE_LIST: { name: string; data: string }[] = [
    { name: 'ECDSA', data: 'ecdsa' },
    { name: 'RSA', data: 'rsa' },
];
const NAME_MAX = 40;
/**
 * The server's own check is `regexp.MatchString("[a-z][a-z0-9_.@-]+", name)` — unanchored, so it only
 * needs a matching substring: "Has Space!!xy" passes and lands a space inside the certificate URN.
 * Anchor it here so the client never sends a name the server would mangle.
 */
const NAME_RULE = /^[a-z][a-z0-9_.@-]*$/;

const RESPONSE_CAUTION = 'certificate · privateKey · zip are in this response only — they cannot be fetched again.';

/** @param pInitialName prefilled client id, handed over by the detail view's Reissue action */
export const CreateKey = ({ pInitialName }: { pInitialName?: string }) => {
    const [sGenKeyInfo, setGenKeyInfo] = useState<GenKeyResType | undefined>(undefined);
    const [sResErrMessage, setResErrMessage] = useState<string | undefined>(undefined);
    const setCertList = useSetRecoilState<KeyItemType[] | undefined>(gKeyList);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);
    const sBodyRef: any = useRef(null);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sStartTime, setStartTime] = useState<string>('');
    const [sEndTime, setEndTime] = useState<string>('');
    const [sCreatePayload, setCreatePayload] = useState<CreatePayloadType>({
        name: pInitialName ?? '',
        type: 'ecdsa',
        notBefore: 0,
        notAfter: 0,
        store: true,
    });

    const sName = String(sCreatePayload.name ?? '');
    const sNameInvalid = sName.length > 0 && !NAME_RULE.test(sName);
    const sNameError = sNameInvalid ? 'must start with a lowercase letter and use only a-z 0-9 _ . @ -' : undefined;

    /** string date -> unix seconds; empty or unparseable means "let the server decide" (0) */
    const toUnix = (aTxt: string): number => {
        if (!aTxt || Number(aTxt)) return 0;
        const sMoment = moment(`${aTxt} 00:00:00`);
        return sMoment.isValid() ? sMoment.unix() : 0;
    };

    /**
     * The server validates neither the order of the two dates nor whether notAfter is already past —
     * it happily issues a certificate that is dead on arrival. Block both here.
     * An empty notBefore means the server will use `now`, so that is what notAfter is compared against.
     */
    const sNotBefore = toUnix(sStartTime);
    const sNotAfter = toUnix(sEndTime);
    const sNowSec = Math.floor(Date.now() / 1000);
    const sRangeError =
        sNotAfter === 0
            ? undefined
            : sNotBefore > 0 && sNotAfter <= sNotBefore
              ? 'notAfter must come after notBefore'
              : sNotBefore === 0 && sNotAfter <= sNowSec
                ? 'notAfter must be in the future'
                : undefined;

    const sCanSubmit = sName.length > 0 && !sNameError && !sRangeError;

    /** create certificate — `key.generate(name, typ, notBefore, notAfter, store)` */
    const createKey = async () => {
        if (!sCanSubmit) return;
        const sRes = await genKey({
            name: sName,
            type: sCreatePayload.type,
            notBefore: sNotBefore,
            notAfter: sNotAfter,
            store: sCreatePayload.store,
        });
        if (sRes.success) {
            // the server lowercases the name; keep its value rather than the raw form input
            setGenKeyInfo(sRes);
            const sList = await getKeyList();
            setCertList(sList.success ? sList.data : undefined);
            handleSavedCode(true);
            setResErrMessage(undefined);
        } else {
            setGenKeyInfo(undefined);
            setResErrMessage(sRes.reason);
        }
    };
    const handlePayload = (aTarget: string, aValue: string | boolean) => {
        setCreatePayload((prev) => ({ ...prev, [aTarget]: aValue }));
        handleSavedCode(false);
    };
    /** Saved status */
    const handleSavedCode = (aSavedStatus: boolean) => {
        setBoardList((aBoardList: any) => aBoardList.map((aBoard: any) => (aBoard.type === 'key' ? { ...aBoard, name: 'CERT: create', savedCode: aSavedStatus } : aBoard)));
    };
    /** download zip (server.pem, {name}_cert.pem, {name}_key.pem) — store=true only */
    const handleDownloadFile = () => {
        if (!sGenKeyInfo?.zip) return;
        const sBytes = atob(sGenKeyInfo.zip as string);
        const sNumbers = new Array(sBytes.length);
        for (let i = 0; i < sBytes.length; i++) sNumbers[i] = sBytes.charCodeAt(i);
        const sBlob = new Blob([new Uint8Array(sNumbers)], { type: 'application/zip' });
        const sUrl = URL.createObjectURL(sBlob);
        const sLink = document.createElement('a');
        sLink.href = sUrl;
        sLink.setAttribute('download', `${sGenKeyInfo.name}.zip`);
        document.body.appendChild(sLink);
        sLink.click();
        document.body.removeChild(sLink);
        URL.revokeObjectURL(sUrl);
    };
    const handleTime = (aTarget: 'start' | 'end', aValue: string) => {
        if (aTarget === 'start') setStartTime(aValue);
        else setEndTime(aValue);
        handleSavedCode(false);
    };
    const Resizer = () => <SashContent className={`security-key-sash-style`} />;

    return (
        <Page pRef={sBodyRef}>
            <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={sGroupWidth} onChange={setGroupWidth}>
                <Pane minSize={400}>
                    <Page.Header />
                    <Page.Body>
                        <Page.ContentBlock>
                            <div className={styles.titleRow}>
                                <PiCertificateLight size={20} className={styles.glyph} />
                                <span className={styles.title}>New certificate</span>
                            </div>
                            <span className={styles.subline}>X.509 key pair for MQTT TLS and gRPC mutual auth</span>
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>name</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span className={styles.req}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.ContentDesc>{`starts with a lowercase letter · a-z 0-9 _ . @ - only · max ${NAME_MAX}`}</Page.ContentDesc>
                            <Page.Input
                                pAutoFocus
                                pValue={sName}
                                pMaxLen={NAME_MAX}
                                pPlaceholder="edge-gw-02"
                                pCallback={(aEvent: React.FormEvent<HTMLInputElement>) => handlePayload('name', (aEvent.target as HTMLInputElement).value)}
                            />
                            {sNameError && (
                                <>
                                    {/* ContentBlock has no internal gap, so the alert would sit flush on the input */}
                                    <Page.Space pHeight="8px" />
                                    <Page.TextResErr pText={sNameError} />
                                </>
                            )}
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.DpRow>
                                <Page.ContentTitle>type</Page.ContentTitle>
                                <Page.ContentDesc>
                                    <span className={styles.req}>*</span>
                                </Page.ContentDesc>
                            </Page.DpRow>
                            <Page.Selector pList={KEY_TYPE_LIST} pSelectedItem={String(sCreatePayload.type)} pCallback={(aValue: string) => handlePayload('type', aValue)} />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>notBefore</Page.ContentTitle>
                            <Page.DatePicker pTime={sStartTime} pPlaceholder="empty = now" pSetApply={(aValue: any) => handleTime('start', aValue)} />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>notAfter</Page.ContentTitle>
                            <Page.DatePicker pTime={sEndTime} pPlaceholder="empty = +10 years" pSetApply={(aValue: any) => handleTime('end', aValue)} />
                            {sRangeError && (
                                <>
                                    <Page.Space pHeight="8px" />
                                    <Page.TextResErr pText={sRangeError} />
                                </>
                            )}
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.ContentTitle>store</Page.ContentTitle>
                            {/* the shared checkbox wrapper is `justify-content: center`, so it needs a
                                flex row around it to sit on the label's left edge like every other field */}
                            <Page.DpRow>
                                <Page.Checkbox
                                    label="keep on the server and list it"
                                    pValue={Boolean(sCreatePayload.store)}
                                    pCallback={(aValue: boolean) => handlePayload('store', aValue)}
                                />
                            </Page.DpRow>
                            {!sCreatePayload.store && <Page.ContentDesc>without store the key is not listed, id comes back as 0, and serverKey · zip are not returned</Page.ContentDesc>}
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <Page.TextButton pText="Generate certificate" pWidth="150px" pType="CREATE" pIsDisable={!sCanSubmit} pCallback={createKey} />
                        </Page.ContentBlock>

                        <Page.ContentBlock>
                            <div className={styles.formNote}>
                                <span>ⓘ</span>
                                <span>{RESPONSE_CAUTION}</span>
                            </div>
                        </Page.ContentBlock>

                        {!sGenKeyInfo && sResErrMessage && (
                            <Page.ContentBlock>
                                <Alert variant="error" message={sResErrMessage} />
                            </Page.ContentBlock>
                        )}
                    </Page.Body>
                </Pane>

                <Pane minSize={360}>
                    <Page.Header />
                    {sGenKeyInfo && sGenKeyInfo.success && (
                        <Page.Body>
                            <Page.ContentBlock>
                                <div className={styles.titleRow}>
                                    <span className={styles.title}>Response</span>
                                </div>
                                <span className={styles.subline}>{`id ${sGenKeyInfo.id} · store=${String(Boolean(sGenKeyInfo.zip))}`}</span>
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <Alert variant="warning" message={RESPONSE_CAUTION} />
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <div className={styles.facts}>
                                    <FactRow pLabel="id" pValue={String(sGenKeyInfo.id)} />
                                    <FactRow pLabel="name" pValue={String(sGenKeyInfo.name)} />
                                </div>
                            </Page.ContentBlock>
                            {sGenKeyInfo.zip ? (
                                <Page.ContentBlock>
                                    <Page.TextButton pText="Download *.zip" pWidth="120px" pType="CREATE" pCallback={handleDownloadFile} />
                                    <Page.ContentDesc>{`zip: server.pem · ${sGenKeyInfo.name}_cert.pem · ${sGenKeyInfo.name}_key.pem`}</Page.ContentDesc>
                                </Page.ContentBlock>
                            ) : (
                                <Page.ContentBlock>
                                    <Page.ContentDesc>issued with store off — id is 0 and no zip is provided</Page.ContentDesc>
                                </Page.ContentBlock>
                            )}
                            <Page.ContentBlock>
                                <Page.CopyBlock pTitle="certificate" pContent={sGenKeyInfo.certificate as string} />
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <Page.CopyBlock pTitle="privateKey" pContent={sGenKeyInfo.privateKey as string} />
                            </Page.ContentBlock>
                            <Page.ContentBlock>
                                <Page.CopyBlock pTitle="serverKey" pContent={sGenKeyInfo.serverKey as string} />
                            </Page.ContentBlock>
                        </Page.Body>
                    )}
                </Pane>
            </SplitPane>
        </Page>
    );
};
