import { useState, CSSProperties } from 'react';
import { rpcCall, JsonRpcResponse } from '@/api/repository/rpc';
import { rpcServerInfoGet, rpcServerCertificateGet } from '@/api/repository/server';
import { rpcSessionList, rpcSessionStat, rpcSessionLimitGet } from '@/api/repository/session';
import { rpcProxyList } from '@/api/repository/proxy';
import { rpcServicePortList } from '@/api/repository/service';

/**
 * 🧪 RPC Probe — temporary dummy page for checking UI-API (JSON-RPC) read methods.
 *
 * Calls the read RPCs of the #1334 new categories (server/session/proxy/service) via their
 * **named wrappers** and shows the backend response. Going through a wrapper means the method
 * shows up in the stack trace (e.g. `rpcServerInfoGet`), so it stays traceable (honoring the
 * "no direct generic dispatcher call" rule).
 *
 * Access: while logged in, `/web/ui/rpcprobe` (the Bearer token is injected automatically by axios core).
 * ⚠️ Temporary tool — remove this component and its route once wired into the real UI.
 */

interface ProbeMethod {
    label: string;
    note?: string;
    call: () => Promise<JsonRpcResponse<unknown>>;
}

// Read named wrappers for the new categories (0 call sites). Reference categories (bridge.list etc.) go through the custom call below.
const PRESET_METHODS: ProbeMethod[] = [
    { label: 'server.info.get', call: rpcServerInfoGet },
    { label: 'server.certificate.get', call: rpcServerCertificateGet },
    { label: 'service.port.list', call: rpcServicePortList },
    { label: 'session.list', call: rpcSessionList },
    { label: 'session.stat', note: 'may require arguments', call: rpcSessionStat },
    { label: 'session.limit.get', call: rpcSessionLimitGet },
    { label: 'proxy.list', call: rpcProxyList },
];

type CallStatus = 'idle' | 'loading' | 'ok' | 'rpc-error' | 'transport-error';

interface CallResult {
    status: CallStatus;
    elapsedMs?: number;
    response?: JsonRpcResponse<unknown>;
    errorMessage?: string;
}

const STATUS_COLOR: Record<CallStatus, string> = {
    idle: '#888',
    loading: '#d29922',
    ok: '#3fb950',
    'rpc-error': '#d29922',
    'transport-error': '#f85149',
};

const STATUS_LABEL: Record<CallStatus, string> = {
    idle: 'idle',
    loading: 'calling…',
    ok: 'OK (result)',
    'rpc-error': 'RPC error',
    'transport-error': 'transport failed',
};

/**
 * For custom calls: wrap an arbitrary method string in a function whose name carries the method
 * (computed-property name trick). Even ad-hoc methods without a named wrapper then show up in the
 * stack as `rpc:<method>`.
 */
const namedRpcCall = (method: string, params: unknown[]): Promise<unknown> => {
    const caller = { [`rpc:${method}`]: () => rpcCall<unknown>(method, params as never[]) }[`rpc:${method}`];
    return caller();
};

/** Classify the response. transport failures come through as a throw; RPC errors via response.error. */
const runCall = async (call: () => Promise<unknown>): Promise<CallResult> => {
    const t0 = performance.now();
    try {
        const res = (await call()) as unknown;
        const elapsedMs = Math.round(performance.now() - t0);
        const r = res as Record<string, unknown> | null | undefined;
        if (r == null) {
            return { status: 'transport-error', elapsedMs, errorMessage: 'empty response (undefined) — endpoint missing or the interceptor swallowed the response' };
        }
        if (r.error) return { status: 'rpc-error', elapsedMs, response: res as JsonRpcResponse<unknown> };
        if (r.jsonrpc === '2.0' || 'result' in r) return { status: 'ok', elapsedMs, response: res as JsonRpcResponse<unknown> };
        // Not a JSON-RPC shape — usually an axios error response (404 etc.) that the interceptor resolved.
        return { status: 'rpc-error', elapsedMs, response: res as JsonRpcResponse<unknown>, errorMessage: 'not a JSON-RPC response (check the raw below — endpoint/method may be unsupported)' };
    } catch (e) {
        const elapsedMs = Math.round(performance.now() - t0);
        return { status: 'transport-error', elapsedMs, errorMessage: e instanceof Error ? e.message : String(e) };
    }
};

/** Safely serialize objects that may contain circular references (e.g. AxiosResponse). */
const safeStringify = (v: unknown): string => {
    const seen = new WeakSet();
    try {
        return JSON.stringify(
            v,
            (_k, val) => {
                if (typeof val === 'object' && val !== null) {
                    if (seen.has(val)) return '[Circular]';
                    seen.add(val);
                }
                return val;
            },
            2
        );
    } catch (e) {
        return String(v) + (e instanceof Error ? ` (stringify failed: ${e.message})` : '');
    }
};

