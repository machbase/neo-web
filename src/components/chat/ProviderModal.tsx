import { useEffect, useState } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_RPC_METHOD, E_WS_TYPE } from '@/recoil/websocket';
import { WsRPC } from '@/utils/websocket';
import { SkeletonContainer, SkeletonItem } from './components/Skeleton';
import { RPC_ERROR_TYPE, RpcResponseParser } from '@/utils/Chat/RpcResponseParser';
import { Modal, Dropdown, Input, Alert } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/components';

const PROVIDER_ALLOWED_METHOD_LIST = [E_RPC_METHOD.LLM_GET_PROVIDERS, E_RPC_METHOD.LLM_GET_PROVIDER_CONF, E_RPC_METHOD.LLM_SET_PROVIDER_CONF];
const PROVIDER_UNIQUE_ID = 'provider-modal';
const PROVIDER_SESSION_ID = 3000;
const PROVIDER_ERR_DEFAULT = { code: -1, message: '' };

interface ProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProviderModal = ({ isOpen, onClose }: ProviderModalProps) => {
    const { msgBatch, sendMSG } = useWebSocket();
    const [sProviderList, setProviderList] = useState<any[]>([]);
    const [sIsProviderLoad, setIsProviderLoad] = useState<boolean>(false);
    const [sSelectedProvider, setSelectedProvider] = useState<string>('');
    const [sIsConfLoad, setIsConfLoad] = useState<boolean>(false);
    const [sOriginProviderConf, setOriginProviderConf] = useState<{ name: string; value: string | number }[]>([]);
    const [sUpdateProviderConf, setUpdateProviderConf] = useState<{ name: string; value: string | number }[]>([]);
    const [sIsSave, setIsSave] = useState<boolean>(false);
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
        else onClose();
    };
    const handleProviderChange = (value: string) => {
        setSelectedProvider(value);
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
        setIsProviderLoad(true);
        getProviderList();
        return () => handleClearData();
    }, []);
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

        msgBatch?.forEach((msg) => {
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
                                    const sProviderConfList = Object.keys(rpcData?.config)?.map((aKey: string) => {
                                        return { name: aKey, value: rpcData?.config?.[aKey] };
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
                                if (rpcState) onClose();
                                else setError(rpcData);
                                break;
                        }
                    }
                }
            }
        });
    }, [msgBatch]);

    // Convert provider list to dropdown options
    const providerOptions: DropdownOption[] = sProviderList.map((provider) => ({
        value: provider,
        label: provider,
    }));

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>Set provider</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                {sIsProviderLoad ? (
                    <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                        <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '100px', maxWidth: '100px' }} />
                        <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                    </SkeletonContainer>
                ) : (
                    <>
                        {/* Provider Dropdown */}
                        <Dropdown.Root
                            label="Provider"
                            labelPosition="left"
                            fullWidth
                            options={providerOptions}
                            value={sSelectedProvider}
                            onChange={handleProviderChange}
                            placeholder="Select provider"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        {/* Configuration Fields */}
                        {sIsConfLoad ? (
                            <SkeletonContainer pStyle={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                                <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', minWidth: '90px', maxWidth: '90px' }} />
                                <SkeletonItem pLength={1} pStyle={{ minHeight: '33px', maxHeight: '33px', flex: 1 }} />
                            </SkeletonContainer>
                        ) : sOriginProviderConf && sOriginProviderConf?.length > 0 ? (
                            sUpdateProviderConf?.map((providerConf, aIdx: number) => {
                                if (!sSelectedProvider) return null;
                                return (
                                    <Input
                                        key={providerConf.name}
                                        label={providerConf.name}
                                        labelPosition="left"
                                        value={providerConf.value}
                                        onChange={(e) => handleConfValue(e, aIdx)}
                                        fullWidth
                                    />
                                );
                            })
                        ) : null}
                        {/* Error Banner */}
                        <Alert variant="error" title={sError.code !== -1 ? `Error Code: ${sError.code}` : undefined} message={sError.message} />
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleConfSave} disabled={!sSelectedProvider || !sOriginProviderConf} loading={sIsSave}>
                    Save
                </Modal.Confirm>
                <Modal.Cancel onClick={onClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
