import { hasScript } from './manifest';
import { stepReadManifest } from './steps/readManifest';
import { stepRunStop } from './steps/runStop';
import type { LifecycleContext, StepResult } from './types';

export async function runStop(ctx: LifecycleContext): Promise<StepResult> {
    const read = await stepReadManifest(ctx);
    if (!read.ok) return { ...read, log: ctx.logs.join('\n') };

    if (!hasScript(ctx.manifest, 'stop')) {
        return { ok: false, log: ctx.logs.join('\n'), reason: 'no stop script in package.json' };
    }

    const r = await stepRunStop(ctx);
    return r.ok ? { ok: true, log: ctx.logs.join('\n') } : { ...r, log: ctx.logs.join('\n') };
}
