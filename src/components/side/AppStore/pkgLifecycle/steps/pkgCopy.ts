import { runShell } from '../shell';
import { waitForPkgPopulated } from '../fsProbe';
import { deleteFile } from '@/api/repository/fileTree';
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
    // package's files show up so the post-install UI refresh reads the new state.
    // A directory alone is not enough: a copy that fetched nothing still answers
    // success and leaves /public/<name> empty (issue #1570 F-152).
    ctx.onProgress?.('verify copy');
    ctx.logs.push(`== verify /public/${ctx.appName} ==`);
    const populated = await waitForPkgPopulated(ctx.appName);
    ctx.logs.push(populated ? '(ok) package files found' : '(fail) no package files');

    if (!populated) {
        // Plain install only: the empty directory is all the failed copy left,
        // and keeping it would make the card read "installed". Not recursive, so
        // it can only ever remove an empty directory.
        if (!opts?.force) await deleteFile('public', ctx.appName).catch(() => undefined);
        return {
            ok: false,
            log: r.log,
            reason: `pkg copy could not download github.com/${ctx.fullName}${ctx.tag ? '@' + ctx.tag : ''} — /public/${ctx.appName} has no files`,
        };
    }
    return { ok: true, log: r.log };
}
