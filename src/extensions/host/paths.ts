/** Normalize extension host paths without allowing a parent-directory segment. */
export function normalizeHostPath(path: string): string {
    const segments = path.replace(/\\/g, '/').split('/').filter((part) => part && part !== '.');
    if (segments.includes('..')) throw new Error('Parent path segments are not supported.');
    return segments.join('/');
}
