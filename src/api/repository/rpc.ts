import request from '@/api/core';

export interface JsonRpcError {
    code: number;
    message: string;
}

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params: any[];
}

export interface JsonRpcResponse<T> {
    jsonrpc: '2.0';
    id: number;
    result?: T;
    error?: JsonRpcError;
}

interface JsonRpcOptions {
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

type JsonRpcWebSocketCaller = (rpcRequest: JsonRpcRequest, signal?: AbortSignal) => Promise<JsonRpcResponse<unknown>>;

let sRpcId = 0;
let sWebSocketCaller: JsonRpcWebSocketCaller | null = null;

const nextRpcId = () => {
    sRpcId += 1;
    return sRpcId;
};

export const setJsonRpcWebSocketCaller = (caller: JsonRpcWebSocketCaller | null) => {
    sWebSocketCaller = caller;
    return () => {
        if (sWebSocketCaller === caller) {
            sWebSocketCaller = null;
        }
    };
};

const callJsonRpcRest = async <T>(rpcRequest: JsonRpcRequest, options?: JsonRpcOptions) => {
    const response = await request({
        method: 'POST',
        url: '/api/rpc',
        data: rpcRequest,
        headers: options?.headers,
        signal: options?.signal,
    });
    return response as unknown as JsonRpcResponse<T>;
};

export const callJsonRpc = async <T>(method: string, params: any[], options?: JsonRpcOptions) => {
    const rpcRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: nextRpcId(),
        method,
        params,
    };

    if (sWebSocketCaller) {
        try {
            return (await sWebSocketCaller(rpcRequest, options?.signal)) as JsonRpcResponse<T>;
        } catch (error) {
            if (options?.signal?.aborted) {
                throw error;
            }
        }
    }

    return callJsonRpcRest<T>(rpcRequest, options);
};
