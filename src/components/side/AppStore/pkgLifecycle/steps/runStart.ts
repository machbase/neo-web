import { runShell } from '../shell';
import type { LifecycleContext, StepResult } from '../types';

export async function stepRunStart(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('run start');
    const cmd = `pkg run -C /work/public/${ctx.appName} start`;
    ctx.logs.push(`== ${cmd} ==`);

    const r = await runShell(cmd);
    ctx.logs.push(r.log);
    return r;
}
