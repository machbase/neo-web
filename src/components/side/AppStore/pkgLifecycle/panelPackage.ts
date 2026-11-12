import { generateUUID } from '@/utils';
import { PANEL_EXTENSIONS_CHANGED, PANEL_PACKAGE_ROOT, PANEL_PACKAGE_SCRIPT } from './panelPackageScript';
import { runScript } from './script';
import { runShell } from './shell';
import { stepArchiveExtract } from './steps/archiveExtract';
import { stepPkgCopy } from './steps/pkgCopy';
import type { CopyPreparedPackage, LifecycleContext, StepResult } from './types';

export { PANEL_EXTENSIONS_CHANGED } from './panelPackageScript';
export type DeploymentMode = 'install' | 'update';

export interface PendingPanelPackage {
    job: string;
    tag: string;
    source: 'hub' | 'local';
    mode: DeploymentMode;
    fullName: string;
    restartAfterCopy?: boolean;
    phase?: 'prepared' | 'applying' | 'body-ready';
}

function readResult<T>(result: StepResult): T {
    if (!result.ok) throw new Error(result.reason);
    return JSON.parse(result.log) as T;
}

export async function listPendingPanelPackages() {
    const result = await runScript(PANEL_PACKAGE_SCRIPT, { action: 'list-pending' });
    return readResult<{ name: string; target: PendingPanelPackage }[]>(result);
}

export async function removePanelPackage(ctx: LifecycleContext) {
    const result = await runScript(PANEL_PACKAGE_SCRIPT, { action: 'remove', name: ctx.appName });
    ctx.logs.push(result.log);
    window.dispatchEvent(new Event(PANEL_EXTENSIONS_CHANGED));
    return result;
}

export async function deployPanelPackage(
    ctx: LifecycleContext,
    mode: DeploymentMode,
    run: (ctx: LifecycleContext, mode: DeploymentMode, copy: CopyPreparedPackage, restartAfterRetry: boolean) => Promise<StepResult>,
    retry?: PendingPanelPackage
): Promise<StepResult> {
    const existing = readResult<PendingPanelPackage | null>(
        await runScript(PANEL_PACKAGE_SCRIPT, { action: 'pending', name: ctx.appName })
    );
    const source = ctx.source ?? 'hub';
    const tag = ctx.tag ?? '';
    const target: PendingPanelPackage = existing ?? { job: generateUUID(), tag, source, mode, fullName: ctx.fullName };
    if (retry ? existing?.job !== retry.job : existing && (existing.tag !== tag || existing.source !== source || existing.fullName !== ctx.fullName)) {
        return { ok: false, log: '', reason: 'Retry the incomplete package deployment first.' };
    }
    const params = { name: ctx.appName, job: target.job, tag: target.tag, source: target.source, mode: target.mode, fullName: target.fullName };
    const step = async (action: string, restartAfterCopy = false) => {
        const result = await runScript(PANEL_PACKAGE_SCRIPT, { ...params, action, restartAfterCopy: restartAfterCopy ? '1' : '0' });
        ctx.logs.push(result.log);
        return result;
    };

    try {
        if (!existing) {
            ctx.onProgress?.('stage package');
            const stageAt = `${PANEL_PACKAGE_ROOT}/.staging/${target.job}/body`;
            let staged: StepResult;
            if (source === 'local') {
                staged = await stepArchiveExtract(ctx, { stageAt });
            } else {
                if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(ctx.fullName) || (tag && !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(tag))) {
                    return { ok: false, log: '', reason: 'Invalid package repository or version.' };
                }
                const repo = `github.com/${ctx.fullName}${tag ? '@' + tag : ''}`;
                staged = await runShell(`pkg copy ${repo} ${stageAt}`);
                ctx.logs.push(staged.log);
            }
            if (!staged.ok) return staged;
            const prepared = await step('prepare');
            if (!prepared.ok) return prepared;
        }

        if (existing?.phase !== 'body-ready') {
            const bodyContext = {
                ...ctx,
                extensionInstallApi: `${PANEL_PACKAGE_ROOT}/.staging/${target.job}/neo-install-api.js`,
                source: target.source,
                tag: target.tag,
                fullName: target.fullName,
            };
            const result = await run(bodyContext, target.mode, async (restartAfterCopy) => {
                const marked = await step('copy', restartAfterCopy);
                if (!marked.ok) return marked;
                window.dispatchEvent(new Event(PANEL_EXTENSIONS_CHANGED));
                const force = target.mode === 'update' || Boolean(existing && existing.phase !== 'prepared');
                const installBody = target.source === 'local' ? stepArchiveExtract : stepPkgCopy;
                return force ? installBody(bodyContext, { force: true }) : installBody(bodyContext);
            }, existing?.restartAfterCopy ?? false);
            if (!result.ok) return result;
            const ready = await step('body-ready');
            if (!ready.ok) return ready;
        }
        ctx.onProgress?.('register dashboard panels');
        const finished = await step('finish');
        return { ...finished, log: ctx.logs.join('\n') };
    } finally {
        // A pending deployment owns its staged bytes until it is finished or removed.
        if (!existing) await step('cleanup');
        window.dispatchEvent(new Event(PANEL_EXTENSIONS_CHANGED));
    }
}
