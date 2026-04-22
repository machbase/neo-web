import { readManifest } from '../manifest';
import type { LifecycleContext, StepResult } from '../types';

export async function stepReadManifest(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('read package.json');
    ctx.logs.push(`== read /public/${ctx.appName}/package.json ==`);

    const m = await readManifest(ctx.appName);
    if (!m) {
        ctx.logs.push('(no package.json or unreadable)');
        return { ok: true, log: '(no manifest)' };
    }

    ctx.manifest = m;
    ctx.logs.push(JSON.stringify(m.scripts ?? {}, null, 2));
    return { ok: true, log: 'manifest loaded' };
}
