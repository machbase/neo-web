import './ProviderModal.scss';
import useEsc from '@/hooks/useEsc';
import Modal from '../modal/Modal';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Close } from '@/assets/icons/Icon';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_RPC_METHOD, E_WS_KEY, E_WS_TYPE } from '@/recoil/websocket';
import { WsRPC } from '@/utils/websocket';
import { SkeletonContainer, SkeletonItem } from './components/Skeleton';
import { RPC_ERROR_TYPE, RpcResponseParser } from '@/utils/Chat/RpcResponseParser';
import { ErrorBanner } from './components/ErrorBanner';
import { Loader } from '../loader';

const PROVIDER_ALLOWED_METHOD_LIST = [E_RPC_METHOD.LLM_GET_PROVIDERS, E_RPC_METHOD.LLM_GET_PROVIDER_CONF, E_RPC_METHOD.LLM_SET_PROVIDER_CONF];
const PROVIDER_UNIQUE_ID = 'provider-modal';
const PROVIDER_SESSION_ID = 3000;
const PROVIDER_ERR_DEFAULT = { code: -1, message: '' };

export const ProviderModal = ({ pTrigger }: { pTrigger: React.ReactElement }) => {
    const { msgBatch, sendMSG } = useWebSocket();
    const [sIsProviderModal, setIsProviderModal] = useState<boolean>(false);
    const [sProviderList, setProviderList] = useState<any[]>([]);
    const [sIsProviderLoad, setIsProviderLoad] = useState<boolean>(false);
    const [sSelectedProvider, setSelectedProvider] = useState<string>('');
    const [sIsConfLoad, setIsConfLoad] = useState<boolean>(false);
    const [sOriginProviderConf, setOriginProviderConf] = useState<{ name: string; value: string | number }[]>([]);
    const [sUpdateProviderConf, setUpdateProviderConf] = useState<{ name: string; value: string | number }[]>([]);
    const [sShowProviderDropdown, setShowProviderDropdown] = useState<boolean>(false);
    const [sIsSave, setIsSave] = useState<boolean>(false);
    const dropdownRef = useRef(null);
    const [sError, setError] = useState<RPC_ERROR_TYPE>(PROVIDER_ERR_DEFAULT);

    /** PROVIDER */
    const getProviderList = () => {
        const sGenObj = WsRPC.LLM.GenProvidersObj(PROVIDER_UNIQUE_ID, PROVIDER_SESSION_ID);
        sendMSG(sGenObj);
    };
    const getProviderConf = () => {
        const sGenObj = WsRPC.LLM.GenProviderConfObj(PROVIDER_UNIQUE_ID, PROVIDER_SESSION_ID, sSelectedProvider);
        sendMSG(sGenObj);
    };
    const updateProviderConf = (conf: any[]) => {
        const sParsedConf = Object.fromEntries(conf.map((item) => [item.name, item.value]));
        const sGenObj = WsRPC.LLM.GenProviderConfSetObj(PROVIDER_UNIQUE_ID, PROVIDER_SESSION_ID, sSelectedProvider, sParsedConf);
        sendMSG(sGenObj);
    };
    const handleConfValue = (e: React.FormEvent<HTMLInputElement>, idx: number) => {
        setUpdateProviderConf((prev) => {
            const sUpdateConf = JSON.parse(JSON.stringify(prev));
            const target = e.target as HTMLInputElement;
            sUpdateConf[idx].value = target.value;
            return sUpdateConf;
        });
    };
    const handleConfSave = () => {
        setIsSave(true);
        const originMap = new Map(sOriginProviderConf.map((item) => [item.name, item.value]));
        const changedItems = sUpdateProviderConf
            .filter((item) => {
                const originalValue = originMap.get(item.name);
                if (originalValue === undefined) return true;
                if (typeof originalValue === 'number') {
                    const parsedValue = typeof item.value === 'string' ? parseInt(item.value, 10) : item.value;
                    return originalValue !== parsedValue;
                }
                return originalValue !== item.value;
            })
            .map((item) => {
                const originalValue = originMap.get(item.name);
                if (typeof originalValue === 'number' && typeof item.value === 'string') {
                    return { name: item.name, value: parseInt(item.value, 10) };
                }
                return item;
            });
        if (changedItems.length > 0) updateProviderConf(changedItems);
        else setIsProviderModal(false);
    };
    const handleSelectProvider = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, aProvider: string) => {
        e.stopPropagation();
        setSelectedProvider(aProvider);
        setShowProviderDropdown(false);
    };
    const handleProviderDropbox = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        if (!sShowProviderDropdown) getProviderList();
        setShowProviderDropdown(!sShowProviderDropdown);
    };
    const handleClearData = () => {
        setIsSave(false);
        setIsProviderLoad(false);
        setIsConfLoad(false);
        setSelectedProvider('');
        setProviderList([]);
        setOriginProviderConf([]);
        setUpdateProviderConf([]);
    };

    useEffect(() => {
        if (sSelectedProvider) {
            setIsConfLoad(true);
            getProviderConf();
        }
    }, [sSelectedProvider]);
    useEffect(() => {
        if (sIsProviderModal) {
            setIsProviderLoad(true);
            getProviderList();
        } else handleClearData();
    }, [sIsProviderModal]);
    useEffect(() => {
        if (sError.message.length > 0) {
            const timer = setTimeout(() => {
                setError(PROVIDER_ERR_DEFAULT);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [sError]);

    useEffect(() => {
        if (msgBatch.length === 0) return;
        if (!sIsProviderModal) return;

        msgBatch.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (msg.session?.id === PROVIDER_UNIQUE_ID && msg.session?.idx === PROVIDER_SESSION_ID && PROVIDER_ALLOWED_METHOD_LIST.includes(msg.session.method)) {
                    if (msg.type === E_WS_TYPE.RPC_RSP) {
                        const { rpcState, rpcData } = RpcResponseParser(msg);
                        switch (msg.session.method) {
                            case E_RPC_METHOD.LLM_GET_PROVIDERS:
                                if (rpcState) setProviderList(rpcData);
                                else {
                                    setProviderList([]);
                                    setError(rpcData);
                                }
                                setIsProviderLoad(false);
                                break;
                            case E_RPC_METHOD.LLM_GET_PROVIDER_CONF:
                                if (rpcState) {
                                    const sProviderConfList = Object.keys(rpcData)?.map((aKey: string) => {
                                        return { name: aKey, value: msg[E_WS_KEY.RPC]?.result?.[aKey] };
                                    });
                                    setOriginProviderConf(sProviderConfList);
                                    setUpdateProviderConf(sProviderConfList);
                                } else {
                                    setOriginProviderConf([]);
                                    setUpdateProviderConf([]);
                                    setError(rpcData);
                                }
                                setIsConfLoad(false);
                                break;
                            case E_RPC_METHOD.LLM_SET_PROVIDER_CONF:
                                setIsSave(false);
                                if (rpcState) setIsProviderModal(false);
                                else setError(rpcData);
                                break;
                        }
                    }
                }
            }
        });
    }, [msgBatch]);

    useEsc(() => sIsProviderModal && setIsProviderModal(false));

    return (
        <>
            <div onClick={() => setIsProviderModal(true)}>{pTrigger}</div>
            {sIsProviderModal && (
                <div className="provider-modal">
                    <Modal pIsDarkMode className="provider-modal-wh" onOutSideClose={() => setIsProviderModal(false)}>
                        <Modal.Header>
                            <div className="provider-modal-header">
                                <div className="provider-modal-title">
                                    <span>Set provider</span>
                                </div>
                                <Close style={{ cursor: 'pointer' }} onClick={() => setIsProviderModal(false)} />
                            </div>
                        </Modal.Header>
                        <Modal.Body>
                            {sIsProviderLoad ? (
                                <div className="model-modal-body">
                                    <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%', padding: '8px' }}>
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '100px', maxWidth: '100px' }} />
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                                    </SkeletonContainer>
                                </div>
                            ) : (
                                <div className="provider-modal-body provider-modal-form-container">
                                    <div className="provider-modal-form-fields">
                                        <div className="provider-modal-form-field">
                                            <div className="provider-modal-field-label">Provider</div>
                                            <div ref={dropdownRef} className="provider-modal-provider-dropdown">
                                                <div
                                                    onClick={handleProviderDropbox}
                                                    className={`provider-modal-provider-select ${sSelectedProvider ? 'has-value' : 'placeholder'}`}
                                                >
                                                    <span>{sSelectedProvider || 'Select provider'}</span>
                                                    <ArrowDown size={16} className={`arrow ${sShowProviderDropdown ? 'open' : ''}`} />
                                                </div>
                                                {sShowProviderDropdown && (
                                                    <div className="provider-modal-provider-dropdown-list">
                                                        {sProviderList?.map((item, aIdx: number) => {
                                                            const isSelected = sSelectedProvider === item;
                                                            return (
                                                                <div
                                                                    key={'provider-' + aIdx?.toString()}
                                                                    onClick={(e) => handleSelectProvider(e, item)}
                                                                    className={`provider-modal-provider-dropdown-item ${isSelected ? 'selected' : ''}`}
                                                                >
                                                                    <span>{item}</span>
                                                                    {isSelected && <span>✓</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {sIsConfLoad ? (
                                            <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                                                <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '90px', maxWidth: '90px' }} />
                                                <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                                            </SkeletonContainer>
                                        ) : sOriginProviderConf && sOriginProviderConf?.length > 0 ? (
                                            sUpdateProviderConf?.map((providerConf, aIdx: number) => {
                                                return (
                                                    <div className="provider-modal-form-field" key={providerConf.name}>
                                                        <div className="provider-modal-field-label">{providerConf.name}</div>
                                                        <input
                                                            className="provider-modal-form-input"
                                                            value={providerConf.value}
                                                            style={{ flex: 3 }}
                                                            onChange={(e) => handleConfValue(e, aIdx)}
                                                        />
                                                    </div>
                                                );
                                            })
                                        ) : null}
                                    </div>
                                    <ErrorBanner code={sError.code} message={sError.message} />
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <div className="provider-modal-footer">
                                <button disabled={sIsSave} className={`provider-modal-footer-item ${!sSelectedProvider ? 'disabled' : ''}`} onClick={handleConfSave}>
                                    {sIsSave ? <Loader width="16px" height="16px" borderRadius="90%" /> : 'Save'}
                                </button>
                            </div>
                        </Modal.Footer>
                    </Modal>
                </div>
            )}
        </>
    );
};
