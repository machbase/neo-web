/**
 * session.* JSON-RPC named wrappers (HTTP transport). #1334 phase 6 scaffolding.
 * Call sites must use the named wrappers only (no direct `rpcCall`). ⚠️ The only current consumer is RpcProbe.
 */
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export const rpcSessionList = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.session.list, []);

export const rpcSessionStat = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.session.stat, []);

export const rpcSessionLimitGet = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.session.limit.get, []);
