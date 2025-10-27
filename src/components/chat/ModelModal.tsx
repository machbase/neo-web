import './ModelModal.scss';
import useEsc from '@/hooks/useEsc';
import Modal from '../modal/Modal';
import { useEffect, useState, useRef } from 'react';
import { Close, ArrowDown } from '@/assets/icons/Icon';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_RPC_METHOD, E_WS_TYPE } from '@/recoil/websocket';
import { WsRPC } from '@/utils/websocket';
import { SkeletonContainer, SkeletonItem } from './components/Skeleton';
import useOutsideClick from '@/hooks/useOutsideClick';
import { RPC_ERROR_TYPE, RpcResponseParser } from '@/utils/Chat/RpcResponseParser';
import { ErrorBanner } from './components/ErrorBanner';
import { Loader } from '../loader';

const MODEL_MODAL_ALLOWED_RPC_METHOD = [E_RPC_METHOD.LLM_GET_PROVIDERS, E_RPC_METHOD.LLM_ADD_MODELS];
const MODEL_MODAL_UNIQUE_ID = 'model-modal';
const MODEL_MODAL_INDEX_ID = 2000;
const MODEL_ERR_DEFAULT = { code: -1, message: '' };

export const ModelModal = ({ pTrigger, pCloseDropdown }: { pTrigger: React.ReactElement; pCloseDropdown: () => void }) => {
    const [sIsModelModal, setIsModelModal] = useState<boolean>(false);
    const { msgBatch, sendMSG } = useWebSocket();
    const [sProviderList, setProviderList] = useState<any[]>([]);
    const [sIsLoading, setIsLoading] = useState<boolean>(true);
    const [sUpdateModel, setUpdateModel] = useState<{ name: string; provider: string; model: string }>({ name: '', provider: '', model: '' });
    const [sShowProviderDropdown, setShowProviderDropdown] = useState<boolean>(false);
    const dropdownRef = useRef(null);
    const [sIsSave, setIsSave] = useState<boolean>(false);
    const [sError, setError] = useState<RPC_ERROR_TYPE>(MODEL_ERR_DEFAULT);

    const getProviderList = () => {
        const sGenObj = WsRPC.LLM.GenProvidersObj(MODEL_MODAL_UNIQUE_ID, MODEL_MODAL_INDEX_ID);
        sendMSG(sGenObj);
    };
    const handleAddModel = () => {
        const sGenObj = WsRPC.LLM.GenModelAddObj(MODEL_MODAL_UNIQUE_ID, MODEL_MODAL_INDEX_ID, sUpdateModel);
        sendMSG(sGenObj);
    };
    const handleModelValue = (e: React.FormEvent<HTMLInputElement>, key: string) => {
        setUpdateModel((prev) => {
            return { ...prev, [key]: (e.target as HTMLInputElement).value };
        });
    };

    const handleModelSave = () => {
        setIsSave(true);
        handleAddModel();
    };

    const handleSelectProvider = (provider: string) => {
        setUpdateModel((prev) => ({ ...prev, provider }));
        setShowProviderDropdown(false);
    };
    const handleProviderDropbox = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        if (!sShowProviderDropdown) getProviderList();
        setShowProviderDropdown(!sShowProviderDropdown);
    };

    const handleClearData = () => {
        setIsSave(false);
        setProviderList([]);
        setUpdateModel({ name: '', provider: '', model: '' });
        setShowProviderDropdown(false);
    };

    useEffect(() => {
        if (sIsModelModal) {
            setIsLoading(true);
            getProviderList();
        } else handleClearData();
    }, [sIsModelModal]);

    useEffect(() => {
        if (msgBatch.length === 0) return;
        if (!sIsModelModal) return;

        msgBatch.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (msg.session?.id === MODEL_MODAL_UNIQUE_ID && msg.session?.idx === MODEL_MODAL_INDEX_ID && MODEL_MODAL_ALLOWED_RPC_METHOD.includes(msg.session.method)) {
                    if (msg.type === E_WS_TYPE.RPC_RSP) {
                        const { rpcState, rpcData } = RpcResponseParser(msg);
                        switch (msg.session.method) {
                            case E_RPC_METHOD.LLM_GET_PROVIDERS:
                                if (rpcState) setProviderList(rpcData);
                                else setError(rpcData);
                                setIsLoading(false);
                                break;
                            case E_RPC_METHOD.LLM_ADD_MODELS:
                                setIsSave(true);
                                if (rpcState) {
                                    setIsModelModal(false);
                                    pCloseDropdown();
                                } else setError(rpcData);
                                break;
                        }
                    }
                }
            }
        });
    }, [msgBatch]);

    useEffect(() => {
        if (sError.message.length > 0) {
            const timer = setTimeout(() => {
                setError(MODEL_ERR_DEFAULT);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [sError]);

    useEsc(() => sIsModelModal && setIsModelModal(false));
    useOutsideClick(dropdownRef, () => setShowProviderDropdown(false));

    return (
        <>
            <div onClick={() => setIsModelModal(!sIsModelModal)}>{pTrigger}</div>
            {sIsModelModal && (
                <div className="model-modal">
                    <Modal pIsDarkMode className="model-modal-wh" onOutSideClose={() => setIsModelModal(false)}>
                        <Modal.Header>
                            <div className="model-modal-header">
                                <div className="model-modal-title">
                                    <span>Add model</span>
                                </div>
                                <Close style={{ cursor: 'pointer' }} onClick={() => setIsModelModal(false)} />
                            </div>
                        </Modal.Header>

                        <Modal.Body>
                            {sIsLoading ? (
                                <div className="model-modal-body">
                                    <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%', padding: '8px' }}>
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '30px', maxHeight: '30px', minWidth: '100px', maxWidth: '100px' }} />
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '30px', maxHeight: '30px', flex: 1 }} />
                                    </SkeletonContainer>
                                    <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%', padding: '8px' }}>
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '30px', maxHeight: '30px', minWidth: '100px', maxWidth: '100px' }} />
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '30px', maxHeight: '30px', flex: 1 }} />
                                    </SkeletonContainer>
                                    <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%', padding: '8px' }}>
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '30px', maxHeight: '30px', minWidth: '100px', maxWidth: '100px' }} />
                                        <SkeletonItem pLength={1} pStyle={{ minHeight: '30px', maxHeight: '30px', flex: 1 }} />
                                    </SkeletonContainer>
                                </div>
                            ) : (
                                <div className="model-modal-body model-modal-form-container">
                                    <div className="model-modal-form-fields">
                                        <div className="model-modal-form-field">
                                            <div className="model-modal-field-label">Provider</div>
                                            <div ref={dropdownRef} className="model-modal-provider-dropdown">
                                                <div
                                                    onClick={handleProviderDropbox}
                                                    className={`model-modal-provider-select ${sUpdateModel.provider ? 'has-value' : 'placeholder'}`}
                                                >
                                                    <span>{sUpdateModel.provider || 'Select provider'}</span>
                                                    <ArrowDown size={16} className={`arrow ${sShowProviderDropdown ? 'open' : ''}`} />
                                                </div>
                                                {sShowProviderDropdown && (
                                                    <div className="model-modal-provider-dropdown-list">
                                                        {sProviderList?.map((item, aIdx: number) => {
                                                            const isSelected = sUpdateModel.provider === item;
                                                            return (
                                                                <div
                                                                    key={'provider-' + aIdx?.toString()}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelectProvider(item);
                                                                    }}
                                                                    className={`model-modal-provider-dropdown-item ${isSelected ? 'selected' : ''}`}
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
                                        <div className="model-modal-form-field">
                                            <div className="model-modal-field-label">Name</div>
                                            <input
                                                value={sUpdateModel.name}
                                                className="model-modal-form-input"
                                                onChange={(e) => handleModelValue(e, 'name')}
                                                placeholder="Enter model name"
                                            />
                                        </div>
                                        <div className="model-modal-form-field">
                                            <div className="model-modal-field-label">Model</div>
                                            <input
                                                value={sUpdateModel.model}
                                                className="model-modal-form-input"
                                                onChange={(e) => handleModelValue(e, 'model')}
                                                placeholder="e.g., claude-haiku-4-5-20251001"
                                            />
                                        </div>
                                    </div>
                                    <ErrorBanner code={sError.code} message={sError.message} />
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <div className="model-modal-footer">
                                <button
                                    disabled={sIsSave}
                                    className={`model-modal-footer-item ${!sUpdateModel.provider || !sUpdateModel.name || !sUpdateModel.model ? 'disabled' : ''}`}
                                    onClick={handleModelSave}
                                >
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
