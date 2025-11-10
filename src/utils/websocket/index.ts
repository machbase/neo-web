import { E_MSG_TYPE, E_RPC_METHOD, E_WS_KEY, E_WS_TYPE, JSON_RPC_VERSION, MSG_VERSION } from '@/recoil/websocket';

/** PROVIDER */
const getProviders = (aUId: string, aIdx: number) => {
    const sMethod = E_RPC_METHOD.LLM_GET_PROVIDERS;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: 0,
            method: sMethod,
        },
    };
};
const getProviderConfig = (aUId: string, aIdx: number, aProvider: string) => {
    const sMethod = E_RPC_METHOD.LLM_GET_PROVIDER_CONF;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
            provider: aProvider,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: 0,
            method: sMethod,
            params: [aProvider],
        },
    };
};
const setProviderConfig = <T>(aUId: string, aIdx: number, aProvider: string, aBody: T) => {
    const sMethod = E_RPC_METHOD.LLM_SET_PROVIDER_CONF;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
            provider: aProvider,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: 0,
            method: sMethod,
            params: [aProvider, aBody],
        },
    };
};

/** MODEL */
export interface ModelListType {
    label: string;
    items: Model[];
    exist: boolean;
}
export interface Model {
    name: string;
    provider: string;
    model: string;
}
const getListModels = (aUId: string, aIdx: number) => {
    const sMethod = E_RPC_METHOD.LLM_GET_LIST_MODELS;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: 0,
            method: sMethod,
        },
    };
};
const addModels = (aUId: string, aIdx: number, aModel: Model) => {
    const sMethod = E_RPC_METHOD.LLM_ADD_MODELS;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
            model: aModel,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: 0,
            method: sMethod,
            params: [aModel],
        },
    };
};
const rmModels = (aUId: string, aIdx: number, aModel: Model) => {
    const sMethod = E_RPC_METHOD.LLM_RM_MODELS;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
            model: aModel,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: 0,
            method: sMethod,
            params: [aModel],
        },
    };
};
const getMdRender = (aUId: string, aIdx: number, aContent: string, aDark: boolean, aId: number) => {
    const sMethod = E_RPC_METHOD.MD_RENDER;
    return {
        type: E_WS_TYPE.RPC_REQ,
        session: JSON.stringify({
            method: sMethod,
            id: aUId,
            idx: aIdx,
        }),
        [E_WS_KEY.RPC]: {
            jsonrpc: JSON_RPC_VERSION,
            id: aId,
            method: sMethod,
            params: [aContent, aDark],
        },
    };
};

const LLM = {
    /** PROVIDER */
    GenProvidersObj: getProviders,
    GenProviderConfObj: getProviderConfig,
    GenProviderConfSetObj: setProviderConfig,
    /** MODEL */
    GenModelListObj: getListModels,
    GenModelAddObj: addModels,
    GenModelRmObj: rmModels,
};
const MD = {
    GenRenderObj: getMdRender,
};
export const WsRPC = {
    LLM: LLM,
    MD: MD,
};

/** MESSAGE */
const getQuestion = (aUid: string, aIdx: number, aInterruptId: number, body: { provider: string; model: string; text: string }) => {
    const sMethod = E_MSG_TYPE.QUESTION;
    return {
        type: E_WS_TYPE.MSG,
        session: JSON.stringify({ method: sMethod, id: aUid, idx: aIdx }),
        [E_WS_KEY.MSG]: {
            ver: MSG_VERSION,
            id: aInterruptId,
            type: sMethod,
            body: body,
        },
    };
};
const getInterrupt = (aUid: string, aIdx: number, aInterruptId: number) => {
    const sMethod = E_MSG_TYPE.INPUT;
    return {
        type: E_WS_TYPE.MSG,
        session: JSON.stringify({ method: sMethod, id: aUid, idx: aIdx }),
        [E_WS_KEY.MSG]: {
            ver: MSG_VERSION,
            id: aInterruptId,
            type: sMethod,
            body: { control: '^C' },
        },
    };
};

export const WsMSG = {
    GenMessageObj: getQuestion,
    GenInterruptObj: getInterrupt,
};
