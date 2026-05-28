import {
    postLspDiagnostics,
    postLspCompletion,
    postLspHover,
    postLspSignatureHelp,
    getLspMetadata,
    type LspRequest,
} from './lsp';
import { callJsonRpc, RpcTransportError } from './rpc';

jest.mock('./rpc', () => {
    const actual = jest.requireActual('./rpc');
    return {
        ...actual,
        callJsonRpc: jest.fn(),
    };
});

const mockedCallJsonRpc = callJsonRpc as jest.MockedFunction<typeof callJsonRpc>;

describe('lsp.ts — named wrapper API', () => {
    beforeEach(() => {
        mockedCallJsonRpc.mockReset();
    });

    it('postLspCompletion delegates to callJsonRpc with lsp.completion method and forwards signal', async () => {
        mockedCallJsonRpc.mockResolvedValue({
            jsonrpc: '2.0',
            id: 1,
            result: { items: [{ label: 'SELECT', kind: 14 }] },
        });

        const controller = new AbortController();
        const req: LspRequest = {
            language: 'sql',
            uri: 'inmemory://model/1',
            text: 'SEL',
            position: { line: 0, column: 3 },
        };

        const res = await postLspCompletion(req, controller.signal);

        expect(mockedCallJsonRpc).toHaveBeenCalledTimes(1);
        expect(mockedCallJsonRpc).toHaveBeenCalledWith(
            'lsp.completion',
            [req],
            { signal: controller.signal }
        );
        expect(res).toEqual({
            success: true,
            reason: 'success',
            data: { items: [{ label: 'SELECT', kind: 14 }] },
        });
    });

    it('throws RpcTransportError (not plain Error) when JSON-RPC response carries an error field', async () => {
        mockedCallJsonRpc.mockResolvedValue({
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32601, message: 'Method not found' },
        });

        const req: LspRequest = { language: 'tql', uri: 'u', text: '' };

        await expect(postLspDiagnostics(req)).rejects.toBeInstanceOf(RpcTransportError);
        await expect(postLspDiagnostics(req)).rejects.toThrow('Method not found');
    });

    it('normalizes a successful response into { success, reason, data }', async () => {
        mockedCallJsonRpc.mockResolvedValue({
            jsonrpc: '2.0',
            id: 1,
            result: { hover: { range: { start: { line: 0, column: 0 }, end: { line: 0, column: 3 } }, contents: 'doc' } },
        });

        const req: LspRequest = { language: 'sql', uri: 'u', text: 'SEL', position: { line: 0, column: 1 } };
        const res = await postLspHover(req);

        expect(res.success).toBe(true);
        expect(res.reason).toBe('success');
        expect(res.data).toEqual({
            hover: {
                range: { start: { line: 0, column: 0 }, end: { line: 0, column: 3 } },
                contents: 'doc',
            },
        });
    });

    it('getLspMetadata calls lsp.metadata with [{ language }] params', async () => {
        mockedCallJsonRpc.mockResolvedValue({
            jsonrpc: '2.0',
            id: 1,
            result: { keywords: ['MAP', 'SINK'] },
        });

        const res = await getLspMetadata('tql');

        expect(mockedCallJsonRpc).toHaveBeenCalledTimes(1);
        expect(mockedCallJsonRpc).toHaveBeenCalledWith(
            'lsp.metadata',
            [{ language: 'tql' }],
            { signal: undefined }
        );
        expect(res).toEqual({
            success: true,
            reason: 'success',
            data: { keywords: ['MAP', 'SINK'] },
        });
    });

    it('postLspSignatureHelp uses lsp.signature method', async () => {
        mockedCallJsonRpc.mockResolvedValue({
            jsonrpc: '2.0',
            id: 1,
            result: {
                signatureHelp: {
                    signatures: [{ label: 'MAP(x)' }],
                    activeSignature: 0,
                    activeParameter: 0,
                },
            },
        });

        const req: LspRequest = { language: 'tql', uri: 'u', text: 'MAP(', position: { line: 0, column: 4 } };
        const res = await postLspSignatureHelp(req);

        expect(mockedCallJsonRpc).toHaveBeenCalledWith('lsp.signature', [req], { signal: undefined });
        expect(res.data.signatureHelp?.signatures[0].label).toBe('MAP(x)');
    });

    it('returns empty object data when result is undefined', async () => {
        mockedCallJsonRpc.mockResolvedValue({
            jsonrpc: '2.0',
            id: 1,
            // no result, no error
        });

        const req: LspRequest = { language: 'jsh', uri: 'u', text: '' };
        const res = await postLspDiagnostics(req);

        expect(res.data).toEqual({});
    });
});
