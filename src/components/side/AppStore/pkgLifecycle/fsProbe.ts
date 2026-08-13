// Filesystem-truth check for whether a package is currently installed.
// SHELL responses cannot be trusted for presence: we verify by listing
// /public/ via the same api the file explorer uses.

import { getFiles } from '@/api/repository/fileTree';

export async function isPkgInstalled(appName: string): Promise<boolean> {
    try {
        const res: any = await getFiles('/public/');
        const children: any[] = res?.data?.children ?? res?.children ?? [];
        return children.some((c: any) => c?.isDir && c?.name === appName);
    } catch {
        return false;
    }
}

// TQL SHELL can return before the command's filesystem side effects are
// observable via /api/files — so a single probe right after `pkg copy` or
// `rm -rf` may read stale state. Poll until the expected state is reached
// or the attempt budget runs out.
const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 300;

/**
 * Polling budget for the offline archive path (issue #1452), kept separate from
 * the `pkg copy` defaults above (30 × 300ms ≈ 9s).
 *
 * Extracting a local archive is a single synchronous unzip of a file that can be
 * tens of megabytes, and the whole tree is written before the final rename makes
 * the directory appear — so the observable state flips late and all at once,
 * unlike `pkg copy`'s incremental fetch. 60 × 500ms ≈ 30s.
 */
export const ARCHIVE_PROBE_ATTEMPTS = 60;
export const ARCHIVE_PROBE_DELAY_MS = 500;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function pollUntil(predicate: () => Promise<boolean>, attempts: number, delayMs: number): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
        if (await predicate()) return true;
        if (i < attempts - 1) await delay(delayMs);
    }
    return false;
}

export function waitForPkgInstalled(appName: string, opts: { attempts?: number; delayMs?: number } = {}): Promise<boolean> {
    const attempts = opts.attempts ?? DEFAULT_ATTEMPTS;
    const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
    return pollUntil(() => isPkgInstalled(appName), attempts, delayMs);
}

export function waitForPkgRemoved(appName: string, opts: { attempts?: number; delayMs?: number } = {}): Promise<boolean> {
    const attempts = opts.attempts ?? DEFAULT_ATTEMPTS;
    const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
    return pollUntil(async () => !(await isPkgInstalled(appName)), attempts, delayMs);
}
