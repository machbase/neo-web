import { hasScript } from './manifest';
import { stepPkgCopy } from './steps/pkgCopy';
import { stepReadManifest } from './steps/readManifest';
import { stepRunInstall } from './steps/runInstall';
import type { LifecycleContext, StepResult } from './types';

export async function runInstall(ctx: LifecycleContext): Promise<StepResult> {
    for (const step of [stepPkgCopy, stepReadManifest]) {
        const r = await step(ctx);
        if (!r.ok) return { ...r, log: ctx.logs.join('\n') };
    }

    if (!hasScript(ctx.manifest, 'install')) {
        return { ok: true, log: ctx.logs.join('\n') };
    }

    const r = await stepRunInstall(ctx);
    return r.ok ? { ok: true, log: ctx.logs.join('\n') } : { ...r, log: ctx.logs.join('\n') };
}
