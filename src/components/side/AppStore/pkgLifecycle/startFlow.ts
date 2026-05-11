import { hasScript } from './manifest';
import { stepReadManifest } from './steps/readManifest';
import { stepRunStart } from './steps/runStart';
import type { LifecycleContext, StepResult } from './types';

// Standalone start: read the manifest, then run scripts.start if it exists.
// Catalog start button is only rendered when the manifest is known to have a
// start script — but we re-read here defensively in case the manifest changed
// since the cache was populated.
export async function runStart(ctx: LifecycleContext): Promise<StepResult> {
    const read = await stepReadManifest(ctx);
    if (!read.ok) return { ...read, log: ctx.logs.join('\n') };

    if (!hasScript(ctx.manifest, 'start')) {
        return { ok: false, log: ctx.logs.join('\n'), reason: 'no start script in package.json' };
    }

    const r = await stepRunStart(ctx);
    return r.ok ? { ok: true, log: ctx.logs.join('\n') } : { ...r, log: ctx.logs.join('\n') };
}
