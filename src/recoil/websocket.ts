import { atom } from 'recoil';

export const JSON_RPC_VERSION = '2.0';
export const MSG_VERSION = '1.0';

export enum E_WS_TYPE {
    PING = 'ping',
    LOG = 'log',
    RPC_REQ = 'rpc_req',
    RPC_RSP = 'rpc_rsp',
    MSG = 'msg',
}
export enum E_WS_KEY {
    PING = E_WS_TYPE.PING,
    LOG = E_WS_TYPE.LOG,
    RPC = 'rpc',
    RPC_REQ = 'rpc',
    RPC_RSP = 'rpc',
    MSG = E_WS_TYPE.MSG,
}
export enum E_MSG_TYPE {
    INPUT = 'input',
    QUESTION = 'question',
    ANSWER_START = 'answer-start',
    ANSWER_STOP = 'answer-stop',
    STREAM_MSG_START = 'stream-message-start',
    STREAM_MSG_DELTA = 'stream-message-delta',
    STREAM_MSG_STOP = 'stream-message-stop',
    STREAM_BLOCK_START = 'stream-block-start',
    STREAM_BLOCK_DELTA = 'stream-block-delta',
    STREAM_BLOCK_STOP = 'stream-block-stop',
}
export enum E_RPC_METHOD {
    LLM_GET_PROVIDERS = 'llmGetProviders',
    LLM_GET_PROVIDER_CONF = 'llmGetProviderConfig',
    LLM_SET_PROVIDER_CONF = 'llmSetProviderConfig',
    LLM_GET_MODELS = 'llmGetModels',
    LLM_ADD_MODELS = 'llmAddModels',
    LLM_RM_MODELS = 'llmRemoveModels',

    MD_RENDER = 'markdownRender',
}
export const RPC_LLM_LIST = [
    E_RPC_METHOD.LLM_GET_PROVIDERS,
    E_RPC_METHOD.LLM_GET_PROVIDER_CONF,
    E_RPC_METHOD.LLM_SET_PROVIDER_CONF,
    E_RPC_METHOD.LLM_GET_MODELS,
    E_RPC_METHOD.LLM_ADD_MODELS,
    E_RPC_METHOD.LLM_RM_MODELS,
];

interface WS_COMM_TYPE {
    type: E_WS_TYPE;
    session?: string;
}
interface WS_LOG_RES_TYPE extends WS_COMM_TYPE {
    [E_WS_KEY.LOG]: {
        timestamp: string;
        level: string;
        task: string;
        message: string;
        repeat: number;
    };
}

export const WS_LOG_LIMIT = 200;

export const gWsPing = atom({
    key: 'gWsPing',
    default: undefined,
});
export const gWsLog = atom({
    key: 'gWsLog',
    default: [] as WS_LOG_RES_TYPE[],
});
