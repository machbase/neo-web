/**
 * service.* JSON-RPC named wrappers (HTTP transport). #1334 phase 6 scaffolding.
 * Call sites must use the named wrappers only (no direct `rpcCall`). ⚠️ The only current consumer is RpcProbe.
 */
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export const rpcServicePortList = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.service.port.list, []);
