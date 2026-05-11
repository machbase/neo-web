import { hasScript } from './manifest';
import { stepReadManifest } from './steps/readManifest';
import { stepRmPkg } from './steps/rmPkg';
import { stepRunUninstall } from './steps/runUninstall';
import type { LifecycleContext, StepResult } from './types';

// Uninstall sequence:
//   1. read package.json (best-effort)
//   2. if scripts.uninstall exists, run it (servicectl uninstall + pkg-specific cleanup)
//   3. ALWAYS rm -rf public/{appName} at the end — FE owns filesystem cleanup
//
// A script failure does not short-circuit the rm step: we still want the
// directory gone so the UI reflects "not installed". The first failure (script
// or rm) is surfaced as the overall result.
export async function runUninstall(ctx: LifecycleContext): Promise<StepResult> {
    await stepReadManifest(ctx);

    let firstFailure: StepResult | null = null;

    if (hasScript(ctx.manifest, 'uninstall')) {
        const r = await stepRunUninstall(ctx);
        if (!r.ok) firstFailure = r;
    }

    const rm = await stepRmPkg(ctx);
    if (!rm.ok && !firstFailure) firstFailure = rm;

    if (firstFailure) return { ...firstFailure, log: ctx.logs.join('\n') };
    return { ok: true, log: ctx.logs.join('\n') };
}
