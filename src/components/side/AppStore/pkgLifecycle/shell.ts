// Thin wrapper around the TQL SHELL invocation pattern used throughout AppStore.
// Centralises the `FAKE / SHELL / JSON` tql boilerplate so the rest of the
// pipeline deals only with `{ ok, log }`.

import { getTqlChart } from '@/api/repository/machiot';
import type { StepResult } from './types';

/**
 * Quote one argument for the JSH shell. MEASURED on machbase-neo v8.7.2: the
 * shell honours '…' and "…", has no backslash escapes, joins adjacent quoted
 * pieces into one word, splits commands at `;` and does not expand `$()`.
 * So a single-quoted word, with each `'` written as `'"'"'`, reaches the
 * command as exactly one argument whatever it contains.
 */
export const shellQuote = (value: string): string => `'${value.replace(/'/g, `'"'"'`)}'`;

/**
 * Run `cmd` through TQL SHELL.
 *
 * `args` are for values that did not come from the catalog (e.g. a version the
 * user typed). They never enter the TQL source: each `{name}` in `cmd` reads its
 * value back with `param("name")`, and the value is shell-quoted so it stays a
 * single argument. A backtick in it can no longer end the SHELL(`…`) literal.
 */
export async function runShell(cmd: string, args?: Record<string, string>): Promise<StepResult> {
    let expr = `\`${cmd}\``;
    let params: Record<string, string> | undefined;
    for (const [name, value] of Object.entries(args ?? {})) {
        expr = expr.split(`{${name}}`).join(`\` + param("${name}") + \``);
        params = { ...params, [name]: shellQuote(value) };
    }
    const tql = `FAKE(once(1))\nSHELL(${expr})\nJSON(rowsFlatten(true))`;
    try {
        const res: any = await getTqlChart(tql, 'pkg', undefined, params);
        const data = res?.data;

        if (data && typeof data === 'object' && data.success) {
            const rows: any[] = data?.data?.rows ?? [];
            const log = rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n');
            return { ok: true, log };
        }

        const log = typeof data === 'string' ? data : JSON.stringify(data);
        const reason = (data && typeof data === 'object' && (data.reason as string)) || 'shell command failed';
        return { ok: false, log, reason };
    } catch (e: any) {
        const msg = e?.message ?? 'shell error';
        return { ok: false, log: msg, reason: msg };
    }
}
