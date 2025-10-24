import { E_WS_KEY } from '@/recoil/websocket';

enum E_RPC_RSP_CODE {
    SUCCESS = 'result',
    ERROR = 'error',
}

export type RPC_ERROR_TYPE = {
    code: number;
    message: string;
};

const CheckObjectKey = (data: object, key: string): boolean => {
    if (!data) return false;
    return Object.prototype.hasOwnProperty?.call(data, key);
};

export const RpcResponseParser = (obj: any): { rpcState: boolean; rpcData: any | RPC_ERROR_TYPE } => {
    let rpcState = false,
        rpcData = obj;

    if (CheckObjectKey(rpcData, E_WS_KEY.RPC)) {
        if (CheckObjectKey(rpcData?.[E_WS_KEY.RPC], E_RPC_RSP_CODE.SUCCESS)) {
            rpcState = true;
            rpcData = rpcData?.[E_WS_KEY.RPC]?.[E_RPC_RSP_CODE.SUCCESS];
        }
        if (CheckObjectKey(rpcData?.[E_WS_KEY.RPC], E_RPC_RSP_CODE.ERROR)) {
            rpcData = rpcData?.[E_WS_KEY.RPC]?.[E_RPC_RSP_CODE.ERROR];
        }
    }

    return { rpcState, rpcData };
};
export const MsgResponseParser = () => {};
