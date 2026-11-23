import { runShell } from '../shell';
import { runScript } from '../script';
import { PANEL_PACKAGE_SCRIPT } from '../panelPackageScript';
import type { LifecycleContext, StepResult } from '../types';

export async function stepRunInstall(ctx: LifecycleContext): Promise<StepResult> {
    ctx.onProgress?.('run install');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(ctx.appName)) {
        return { ok: false, log: '', reason: 'Invalid package name.' };
    }
    if (ctx.extensionInstallApi && !/^\/work\/\.extension\/dashboard-panels\/\.staging\/[a-zA-Z0-9][a-zA-Z0-9._-]*\/neo-install-api\.js$/.test(ctx.extensionInstallApi)) {
        return { ok: false, log: '', reason: 'Invalid extension install API path.' };
    }
    const cmd = ctx.extensionInstallApi
        ? ctx.extensionInstallApi.replace(/neo-install-api\.js$/, 'run-install.js')
        : `pkg run -C /work/public/${ctx.appName} install`;
    ctx.logs.push(`== ${cmd} ==`);

    const r = await runShell(cmd);
    ctx.logs.push(r.log);
    if (r.ok && ctx.extensionInstallApi) {
        const job = ctx.extensionInstallApi.split('/').slice(-2)[0];
        const verified = await runScript(PANEL_PACKAGE_SCRIPT, { action: 'install-result', name: ctx.appName, job });
        ctx.logs.push(verified.log);
        return verified;
    }
    return r;
}
