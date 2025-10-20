import './ChatModal.scss';
import useEsc from '@/hooks/useEsc';
import Modal from '../modal/Modal';
import { useEffect, useState } from 'react';
import { Close, Gear, PlusCircle } from '@/assets/icons/Icon';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_RPC_METHOD, E_WS_KEY, E_WS_TYPE, RPC_LLM_LIST } from '@/recoil/websocket';
import { Model, WsRPC } from '@/utils/websocket';
import { CheckObjectKey } from '@/utils/dashboardUtil';
import { AiFillMinusCircle } from 'react-icons/ai';
import { ConfirmModal } from '../modal/ConfirmModal';

export interface ChatModalProps {
    pWrkId: string;
    pIdx: number;
    pIsOpen: boolean;
    pSetIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChatModal = (props: ChatModalProps) => {
    const { pWrkId, pIdx, pIsOpen, pSetIsOpen } = props;
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const { msgBatch, sendMSG } = useWebSocket();
    const [sProviderList, setProviderList] = useState<any[]>([]);
    const [sModelList, setModelList] = useState<{ [key: string]: Model[] }>({});
    const [sRmModel, setRmModel] = useState<Model>({ provider: '', model: '', name: '' });

    useEffect(() => {
        getProviderList();
        getModelList();
    }, []);

    useEffect(() => {
        if (msgBatch.length === 0) return;

        msgBatch.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (msg.session?.id === pWrkId && msg.session?.idx === pIdx && RPC_LLM_LIST.includes(msg.session.method)) {
                    if (msg.type === E_WS_TYPE.RPC_RSP) {
                        switch (msg.session.method) {
                            case E_RPC_METHOD.LLM_GET_PROVIDERS:
                                setProviderList(msg[E_WS_KEY.RPC]?.result);
                                break;
                            case E_RPC_METHOD.LLM_GET_MODELS:
                                setModelList(msg[E_WS_KEY.RPC]?.result);
                                break;
                            case E_RPC_METHOD.LLM_ADD_MODELS:
                            case E_RPC_METHOD.LLM_RM_MODELS:
                                getModelList();
                                break;
                        }
                    }
                }
            }
        });
    }, [msgBatch, pWrkId, pIdx]);

    /** PROVIDER */
    const getProviderList = () => {
        const sGenObj = WsRPC.LLM.GenProvidersObj(pWrkId, pIdx);
        sendMSG(sGenObj);
    };
    /** MODEL */
    const getModelList = () => {
        const sGenObj = WsRPC.LLM.GenModelsObj(pWrkId, pIdx);
        sendMSG(sGenObj);
    };
    const delModel = () => {
        const sGenObj = WsRPC.LLM.GenModelRmObj(pWrkId, pIdx, sRmModel);
        setRmModel({ provider: '', model: '', name: '' });
        setIsDeleteModal(false);
        sendMSG(sGenObj);
    };
    const handleAddModel = (aUpdateModel: Model) => {
        const sGenObj = WsRPC.LLM.GenModelAddObj(pWrkId, pIdx, aUpdateModel);
        sendMSG(sGenObj);
    };

    const handleRmModel = (aModel: Model) => {
        setRmModel(aModel);
        setIsDeleteModal(true);
        getModelList();
    };

    useEsc(() => pIsOpen && pSetIsOpen(false));

    return (
        <div className="chat-modal">
            <Modal pIsDarkMode className="chat-modal-wh" onOutSideClose={() => pSetIsOpen(false)}>
                <Modal.Header>
                    <div className="chat-modal-header">
                        <div className="title">
                            <span>Chat config</span>
                        </div>
                        <Close style={{ cursor: 'pointer' }} onClick={() => pSetIsOpen(false)} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="chat-modal-body" style={{ gap: '40px' }}>
                        {sProviderList?.map((provider: string) => {
                            if (CheckObjectKey(sModelList, provider)) {
                                return <ProviderContent key={provider} pProvider={provider} pModelList={sModelList} pRmModel={handleRmModel} pAddModel={handleAddModel} />;
                            } else return null;
                        })}
                    </div>
                </Modal.Body>
            </Modal>
            {sIsDeleteModal && (
                <ConfirmModal pIsDarkMode setIsOpen={setIsDeleteModal} pCallback={delModel} pContents={<div className="body-content">{`Do you want to delete this model?`}</div>} />
            )}
        </div>
    );
};

