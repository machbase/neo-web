/**
 * JSON-RPC 2.0 primitive for the neo-web transport layer.
 *
 * Two transports are supported, picked per call site (no auto-fallback):
 * - WebSocket (`callJsonRpc`): bidirectional / streaming methods such as `lsp.*`.
 *   The WS caller is registered by WebSocketContext via `setJsonRpcWebSocketCaller`.
 *   If it isn't registered or the socket is not connected, `callJsonRpc` rejects
 *   with `RpcTransportError` — there is intentionally NO REST fallback.
 * - HTTP (`callHttpRpc`): one-shot req/resp methods (POST `/web/api/rpc`).
 *   Reuses the shared axios instance (Bearer auth, X-Console-Id, 401 reLogin).
 *
 * React callers should route through `useRpc()` (see `@/context/RpcContext`),
 * which picks the transport by method prefix. The module-level primitive remains
 * for non-React call sites (e.g. monaco editor provider callbacks).
 */

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

export interface JsonRpcOptions {
    signal?: AbortSignal;
}

/**
 * Thrown when the JSON-RPC request cannot be transported over WebSocket:
 * - WebSocket caller not registered yet
 * - Socket not connected / readyState !== OPEN
 * - Socket closed while the request was pending (onclose)
 * - Request timed out before a response was received
 *
 * This deliberately does NOT cover AbortSignal cancellation — that surfaces
 * as a DOMException-like `AbortError` to align with fetch() semantics.
 */
export class RpcTransportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RpcTransportError';
    }
}

export type JsonRpcWebSocketCaller = (
    rpcRequest: JsonRpcRequest,
    signal?: AbortSignal
) => Promise<JsonRpcResponse<unknown>>;

let sRpcId = 0;
let sWebSocketCaller: JsonRpcWebSocketCaller | null = null;

const nextRpcId = () => {
    sRpcId += 1;
    return sRpcId;
};

/**
 * Register the WebSocket-backed JSON-RPC caller. Returns a cleanup function
 * that unregisters the caller if it has not already been replaced.
 *
 * Only `WebSocketContext` should call this. Tests may register a stub.
 */
export const setJsonRpcWebSocketCaller = (caller: JsonRpcWebSocketCaller | null) => {
    sWebSocketCaller = caller;
    return () => {
        if (sWebSocketCaller === caller) {
            sWebSocketCaller = null;
        }
    };
};

/**
 * Issue a JSON-RPC 2.0 request over WebSocket. WS-only — no REST fallback.
 *
 * Throws:
 * - `RpcTransportError` if the WebSocket caller is not registered.
 * - `RpcTransportError` if the socket is not connected or closes during the call.
 * - An `AbortError` if the caller-supplied `signal` is aborted.
 */
/**
 * Attach the failing RPC method to an error so the method stays identifiable even
 * when the async rejection stack is all-anonymous (every call funnels through the
 * generic primitives below). Sets `error.rpcMethod` and prefixes `[rpc:<method>]`.
 * Named wrappers SHOULD still be the public API (stack-frame traceability), but this
 * guarantees the method is recoverable from the error object alone.
 */
const tagRpcError = (error: unknown, method: string): never => {
    if (error instanceof Error) {
        (error as Error & { rpcMethod?: string }).rpcMethod = method;
        if (!error.message.startsWith('[rpc:')) {
            error.message = `[rpc:${method}] ${error.message}`;
        }
    }
    throw error;
};

export const callJsonRpc = async <T>(
    method: string,
    params: any[],
    options?: JsonRpcOptions
): Promise<JsonRpcResponse<T>> => {
    try {
        if (options?.signal?.aborted) {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        }

        if (!sWebSocketCaller) {
            throw new RpcTransportError('WebSocket JSON-RPC caller is not registered');
        }

        const rpcRequest: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: nextRpcId(),
            method,
            params,
        };

        return (await sWebSocketCaller(rpcRequest, options?.signal)) as JsonRpcResponse<T>;
    } catch (e) {
        return tagRpcError(e, method);
    }
};

/**
 * Issue a JSON-RPC 2.0 request over HTTP POST `/web/api/rpc`.
 *
 * For one-shot req/resp methods. Reuses the shared axios instance so Bearer auth,
 * X-Console-Id, 401 reLogin, and timeouts behave exactly like other REST calls.
 *
 * Most callers should use `rpcCall` (transport-agnostic) instead. Direct use is
 * fine when the caller has a strong reason to bypass routing (e.g. testing).
 */
