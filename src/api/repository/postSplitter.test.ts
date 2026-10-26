// F-102: the request layer resolves a failed request instead of rejecting it, so the split RPC "succeeded" with no
// statements when the server could not be reached — the SQL editor then ran nothing and showed nothing.
import { AxiosError } from 'axios';

jest.mock('@/api/repository/rpc', () => ({ rpcCall: jest.fn(), RpcMethod: { sql: { split: 'sql.split' } } }));
jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));

import { rpcCall } from '@/api/repository/rpc';
import { postSplitter } from './api';

describe('postSplitter', () => {
    it('a request that never reached the server is a failure with the transport reason', async () => {
        (rpcCall as jest.Mock).mockResolvedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
        expect(await postSplitter('select 1')).toMatchObject({ success: false, reason: 'Network Error' });
    });
    it('an HTTP error response is a failure with the server reason', async () => {
        (rpcCall as jest.Mock).mockResolvedValue({ status: 502, statusText: 'Bad Gateway', headers: {}, data: '{"success":false,"reason":"upstream down"}' });
        expect(await postSplitter('select 1')).toMatchObject({ success: false, reason: 'upstream down' });
    });
    it('an empty script (result null) is still an empty success', async () => {
        (rpcCall as jest.Mock).mockResolvedValue({ jsonrpc: '2.0', id: 1, result: null });
        expect(await postSplitter('  ')).toMatchObject({ success: true, data: { statements: [] } });
    });
    it('statements pass through', async () => {
        const sStatements = [{ text: 'select 1', beginLine: 1, endLine: 1 }];
        (rpcCall as jest.Mock).mockResolvedValue({ jsonrpc: '2.0', id: 1, result: sStatements });
        expect(await postSplitter('select 1')).toMatchObject({ success: true, data: { statements: sStatements } });
    });
    it('an RPC error keeps its message', async () => {
        (rpcCall as jest.Mock).mockResolvedValue({ jsonrpc: '2.0', id: 1, error: { code: -1, message: 'boom' } });
        expect(await postSplitter('select 1')).toMatchObject({ success: false, reason: 'boom' });
    });
});
