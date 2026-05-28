import {
    callJsonRpc,
    setJsonRpcWebSocketCaller,
    RpcTransportError,
    JsonRpcRequest,
    JsonRpcResponse,
    __resetJsonRpcStateForTests,
} from './rpc';

describe('rpc.ts — WS-only JSON-RPC primitive', () => {
    beforeEach(() => {
        __resetJsonRpcStateForTests();
    });

    it('throws RpcTransportError when no WebSocket caller is registered', async () => {
        await expect(callJsonRpc('foo', [])).rejects.toBeInstanceOf(RpcTransportError);
    });

    it('passes a well-formed JsonRpcRequest to the registered caller and increments id', async () => {
        const calls: JsonRpcRequest[] = [];
        const caller = jest.fn(async (req: JsonRpcRequest): Promise<JsonRpcResponse<unknown>> => {
            calls.push(req);
            return { jsonrpc: '2.0', id: req.id, result: { ok: true } };
        });
        setJsonRpcWebSocketCaller(caller);

        const a = await callJsonRpc<{ ok: boolean }>('methodA', [1, 'x']);
        const b = await callJsonRpc<{ ok: boolean }>('methodB', []);

        expect(caller).toHaveBeenCalledTimes(2);
        expect(calls[0]).toEqual({ jsonrpc: '2.0', id: 1, method: 'methodA', params: [1, 'x'] });
        expect(calls[1]).toEqual({ jsonrpc: '2.0', id: 2, method: 'methodB', params: [] });
        expect(a.result).toEqual({ ok: true });
        expect(b.result).toEqual({ ok: true });
    });

    it('throws AbortError synchronously when signal is already aborted', async () => {
        const caller = jest.fn(async (): Promise<JsonRpcResponse<unknown>> => ({
            jsonrpc: '2.0',
            id: 0,
            result: null,
        }));
        setJsonRpcWebSocketCaller(caller);

        const controller = new AbortController();
        controller.abort();

        await expect(callJsonRpc('foo', [], { signal: controller.signal })).rejects.toMatchObject({
            name: 'AbortError',
        });
        expect(caller).not.toHaveBeenCalled();
    });

    it('cleanup function unregisters caller, restoring RpcTransportError behavior', async () => {
        const caller = jest.fn(async (req: JsonRpcRequest): Promise<JsonRpcResponse<unknown>> => ({
            jsonrpc: '2.0',
            id: req.id,
            result: null,
        }));
        const cleanup = setJsonRpcWebSocketCaller(caller);
        await callJsonRpc('foo', []);
        expect(caller).toHaveBeenCalledTimes(1);

        cleanup();

        await expect(callJsonRpc('foo', [])).rejects.toBeInstanceOf(RpcTransportError);
    });
});
