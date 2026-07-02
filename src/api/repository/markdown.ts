// markdown.* JSON-RPC named wrappers (HTTP transport) — migrated from REST POST /api/md (#1334).
//
// `markdown.render(markdown, darkMode, referer)` (params order: [markdown, darkMode, referer]).
// The server runs ```http code blocks server-side via replaceHttpClient(), parses the referer URL to
// substitute {{file_root}} (=/web/api/tql) / {{file_path}} / {{file_name}} / {{file_dir}} templates, and
// returns the rendered HTML wrapped in <div>...</div>. The wrapper resolves to that HTML string so call
// sites behave exactly like the old postMd (which also resolved to an HTML string).
//
// referer is the full URL (e.g. http://127.0.0.1:5654/web/api/tql/sample_image.wrk for a saved board, or
// http://127.0.0.1:5654/web/ui when unsaved) — passed through verbatim, NOT base64-encoded (the old REST
// path encoded it into an X-Referer header; the RPC takes it as a plain positional arg).
import { rpcCall, RpcMethod } from './rpc';

/**
 * Render markdown to HTML — `markdown.render(markdown, darkMode, referer)`.
 * Resolves to the rendered HTML string (`<div>...</div>`). Throws on JSON-RPC error
 * (already prefixed `[rpc:markdown.render]` by tagRpcError) so callers can surface it.
 */
export const rpcMarkdownRender = async (markdown: string, darkMode: boolean, referer: string): Promise<string> => {
    const res = await rpcCall<string>(RpcMethod.markdown.render, [markdown, darkMode, referer]);
    if (res?.error) throw new Error(res.error.message || `JSON-RPC error ${res.error.code}`);
    return res?.result ?? '';
};
