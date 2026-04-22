import { hasScript } from './manifest';
import { stepPkgCopy } from './steps/pkgCopy';
import { stepReadManifest } from './steps/readManifest';
import { stepRunInstall } from './steps/runInstall';
import { stepRunStart } from './steps/runStart';
import { stepRunStop } from './steps/runStop';
import type { LifecycleContext, StepResult } from './types';

// Update sequence:
//   1. read pre-update package.json to learn if the running instance must be
//      stopped before files are overwritten.
//   2. if pre.stop:  stepRunStop
//   3. stepPkgCopy -f   (always)
//   4. re-read package.json (may have new scripts from the updated version)
//   5. if post.install: stepRunInstall — new deps / service re-registration
//   6. if pre.stop OR post.install: stepRunStart — bring the service back up
//
// Any failure aborts the remaining steps and returns the first failure.
// No auto-rollback: partial state (stopped, new files, no start) is left
// intact so the admin can inspect and retry rather than risk deeper damage.
export async function runUpdate(ctx: LifecycleContext): Promise<StepResult> {
    // ── Phase 1: pre-update manifest ──────────────────────────────────────
    const preRead = await stepReadManifest(ctx);
    if (!preRead.ok) return { ...preRead, log: ctx.logs.join('\n') };
    const hadStop = hasScript(ctx.manifest, 'stop');

    if (hadStop) {
        const stopRes = await stepRunStop(ctx);
        if (!stopRes.ok) return { ...stopRes, log: ctx.logs.join('\n') };
    }

    // ── Phase 2: overwrite files ──────────────────────────────────────────
    const copyRes = await stepPkgCopy(ctx, { force: true });
    if (!copyRes.ok) return { ...copyRes, log: ctx.logs.join('\n') };

    // ── Phase 3: post-update manifest ─────────────────────────────────────
    // Clear first so a read failure cannot leave the pre-update manifest in
    // place and mislead the install-script check below.
    ctx.manifest = undefined;
    const postRead = await stepReadManifest(ctx);
    if (!postRead.ok) return { ...postRead, log: ctx.logs.join('\n') };
    const hasInstallNow = hasScript(ctx.manifest, 'install');

    if (hasInstallNow) {
        const installRes = await stepRunInstall(ctx);
        if (!installRes.ok) return { ...installRes, log: ctx.logs.join('\n') };
    }

    // ── Phase 4: restart service ──────────────────────────────────────────
    if (hadStop || hasInstallNow) {
        const startRes = await stepRunStart(ctx);
        if (!startRes.ok) return { ...startRes, log: ctx.logs.join('\n') };
    }

    return { ok: true, log: ctx.logs.join('\n') };
}