const ResultBlock = ({ result }: { result?: CallResult }) => {
    if (!result || result.status === 'idle') return null;
    return (
        <div style={{ marginTop: 6 }}>
            <span style={{ color: STATUS_COLOR[result.status], fontWeight: 600 }}>{STATUS_LABEL[result.status]}</span>
            {result.elapsedMs != null && <span style={{ color: '#888', marginLeft: 8 }}>{result.elapsedMs}ms</span>}
            {result.status !== 'loading' && (
                <>
                    {result.errorMessage && <div style={{ color: '#f0883e', fontSize: 12, margin: '4px 0' }}>{result.errorMessage}</div>}
                    {result.response !== undefined && (
                        <pre
                            style={{
                                margin: '4px 0 0',
                                padding: 8,
                                background: '#0d1117',
                                border: '1px solid #30363d',
                                borderRadius: 4,
                                color: '#c9d1d9',
                                fontSize: 12,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                maxHeight: 280,
                                overflow: 'auto',
                            }}
                        >
                            {safeStringify(result.response)}
                        </pre>
                    )}
                </>
            )}
        </div>
    );
};

const RpcProbe = () => {
    const [results, setResults] = useState<Record<number, CallResult>>({});
    const [customMethod, setCustomMethod] = useState('bridge.list');
    const [customParams, setCustomParams] = useState('[]');
    const [customResult, setCustomResult] = useState<CallResult | undefined>();

    const runPreset = async (idx: number) => {
        setResults((prev) => ({ ...prev, [idx]: { status: 'loading' } }));
        const r = await runCall(PRESET_METHODS[idx].call);
        setResults((prev) => ({ ...prev, [idx]: r }));
    };

    const runAll = async () => {
        await Promise.all(PRESET_METHODS.map((_, idx) => runPreset(idx)));
    };

    const runCustom = async () => {
        let params: unknown[];
        try {
            params = JSON.parse(customParams || '[]');
            if (!Array.isArray(params)) throw new Error('params must be a JSON array');
        } catch (e) {
            setCustomResult({ status: 'transport-error', errorMessage: `params parse error: ${e instanceof Error ? e.message : String(e)}` });
            return;
        }
        setCustomResult({ status: 'loading' });
        setCustomResult(await runCall(() => namedRpcCall(customMethod.trim(), params)));
    };

    const cellStyle: CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #30363d', verticalAlign: 'top' };
    const btnStyle: CSSProperties = {
        padding: '4px 12px',
        background: '#21262d',
        color: '#c9d1d9',
        border: '1px solid #30363d',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 13,
    };

    return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#c9d1d9', background: '#161b22', minHeight: '100vh', boxSizing: 'border-box' }}>
            <h2 style={{ marginTop: 0 }}>🧪 RPC Probe — UI-API read check (temporary)</h2>
            <p style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.6 }}>
                Calls the read RPCs of the #1334 new categories (server/session/proxy/service) via their <b>named wrappers</b> (e.g. <code>rpcServerInfoGet</code>) and shows the response.
                Going through a wrapper means the method is traceable in the stack/message on error. The login token is injected automatically by axios core.
                <br />
                For reference (existing REST categories such as bridge.list), use the <b>custom call</b> below.
                <br />
                ⚠️ This is a temporary tool. Remove <code>src/components/rpcProbe/</code> and its route once wired into the real UI.
            </p>

            <button style={{ ...btnStyle, marginBottom: 12, padding: '6px 16px' }} onClick={runAll}>
                ▶ Run all reads
            </button>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, fontSize: 13 }}>
                <thead>
                    <tr style={{ textAlign: 'left', color: '#8b949e' }}>
                        <th style={cellStyle}>method (named wrapper)</th>
                        <th style={{ ...cellStyle, width: 90 }}>call</th>
                        <th style={cellStyle}>response</th>
                    </tr>
                </thead>
                <tbody>
                    {PRESET_METHODS.map((m, idx) => (
                        <tr key={idx}>
                            <td style={cellStyle}>
                                <b>{m.label}</b>
                                {m.note && <div style={{ color: '#8b949e', fontSize: 11 }}>{m.note}</div>}
                            </td>
                            <td style={cellStyle}>
                                <button style={btnStyle} onClick={() => runPreset(idx)}>
                                    call
                                </button>
                            </td>
                            <td style={cellStyle}>
                                <ResultBlock result={results[idx]} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 style={{ marginTop: 28 }}>Custom call (reference categories / ad-hoc)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <input
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    placeholder="method (e.g. bridge.list)"
                    style={{ padding: 6, width: 260, background: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, fontFamily: 'monospace' }}
                />
                <input
                    value={customParams}
                    onChange={(e) => setCustomParams(e.target.value)}
                    placeholder='params (JSON array, e.g. ["name"])'
                    style={{ padding: 6, width: 320, background: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 4, fontFamily: 'monospace' }}
                />
                <button style={btnStyle} onClick={runCustom}>
                    call
                </button>
            </div>
            <ResultBlock result={customResult} />
        </div>
    );
};

export default RpcProbe;
