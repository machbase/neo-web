import { runShell } from '../shell';
import type { LifecycleContext, StepResult } from '../types';

export async function stepRunInstall(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('run install');
    const cmd = `pkg run -C public/${ctx.appName} install`;
    ctx.logs.push(`== ${cmd} ==`);

    const r = await runShell(cmd);
    ctx.logs.push(r.log);
    return r;
}
