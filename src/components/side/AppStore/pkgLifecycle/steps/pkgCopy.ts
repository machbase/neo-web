import { runShell } from '../shell';
import { waitForPkgInstalled } from '../fsProbe';
import type { LifecycleContext, StepResult } from '../types';

export async function stepPkgCopy(ctx: LifecycleContext, opts?: { force?: boolean }): Promise<StepResult> {
    ctx.onProgress?.(opts?.force ? 'pkg copy -f' : 'pkg copy');
    const force = opts?.force ? ' -f' : '';
    // Pin the checkout to the hub-advertised release tag instead of HEAD when
    // available. Falls back to HEAD when ctx.tag is empty (hub entry missing
    // `version`), so legacy hub rows keep working. The tag can be typed by the
    // user (experiment mode), so it travels as a shell argument, not as text.
    const tagSuffix = ctx.tag ? '@{tag}' : '';
    const cmd = `pkg copy${force} github.com/${ctx.fullName}${tagSuffix} /work/public/${ctx.appName}`;
    ctx.logs.push(`== ${ctx.tag ? cmd.replace('{tag}', ctx.tag) : cmd} ==`);

    const r = await runShell(cmd, ctx.tag ? { tag: ctx.tag } : undefined);
    ctx.logs.push(r.log);
    if (!r.ok) return r;

    // TQL SHELL can return before /api/files reflects the copy — poll until the
    // directory shows up so the post-install UI refresh reads the new state.
    ctx.onProgress?.('verify copy');
    ctx.logs.push(`== verify /public/${ctx.appName} ==`);
    const exists = await waitForPkgInstalled(ctx.appName);
    ctx.logs.push(exists ? '(ok) directory found' : '(fail) directory not found');

    if (!exists) {
        return {
            ok: false,
            log: r.log,
            reason: `pkg copy reported success but /public/${ctx.appName} is missing`,
        };
    }
    return { ok: true, log: r.log };
}
