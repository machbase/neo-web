// issue #1570 F-29 — the api core resolves (not rejects) with the axios error on a network
// failure and with the error response on an HTTP error. Neither is a JSON-RPC body, so
// neither may be read as "zero bridges".
import { getBridge } from './bridge';
import { rpcCall } from './rpc';

jest.mock('./rpc', () => ({ ...jest.requireActual('./rpc'), rpcCall: jest.fn() }));
const mockedRpcCall = rpcCall as jest.MockedFunction<typeof rpcCall>;

beforeEach(() => mockedRpcCall.mockReset());

test('a JSON-RPC body with no bridges is an empty list', async () => {
    mockedRpcCall.mockResolvedValue({ jsonrpc: '2.0', id: 1, result: [] });
    await expect(getBridge()).resolves.toMatchObject({ success: true, data: [] });
});

test('a JSON-RPC body with a null result is still an empty list', async () => {
    mockedRpcCall.mockResolvedValue({ jsonrpc: '2.0', id: 1, result: null } as any);
    await expect(getBridge()).resolves.toMatchObject({ success: true, data: [] });
});

test('a network failure (axios error object) is a failure', async () => {
    mockedRpcCall.mockResolvedValue({ name: 'AxiosError', message: 'Network Error', code: 'ERR_NETWORK' } as any);
    await expect(getBridge()).resolves.toMatchObject({ success: false, reason: 'Network Error' });
});

test('an HTTP error response is a failure carrying its reason', async () => {
    mockedRpcCall.mockResolvedValue({ status: 500, statusText: 'Internal Server Error', data: { reason: 'boom' } } as any);
    await expect(getBridge()).resolves.toMatchObject({ success: false, reason: 'boom' });
});
