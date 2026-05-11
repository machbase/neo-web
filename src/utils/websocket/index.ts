import { E_RPC_METHOD, E_WS_KEY, E_WS_TYPE, JSON_RPC_VERSION } from '@/recoil/websocket';

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
const MD = {
    GenRenderObj: getMdRender,
};
export const WsRPC = {
    MD: MD,
};
