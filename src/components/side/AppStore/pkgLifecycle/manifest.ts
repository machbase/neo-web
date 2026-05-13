// Reads /public/{appName}/package.json via the same api the file explorer uses.
// axios auto-parses JSON responses based on content-type, so the payload can
// be either an already-parsed object or a raw string.

import { getFileList } from '@/api/repository/api';
import type { PkgManifest } from './types';

export async function readManifest(appName: string): Promise<PkgManifest | null> {
    try {
        const res: any = await getFileList('', `/public/${appName}/`, 'package.json');
        const payload = res?.data ?? res;

        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            return payload as PkgManifest;
        }
        if (typeof payload === 'string' && payload.trim()) {
            return JSON.parse(payload);
        }
        return null;
    } catch {
        // 404, network, or malformed json — treat as "no manifest".
        return null;
    }
}

export function hasScript(manifest: PkgManifest | undefined, key: 'install' | 'uninstall' | 'start' | 'stop'): boolean {
    if (!manifest?.scripts) return false;
    return Object.prototype.hasOwnProperty.call(manifest.scripts, key);
}

// Reads /public/{appName}/package.json and returns manifest.version as the
// installed version. Empty string when manifest is missing, unreadable, or has
// no version field.
export async function getInstalledVersion(appName: string): Promise<string> {
    const m = await readManifest(appName);
    return typeof m?.version === 'string' ? m.version : '';
}

// Returns whether the package's lifecycle is managed by the controller (i.e.
// `start`/`stop`/`uninstall` scripts can run the service directly). Defaults to
// `true` when the `packageService` key is absent so legacy manifests keep
// working. Only an explicit `{ managed: false }` flips this off — used by the
// UI to surface ratio chips, errors, and the running-service uninstall guard
// for packages like replication / opcua-client that manage child services.
export function isPackageManaged(manifest?: PkgManifest | null): boolean {
    if (!manifest) return true;
    if (manifest.packageService === undefined) return true;
    return manifest.packageService.managed !== false;
}
