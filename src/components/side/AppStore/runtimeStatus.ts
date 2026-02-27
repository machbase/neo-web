import type { APP_INFO } from '@/api/repository/appStore';

export type RuntimeStatus = 'running' | 'stopped' | 'frontend-only';

export const extractStatusTargets = (apps: APP_INFO[]): string[] => {
    return apps.filter((app) => !!app?.name && app?.installed_backend).map((app) => app.name);
};

export const extractFrontendOnlyTargets = (apps: APP_INFO[]): string[] => {
    return apps.filter((app) => !!app?.name && !app?.installed_backend).map((app) => app.name);
};

export const normalizeRuntimeStatus = (status?: string): RuntimeStatus => {
    if (!status) return 'stopped';
    const normalized = status.toLowerCase();
    return normalized === 'running' ? 'running' : 'stopped';
};
