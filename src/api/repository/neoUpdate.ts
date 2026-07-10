import { comparePkgVersions } from '@/utils/version/utils';

export const NEO_UPDATE_URL = 'https://update.machbase.com/neo';
export const NEO_UPDATE_CHECK_INTERVAL_MS = 1000 * 60 * 60 * 8;
export const NEO_RELEASES_URL = 'https://docs.machbase.com/neo/releases/';

export type NeoUpdateState = 'idle' | 'checking' | 'latest' | 'update-available' | 'error';

export interface NeoUpdateStatus {
    state: NeoUpdateState;
    currentVersion?: string;
    latestVersion?: string;
    checkedAt?: number;
    error?: string;
}

export const normalizeNeoVersion = (version: string | null | undefined): string | null => {
    if (!version) return null;
    const trimmed = String(version).trim();
    if (!trimmed) return null;
    const normalized = trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed : `v${trimmed}`;
    return /^v\d+\.\d+\.\d+$/.test(normalized) ? normalized : null;
};

export const buildNeoUpdateStatus = (currentVersion: string, latestVersion: string, checkedAt: number = Date.now()): NeoUpdateStatus => {
    const current = normalizeNeoVersion(currentVersion);
    const latest = normalizeNeoVersion(latestVersion);

    if (!current) {
        return { state: 'idle', checkedAt };
    }

    if (!latest) {
        return { state: 'error', currentVersion: current, checkedAt, error: 'Invalid latest version' };
    }

    const compareResult = comparePkgVersions(current, latest);
    return {
        state: compareResult === -1 ? 'update-available' : 'latest',
        currentVersion: current,
        latestVersion: latest,
        checkedAt,
    };
};

export const fetchLatestNeoVersion = async (currentVersion: string): Promise<string> => {
    const current = normalizeNeoVersion(currentVersion);
    if (!current) throw new Error('Invalid current version');

    const response = await fetch(`${NEO_UPDATE_URL}/${current}`);
    if (!response.ok) throw new Error(`Failed to fetch latest Neo version: ${response.status}`);

    const data = await response.json();
    const latest = normalizeNeoVersion(data?.latest);
    if (!latest) throw new Error('Invalid latest version');

    return latest;
};
