import { runShell } from '../shell';
import type { LifecycleContext, StepResult } from '../types';

export async function stepRunUninstall(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('run uninstall');
    const cmd = `pkg run -C public/${ctx.appName} uninstall`;
    ctx.logs.push(`== ${cmd} ==`);

    const r = await runShell(cmd);
    ctx.logs.push(r.log);
    return r;
}
