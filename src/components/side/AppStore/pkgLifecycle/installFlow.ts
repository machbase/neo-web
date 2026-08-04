import { hasScript } from './manifest';
import { stepArchiveExtract } from './steps/archiveExtract';
import { stepPkgCopy } from './steps/pkgCopy';
import { stepReadManifest } from './steps/readManifest';
import { stepRunInstall } from './steps/runInstall';
import type { LifecycleContext, StepResult } from './types';

/**
 * issue #1452 — pick how the package bytes are obtained.
 *
 * ONLY an explicit `source === 'local'` diverges. A missing `source` does not
 * mean "offline": it means the caller never picked a catalog row
 * (experiment-mode custom version input, detail view, …), and those callers must
 * keep the historical GitHub path.
 *
 * NEITHER STEP IS FORCED HERE, and that is the install/update distinction:
 * `runUpdate` passes `{ force: true }` to both, this flow passes nothing. For the
 * archive path that is load-bearing — unforced means `/public/<name>` must not
 * exist yet, forced means merge over what is there and keep the user's conf/.
 *
 * `source` is the ONLY input to this decision, because it is the only part of it
 * the browser knows: it is the user's choice in the version menu, which no
 * server-side scan can reconstruct. Everything else the local path needs — which
 * zip, where it lives — is found server-side from `ctx.tag` (see
 * `steps/archiveExtract.ts`).
 */
function fetchStep(ctx: LifecycleContext) {
    return ctx.source === 'local' ? stepArchiveExtract : stepPkgCopy;
}

export async function runInstall(ctx: LifecycleContext): Promise<StepResult> {
    for (const step of [fetchStep(ctx), stepReadManifest]) {
        const r = await step(ctx);
        if (!r.ok) return { ...r, log: ctx.logs.join('\n') };
    }

    if (!hasScript(ctx.manifest, 'install')) {
        return { ok: true, log: ctx.logs.join('\n') };
    }

    const r = await stepRunInstall(ctx);
    return r.ok ? { ok: true, log: ctx.logs.join('\n') } : { ...r, log: ctx.logs.join('\n') };
}
