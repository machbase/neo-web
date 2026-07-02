/**
 * proxy.* JSON-RPC named wrappers (HTTP transport). #1334 phase 6 scaffolding.
 * Call sites must use the named wrappers only (no direct `rpcCall`). ⚠️ The only current consumer is RpcProbe.
 */
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export const rpcProxyList = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.proxy.list, []);

export const rpcProxyGet = (name: string): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.proxy.get, [name]);
