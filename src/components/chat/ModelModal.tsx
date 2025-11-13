import { useEffect, useState } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_RPC_METHOD, E_WS_TYPE } from '@/recoil/websocket';
import { WsRPC } from '@/utils/websocket';
import { SkeletonContainer, SkeletonItem } from './components/Skeleton';
import { RPC_ERROR_TYPE, RpcResponseParser } from '@/utils/Chat/RpcResponseParser';
import { ErrorBanner } from './components/ErrorBanner';
import { Modal, Dropdown, Input } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/components';

const MODEL_MODAL_ALLOWED_RPC_METHOD = [E_RPC_METHOD.LLM_GET_PROVIDERS, E_RPC_METHOD.LLM_ADD_MODELS];
const MODEL_MODAL_UNIQUE_ID = 'model-modal';
const MODEL_MODAL_INDEX_ID = 2000;
const MODEL_ERR_DEFAULT = { code: -1, message: '' };

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ModelModal = ({ isOpen, onClose }: ModelModalProps) => {
    const { msgBatch, sendMSG } = useWebSocket();
    const [sProviderList, setProviderList] = useState<any[]>([]);
    const [sIsLoading, setIsLoading] = useState<boolean>(true);
    const [sUpdateModel, setUpdateModel] = useState<{ name: string; provider: string; model: string }>({ name: '', provider: '', model: '' });
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

    const handleModelValue = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        setUpdateModel((prev) => {
            return { ...prev, [key]: e.target.value };
        });
    };

    const handleModelSave = () => {
        setIsSave(true);
        handleAddModel();
    };

    const handleProviderChange = (value: string) => {
        setUpdateModel((prev) => ({ ...prev, provider: value }));
    };

    const handleClearData = () => {
        setIsSave(false);
        setProviderList([]);
        setUpdateModel({ name: '', provider: '', model: '' });
    };

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getProviderList();
        }
        return () => handleClearData();
    }, [isOpen]);

    useEffect(() => {
        if (msgBatch.length === 0) return;

        msgBatch?.forEach((msg) => {
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
                                setIsSave(false);
                                if (rpcState) onClose();
                                else setError(rpcData);
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

    // Convert provider list to dropdown options
    const providerOptions: DropdownOption[] = sProviderList.map((provider) => ({
        value: provider,
        label: provider,
    }));

    const isFormValid = sUpdateModel.provider && sUpdateModel.name && sUpdateModel.model;

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>Add model</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                {sIsLoading ? (
                    <>
                        <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                            <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '100px', maxWidth: '100px' }} />
                            <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                        </SkeletonContainer>
                        <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                            <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '100px', maxWidth: '100px' }} />
                            <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                        </SkeletonContainer>
                        <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                            <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '100px', maxWidth: '100px' }} />
                            <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                        </SkeletonContainer>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Provider Dropdown */}
                        <Dropdown.Root
                            label="Provider"
                            labelPosition="left"
                            fullWidth
                            options={providerOptions}
                            value={sUpdateModel.provider}
                            onChange={handleProviderChange}
                            placeholder="Select provider"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        {/* Name Input */}
                        <Input label="Name" labelPosition="left" value={sUpdateModel.name} onChange={(e) => handleModelValue(e, 'name')} placeholder="Enter model name" fullWidth />
                        {/* Model Input */}
                        <Input
                            label="Model"
                            labelPosition="left"
                            value={sUpdateModel.model}
                            onChange={(e) => handleModelValue(e, 'model')}
                            placeholder="e.g., claude-haiku-4-5-20251001"
                            fullWidth
                        />
                        {/* Error Banner */}
                        <ErrorBanner code={sError.code} message={sError.message} />
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleModelSave} disabled={!isFormValid} loading={sIsSave}>
                    Save
                </Modal.Confirm>
                <Modal.Cancel onClick={onClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
