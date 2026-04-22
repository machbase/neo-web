// Thin wrapper around the TQL SHELL invocation pattern used throughout AppStore.
// Centralises the `FAKE / SHELL / JSON` tql boilerplate so the rest of the
// pipeline deals only with `{ ok, log }`.

import { getTqlChart } from '@/api/repository/machiot';
import type { StepResult } from './types';

export async function runShell(cmd: string): Promise<StepResult> {
    const tql = `FAKE(once(1))\nSHELL(\`${cmd}\`)\nJSON(rowsFlatten(true))`;
    try {
        const res: any = await getTqlChart(tql);
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
