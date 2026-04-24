import { runShell } from '../shell';
import { waitForPkgRemoved } from '../fsProbe';
import type { LifecycleContext, StepResult } from '../types';

export async function stepRmPkg(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('rm pkg');
    const cmd = `rm -rf /work/public/${ctx.appName}`;
    ctx.logs.push(`== ${cmd} ==`);

    const r = await runShell(cmd);
    ctx.logs.push(r.log);
    if (!r.ok) return r;

    // TQL SHELL may return before /api/files reflects the removal — poll until
    // the directory is actually gone so downstream UI reads (pkgDetailUpdate)
    // see the truth, not the pre-rm snapshot.
    ctx.onProgress?.('verify rm');
    ctx.logs.push(`== verify /public/${ctx.appName} removed ==`);
    const removed = await waitForPkgRemoved(ctx.appName);
    ctx.logs.push(removed ? '(ok) directory removed' : '(fail) directory still present');

    if (!removed) {
        return {
            ok: false,
            log: r.log,
            reason: `rm reported success but /public/${ctx.appName} still exists`,
        };
    }
    return { ok: true, log: r.log };
}