export const callHttpRpc = async <T>(
    method: string,
    params: any[],
    signal?: AbortSignal
): Promise<JsonRpcResponse<T>> => {
    const rpcRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: nextRpcId(),
        method,
        params,
    };
    // NOTE: the shared axios core (src/api/core) response interceptor already
    // unwraps successful responses to `response.data`, so `request.post` resolves
    // to the JSON-RPC body itself — do NOT read `.data` again (that yields undefined).
    try {
        const response = await request.post('/api/rpc', rpcRequest, { signal });
        return response as unknown as JsonRpcResponse<T>;
    } catch (e) {
        return tagRpcError(e, method);
    }
};

/**
 * Methods that MUST go over WebSocket. Membership requires a concrete reason:
 * server push, streaming response, or session-bound state. Keep the list small
 * and explicit so transport choice stays auditable from a single location.
 */
const WS_METHOD_PREFIXES = ['lsp.'];
const WS_METHOD_EXACT = new Set<string>([
    // 'bridge.query',  // register here once a streaming-cursor RPC is added
]);

const isWsMethod = (method: string): boolean => {
    if (WS_METHOD_EXACT.has(method)) return true;
    return WS_METHOD_PREFIXES.some((prefix) => method.startsWith(prefix));
};

/**
 * Transport-agnostic JSON-RPC entry point. Routes to WS or HTTP based on the
 * method name (see `WS_METHOD_PREFIXES` / `WS_METHOD_EXACT` above).
 *
 * Callers — both React components and non-React (monaco provider) callbacks —
 * should prefer this over `callJsonRpc` / `callHttpRpc` so the transport choice
 * stays in one place. If the backend later moves a method to a different
 * transport, only the WS_METHOD_* lists above need to change.
 */
export const rpcCall = async <T>(
    method: string,
    params: any[],
    signal?: AbortSignal
): Promise<JsonRpcResponse<T>> => {
    if (isWsMethod(method)) {
        return await callJsonRpc<T>(method, params, { signal });
    }
    return await callHttpRpc<T>(method, params, signal);
};

/**
 * Method-name registry for JSON-RPC calls.
 *
 * Use these constants instead of bare strings so transport routing (see
 * `WS_METHOD_*` above) and call sites stay in sync. Categories follow the
 * backend dot-namespace; new categories are added per RPC migration wave.
 *
 * `lsp.*` (WS) was migrated in #1307. New categories such as server/session/proxy/service
 * are added as #1334 phase 6 scaffolding (reads first). Migration categories like
 * bridge/timer/key are added per wave (`.notion-plan/3681efd3`).
 */
export const RpcMethod = {
    lsp: {
        diagnostics: 'lsp.diagnostics',
        completion: 'lsp.completion',
        hover: 'lsp.hover',
        signature: 'lsp.signature',
        metadata: 'lsp.metadata',
    },
    markdown: {
        render: 'markdown.render',
    },
    sshkey: {
        list: 'sshkey.list',
        add: 'sshkey.add',
        delete: 'sshkey.delete',
    },
    bridge: {
        list: 'bridge.list',
        get: 'bridge.get',
        add: 'bridge.add',
        delete: 'bridge.delete',
        test: 'bridge.test',
        exec: 'bridge.exec',
        query: 'bridge.query',
        result: {
            fetch: 'bridge.result.fetch',
            close: 'bridge.result.close',
        },
    },
    sql: {
        split: 'sql.split',
    },
    shell: {
        list: 'shell.list',
        add: 'shell.add',
        delete: 'shell.delete',
    },
    schedule: {
        list: 'schedule.list',
        timer: { add: 'schedule.timer.add' },
        subscriber: { add: 'schedule.subscriber.add' },
        delete: 'schedule.delete',
        start: 'schedule.start',
        stop: 'schedule.stop',
    },
    key: {
        list: 'key.list',
        generate: 'key.generate',
        delete: 'key.delete',
    },
    server: {
        info: { get: 'server.info.get' },
        certificate: { get: 'server.certificate.get' },
        shutdown: 'server.shutdown',
    },
    service: {
        port: { list: 'service.port.list' },
    },
    session: {
        list: 'session.list',
        kill: 'session.kill',
        stat: 'session.stat',
        limit: { get: 'session.limit.get', set: 'session.limit.set' },
    },
    proxy: {
        register: 'proxy.register',
        unregister: 'proxy.unregister',
        list: 'proxy.list',
        get: 'proxy.get',
    },
    vizspec: {
        render: 'vizspec.render',
        export: 'vizspec.export',
    },
    httpDebug: {
        set: 'http.debug.set',
    },
} as const;

/**
 * Test-only helper to reset the module-local state between cases.
 * Production code MUST NOT use this.
 */
export const __resetJsonRpcStateForTests = () => {
    sRpcId = 0;
    sWebSocketCaller = null;
};
