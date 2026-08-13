// Thin wrapper around the TQL SCRIPT("js", …) invocation pattern — the sibling
// of `runShell` for work the JSH shell cannot express (there is no `mv`/`cp`
// there, and no unzip command at all, but `require('archive/zip')` and
// `require('fs')` are available inside SCRIPT).
//
// It deliberately returns the SAME `StepResult` contract as `runShell` so the
// lifecycle steps can be swapped source-for-source (`stepPkgCopy` ⇄
// `stepArchiveExtract`) without the flows knowing which transport ran.
//
// SECURITY — the reason this takes `params` at all:
// the body handed to SCRIPT is *JavaScript source*. Concatenating a package
// name or a file path into it is remote code execution, not string building.
// Every runtime value therefore travels in the query string and is read back
// inside the script via `$.params`, where it is a string value and never code.
// Keep script bodies constant; if a new value is needed, add a param.

import { getTqlChart } from '@/api/repository/machiot';
// The sentinel and the empty-output reason live in `types.ts` WITH `StepResult`,
// not here: the script source that writes the sentinel (`archiveScript.ts`) and
// this reader both have to import one spelling of it, and neither may depend on
// the other. Re-exporting them from this module would not help a caller that has
// jest-mocked it.
import { SCRIPT_ERROR_SENTINEL, SCRIPT_NO_OUTPUT_REASON, type StepResult } from './types';

/**
 * Best-effort extraction of the server's `reason` from a TQL failure body.
 *
 * On a non-2xx the api core's response interceptor hands back the raw
 * `AxiosResponse`, and the `/api/tql` JSON parsing only happens on the success
 * path — so `data` can still be an unparsed JSON string here. Parsing it keeps
 * the structural-validation messages the extract script throws visible to the
 * user instead of collapsing them into a generic failure.
 */
function extractReason(data: unknown): string | undefined {
    if (data && typeof data === 'object' && typeof (data as { reason?: unknown }).reason === 'string') {
        return (data as { reason: string }).reason;
    }
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed.reason === 'string') return parsed.reason;
        } catch {
            /* not json — fall through */
        }
    }
    return undefined;
}

/**
 * Run `body` as a TQL js script and collect its `$.yield(...)` rows as the log.
 *
 * ---------------------------------------------------------------------------
 * THE TRANSPORT NEVER REPORTS A SCRIPT FAILURE. `data.success` IS NOT A RESULT.
 * ---------------------------------------------------------------------------
 * MEASURED on machbase-neo v8.5.10-snapshot, three bodies through this exact
 * `FAKE(once(1)) / SCRIPT("js") / JSON(rowsFlatten(true))` pipeline:
 *
 *   $.yield("A"); $.yield("B");              → success=true  rows=['A','B']
 *   $.yield("A"); throw new Error("boom");   → success=true  rows=['A']
 *   throw new Error("boom");                 → success=true  rows=[]
 *
 * So `success` describes the TQL PIPELINE, not the script: a script that threw on
 * its first line is reported exactly like one that completed. Believing it is how
 * `stepArchiveExtract` came to answer "archive extract reported success but
 * /public/<pkg> is missing" — the real reason ("archive must contain exactly one
 * root entry, found 2") had been thrown, and thrown away, minutes earlier.
 *
 * Note the second line: ROWS YIELDED BEFORE THE THROW SURVIVE. That is the whole
 * mechanism this contract stands on.
 *
 * THE CONTRACT, THEREFORE — rows are the result, and every script must keep it:
 *
 *   a row starting with {@link SCRIPT_ERROR_SENTINEL}
 *        → `{ ok: false, reason: <the text after the sentinel> }`
 *          The script aborted on purpose. `archiveScript.ts`'s `failScript()` is
 *          the one writer: it yields the sentinel row and THEN throws.
 *   NO ROWS AT ALL
 *        → `{ ok: false, reason: `{@link SCRIPT_NO_OUTPUT_REASON}` }`
 *          A well-formed script yields at least once (the scan yields its
 *          document, the extract yields "using <archive> …" before it touches
 *          anything), so silence means it died before getting there — a syntax
 *          error, a missing module, a throw from the prelude.
 *   anything else
 *        → `{ ok: true, log }`
 *
 * A NEW SCRIPT MUST YIELD SOMETHING. That is the price of the empty-rows rule,
 * and it is the cheap half: the alternative is trusting `success`, which is the
 * bug above.
 *
 * @param body   Constant JavaScript source. Must not embed runtime values.
 * @param params Query-string bindings, read inside the script via `$.params`.
 */
export async function runScript(body: string, params?: Record<string, string>): Promise<StepResult> {
    const tql = `FAKE(once(1))\nSCRIPT("js", {\n${body}\n})\nJSON(rowsFlatten(true))`;
    try {
        const res: any = await getTqlChart(tql, 'pkg', undefined, params);
        const data = res?.data;

        if (data && typeof data === 'object' && data.success) {
            const rows: any[] = data?.data?.rows ?? [];
            const lines = rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r)));
            const log = lines.join('\n');

            // The script said so itself. Keep the FULL log — the rows before the
            // sentinel are the trace of how far it got.
            const failure = lines.find((line) => line.startsWith(SCRIPT_ERROR_SENTINEL));
            if (failure !== undefined) {
                const reason = failure.slice(SCRIPT_ERROR_SENTINEL.length).trim() || 'script aborted';
                return { ok: false, log, reason };
            }
            // It never got to speak.
            if (lines.length === 0) return { ok: false, log, reason: SCRIPT_NO_OUTPUT_REASON };

            return { ok: true, log };
        }

        const log = typeof data === 'string' ? data : JSON.stringify(data);
        const reason = extractReason(data) ?? 'script failed';
        return { ok: false, log, reason };
    } catch (e: any) {
        const msg = e?.message ?? 'script error';
        return { ok: false, log: msg, reason: msg };
    }
}
