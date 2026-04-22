import { runShell } from '../shell';
import type { LifecycleContext, StepResult } from '../types';

export async function stepRunStop(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('run stop');
    const cmd = `pkg run -C public/${ctx.appName} stop`;
    ctx.logs.push(`== ${cmd} ==`);

    const r = await runShell(cmd);
    ctx.logs.push(r.log);
    return r;
}
