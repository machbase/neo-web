import { KeyItemType, getKeyList } from '@/api/repository/key';
import { ApiTokenItemType, getApiTokens } from '@/api/repository/token';
import { MouseEvent, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { gActiveKey, gActiveToken, gBoardList, gKeyList, gSelectedTab, gTokenList } from '@/recoil/recoil';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { getId } from '@/utils';
import { GoPlus } from 'react-icons/go';
import moment from 'moment';
import { Button, Side } from '@/design-system/components';
import { TokenIcon } from '@/components/securityKey/icons';
import { PiCertificateLight } from 'react-icons/pi';
import styles from './index.module.scss';

/** board types owned by this side panel — one tab each, reused rather than duplicated */
const CERT_BOARD = 'key';
const TOKEN_BOARD = 'token';

const DAY = 24 * 60 * 60;

/** expiry bucket from a unix-seconds notAfter — drives the status dot color */
const expiryState = (aNotAfter: number): 'expired' | 'soon' | 'ok' => {
    const sNow = Date.now() / 1000;
    if (aNotAfter <= sNow) return 'expired';
    if (aNotAfter - sNow <= 30 * DAY) return 'soon';
    return 'ok';
};
const asDate = (aUnixSec: number): string => (aUnixSec ? moment.unix(aUnixSec).format('YYYY-MM-DD') : '—');

export const SecurityKeySide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sActiveKey, setActiveKey] = useRecoilState<any>(gActiveKey);
    const [sActiveToken, setActiveToken] = useRecoilState<any>(gActiveToken);
    const [sCertList, setCertList] = useRecoilState<KeyItemType[] | undefined>(gKeyList);
    const [sTokenList, setTokenList] = useRecoilState<ApiTokenItemType[] | undefined>(gTokenList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseCert, setCollapseCert] = useState(true);
    const [sCollapseToken, setCollapseToken] = useState(true);

    /** Set certificate list — `key.list` only */
    const certList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sRes = await getKeyList();
        setCertList(sRes.success ? sRes.data : undefined);
    };
    /** Set token list — `token.list` only */
    const tokenList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sRes = await getApiTokens();
        setTokenList(sRes.success ? sRes.data : undefined);
    };

    /**
     * Open (or reuse) the single tab of a board type. Certificates and tokens each own one tab,
     * so selecting a second item replaces the contents rather than piling up tabs.
     */
    const openBoard = (aType: string, aName: string, aCode: any) => {
        const sTarget = sBoardList.find((aBoard: any) => aBoard.type === aType);
        if (sTarget) {
            setBoardList((aBoardList: any) =>
                aBoardList.map((aBoard: any) => (aBoard.id === sTarget.id ? { ...sTarget, name: aName, code: aCode, savedCode: aCode ?? false } : aBoard))
            );
            setSelectedTab(sTarget.id);
            return;
        }
        const sId = getId();
        setBoardList([...sBoardList, { id: sId, type: aType, name: aName, code: aCode, savedCode: aCode ?? false, path: '' }]);
        setSelectedTab(sId);
    };

    const openCert = (aCert: KeyItemType) => {
        setActiveKey(aCert.id);
        openBoard(CERT_BOARD, `CERT: ${aCert.name}`, aCert);
    };
    const createCert = (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        setActiveKey('');
        openBoard(CERT_BOARD, 'CERT: create', undefined);
    };
    const openToken = (aToken: ApiTokenItemType) => {
        setActiveToken(aToken.id);
        openBoard(TOKEN_BOARD, `TOKEN: ${aToken.name}`, aToken);
    };
    const createToken = (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        setActiveToken('');
        openBoard(TOKEN_BOARD, 'TOKEN: create', undefined);
    };

    useEffect(() => {
        certList();
        tokenList();
    }, []);

    return (
        <Side.Container>
            {/* TOKENS — listed first: bearer tokens are the credential most clients actually need */}
            <Side.Section>
                <Side.Collapse pCallback={() => setCollapseToken(!sCollapseToken)} pCollapseState={sCollapseToken}>
                    <span>
                        TOKENS
                        <span className={styles.count}>{sTokenList?.length ?? 0}</span>
                    </span>
                    <Button.Group>
                        <Button size="side" variant="ghost" isToolTip toolTipContent="Refresh" icon={<MdRefresh size={16} />} onClick={(aEvent: MouseEvent) => tokenList(aEvent)} aria-label="Refresh tokens" />
                        <Button size="side" variant="ghost" isToolTip toolTipContent="New token" icon={<GoPlus size={16} />} onClick={(aEvent: MouseEvent) => createToken(aEvent)} aria-label="New token" />
                    </Button.Group>
                </Side.Collapse>
                {sCollapseToken && (
                    <Side.List>
                        {sTokenList && sTokenList.length > 0 ? (
                            sTokenList.map((aToken) => {
                                const sState = expiryState(aToken.notAfter);
                                return (
                                    <Side.Item
                                        key={aToken.id}
                                        active={sActiveToken === aToken.id}
                                        onClick={() => openToken(aToken)}
                                        // the row shows the hint, not the date, so surface the expiry the dot refers to
                                        tooltip={`id ${aToken.id} · ${aToken.user} · expires ${asDate(aToken.notAfter)}`}
                                    >
                                        <Side.ItemContent>
                                            <Side.ItemIcon>
                                                <TokenIcon size={14} />
                                            </Side.ItemIcon>
                                            <Side.ItemText>{aToken.name}</Side.ItemText>
                                        </Side.ItemContent>
                                        <span className={`${styles.meta} ${styles.hint} ${sState !== 'ok' ? styles[`meta--${sState}`] : ''}`}>
                                            <span className={styles.hintText}>{aToken.hint}</span>
                                        </span>
                                    </Side.Item>
                                );
                            })
                        ) : (
                            // the section header's + already issues one, two rows above; a second
                            // affordance here would just be the same button twice
                            <div className={styles.empty}>No tokens issued</div>
                        )}
                    </Side.List>
                )}
            </Side.Section>

            {/* CERTIFICATES */}
            <Side.Section>
                <Side.Collapse pCallback={() => setCollapseCert(!sCollapseCert)} pCollapseState={sCollapseCert}>
                    <span>
                        CERTIFICATES
                        <span className={styles.count}>{sCertList?.length ?? 0}</span>
                    </span>
                    <Button.Group>
                        <Button size="side" variant="ghost" isToolTip toolTipContent="Refresh" icon={<MdRefresh size={16} />} onClick={(aEvent: MouseEvent) => certList(aEvent)} aria-label="Refresh certificates" />
                        <Button size="side" variant="ghost" isToolTip toolTipContent="New certificate" icon={<GoPlus size={16} />} onClick={(aEvent: MouseEvent) => createCert(aEvent)} aria-label="New certificate" />
                    </Button.Group>
                </Side.Collapse>
                {sCollapseCert && (
                    <Side.List>
                        {sCertList && sCertList.length > 0 ? (
                            sCertList.map((aCert) => {
                                const sState = expiryState(aCert.notAfter);
                                return (
                                    <Side.Item key={aCert.id} active={sActiveKey === aCert.id} onClick={() => openCert(aCert)} tooltip={`id ${aCert.id}`}>
                                        <Side.ItemContent>
                                            <Side.ItemIcon>
                                                <PiCertificateLight size={14} />
                                            </Side.ItemIcon>
                                            <Side.ItemText>{aCert.name}</Side.ItemText>
                                        </Side.ItemContent>
                                        <span className={`${styles.meta} ${sState !== 'ok' ? styles[`meta--${sState}`] : ''}`}>
                                            {asDate(aCert.notAfter)}
                                        </span>
                                    </Side.Item>
                                );
                            })
                        ) : (
                            <div className={styles.empty}>No certificates issued</div>
                        )}
                    </Side.List>
                )}
            </Side.Section>
        </Side.Container>
    );
};
