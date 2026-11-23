/** Normalize extension host paths without allowing a parent-directory segment. */
export function normalizeHostPath(path: string): string {
    const segments = path.split('/').filter((part) => part && part !== '.');
    if (segments.some((part) => part.split('\\').includes('..'))) throw new Error('Parent path segments are not supported.');
    return segments.join('/');
}

/** Encode the name of each repository entry while retaining directory separators. */
export function encodeHostPath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
}

/** Keep literal backslashes in repository names while joining directory separators. */
export function repositoryFileUrl(path: string): string {
    return '/api/files' + encodeHostPath(('/' + path).replace(/[/]+/g, '/'));
}

/** Public dashboard links include the complete filename, including its original extension. */
export function getPublicDashboardPath(path: string): string {
    return '/web/ui/board/' + encodeHostPath(path.split('/').filter(Boolean).join('/')) + '?exact=1';
}
