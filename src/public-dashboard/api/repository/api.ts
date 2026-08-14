import request from '../core';

// markdown.render(markdown, darkMode, referer) over HTTP JSON-RPC — mirrors src/api/repository/markdown.ts.
// The public-dashboard tree has no shared rpc infra, so this is a minimal, self-contained HTTP RPC helper
// that posts to /api/rpc via this tree's own axios core. It resolves to the rendered HTML string, matching
// the old postMd behaviour so the worksheet Markdown component renders identically.
let sPdRpcId = 0;
const rpcMarkdownRender = async (markdown: string, darkMode: boolean, referer: string): Promise<string> => {
    sPdRpcId += 1;
    const rpcRequest = {
        jsonrpc: '2.0' as const,
        id: sPdRpcId,
        method: 'markdown.render',
        params: [markdown, darkMode, referer],
    };
    // The response interceptor unwraps to response.data (the JSON-RPC body itself).
    const res = (await request({ method: 'POST', url: '/api/rpc', data: rpcRequest })) as unknown as {
        result?: string;
        error?: { code: number; message: string };
    };
    if (res?.error) throw new Error(res.error.message || `JSON-RPC error ${res.error.code}`);
    return res?.result ?? '';
};

export { rpcMarkdownRender };
