/**
 * server.* JSON-RPC named wrappers (HTTP transport). #1334 phase 6 scaffolding.
 *
 * Call sites must use the named wrappers only (no direct `rpcCall`) so the failing
 * method stays identifiable from the error/stack. ⚠️ The only current consumer is
 * RpcProbe (dev-only), so these may be intentionally unused — watch lint
 * (max-warnings 0) / knip (#1173).
 */
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export const rpcServerInfoGet = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.server.info.get, []);

export const rpcServerCertificateGet = (): Promise<JsonRpcResponse<unknown>> => rpcCall<unknown>(RpcMethod.server.certificate.get, []);