const ProviderContent = ({
    pProvider,
    pModelList,
    pRmModel,
    pAddModel,
}: {
    pProvider: string;
    pModelList: { [key: string]: Model[] };
    pRmModel: (aModel: Model) => void;
    pAddModel: (aModel: Model) => void;
}) => {
    const { msgBatch, sendMSG } = useWebSocket();
    const [sIsConfig, setIsConfig] = useState<boolean>(false);
    const [sIsModel, setIsModel] = useState<boolean>(false);

    const [sOriginProviderConf, setOriginProviderConf] = useState<{ name: string; value: string | number }[]>([]);
    const [sUpdateProviderConf, setUpdateProviderConf] = useState<{ name: string; value: string | number }[]>([]);
    const [sUpdateModel, setUpdateModel] = useState<{ name: string; provider: string; model: string }>({ name: '', provider: pProvider, model: '' });

    /** PROVIDER */
    const getProviderConf = () => {
        const sGenObj = WsRPC.LLM.GenProviderConfObj('provider-conf', 1, pProvider);
        sendMSG(sGenObj);
    };
    const updateProviderConf = (conf: any[]) => {
        const sParsedConf = Object.fromEntries(conf.map((item) => [item.name, item.value]));
        const sGenObj = WsRPC.LLM.GenProviderConfSetObj('provider-conf', 1, pProvider, sParsedConf);
        sendMSG(sGenObj);
        setOriginProviderConf([]);
        setUpdateProviderConf([]);
        setIsConfig(false);
    };
    /** MODEL */
    const addModel = () => {
        pAddModel(sUpdateModel);
        setUpdateModel({ name: '', provider: pProvider, model: '' });
        setIsModel(false);
    };
    const delModel = (aModel: Model) => {
        pRmModel(aModel);
    };

    const handleModelForm = () => {
        setIsModel(!sIsModel);
    };
    const handleModelValue = (e: React.FormEvent<HTMLInputElement>, key: string) => {
        setUpdateModel((prev) => {
            return { ...prev, [key]: (e.target as HTMLInputElement).value };
        });
    };
    const handleModelSave = () => {
        addModel();
    };

    const handleConfForm = () => {
        !sIsConfig && getProviderConf();
        setIsConfig(!sIsConfig);
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
        else setIsConfig(false);
    };

    useEffect(() => {
        if (msgBatch.length === 0) return;

        msgBatch.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (
                    msg.session?.id === 'provider-conf' &&
                    msg.session?.idx === 1 &&
                    msg.session?.provider === pProvider &&
                    (msg.session.method === E_RPC_METHOD.LLM_GET_PROVIDER_CONF || msg.session.method === E_RPC_METHOD.LLM_SET_PROVIDER_CONF)
                ) {
                    if (msg.type === E_WS_TYPE.RPC_RSP) {
                        switch (msg.session.method) {
                            case E_RPC_METHOD.LLM_GET_PROVIDER_CONF:
                                if (!CheckObjectKey(msg[E_WS_KEY.RPC], 'result')) return;
                                const sProviderConfList = Object.keys(msg[E_WS_KEY.RPC]?.result)?.map((aKey: string) => {
                                    return { name: aKey, value: msg[E_WS_KEY.RPC]?.result?.[aKey] };
                                });
                                setOriginProviderConf(sProviderConfList);
                                setUpdateProviderConf(sProviderConfList);
                                break;
                        }
                    }
                }
            }
        });
    }, [msgBatch]);

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#999', textTransform: 'capitalize' }}>{pProvider}</div>
                {sIsModel ? null : <Gear size={14} color="#999" onClick={handleConfForm} />}
            </div>
            {sIsConfig ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
                    {sUpdateProviderConf?.map((providerConf, aIdx: number) => {
                        return (
                            <div key={providerConf.name} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <div style={{ flex: 1, fontSize: '12px' }}>{providerConf.name}</div>
                                <input value={providerConf.value} style={{ flex: 3 }} onChange={(e) => handleConfValue(e, aIdx)} />
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'end' }}>
                        <div
                            onClick={handleConfSave}
                            style={{ fontSize: '12px', backgroundColor: 'rgb(0, 108, 210)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            save
                        </div>
                        <div
                            onClick={() => setIsConfig(false)}
                            style={{ fontSize: '12px', backgroundColor: 'rgb(255, 83, 83)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            cancel
                        </div>
                    </div>
                </div>
            ) : sIsModel ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <div style={{ flex: 1, fontSize: '12px' }}>Name</div>
                        <input value={sUpdateModel.name} style={{ flex: 3 }} onChange={(e) => handleModelValue(e, 'name')} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <div style={{ flex: 1, fontSize: '12px' }}>Model</div>
                        <input value={sUpdateModel.model} style={{ flex: 3 }} onChange={(e) => handleModelValue(e, 'model')} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'end' }}>
                        <div
                            onClick={handleModelSave}
                            style={{ fontSize: '12px', backgroundColor: 'rgb(0, 108, 210)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            save
                        </div>
                        <div
                            onClick={() => setIsModel(false)}
                            style={{ fontSize: '12px', backgroundColor: 'rgb(255, 83, 83)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            cancel
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '12px', maxHeight: '75px', overflow: 'auto' }}>
                        {pModelList[pProvider].map((model) => {
                            return (
                                <div key={model.model} style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ color: '#ccc' }}>{model.name}</div>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>{model.model}</div>
                                    <AiFillMinusCircle color={'rgb(255, 83, 83)'} size={12} onClick={() => delModel(model)} />
                                </div>
                            );
                        })}
                    </div>
                    <div>
                        <PlusCircle color={'rgb(0, 108, 210)'} size={12} onClick={handleModelForm} />
                    </div>
                </>
            )}
        </div>
    );
};
