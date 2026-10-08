/**
 * Encode a file path for the /api/files URL: each segment through encodeURIComponent, '/' kept,
 * a leading '/' guaranteed, a trailing '/' preserved and repeated slashes collapsed.
 * The server decodes percent escapes (including %2F), so this round-trips.
 */
export const encodeFilePath = (aPath: string): string => {
    const sRaw = (aPath ?? '').replace(/[\\/]+/g, '/');
    const sTrailing = sRaw.length > 1 && sRaw.endsWith('/');
    const sSegments = sRaw.split('/').filter((aSeg) => aSeg !== '');
    const sBody = sSegments.map((aSeg) => encodeURIComponent(aSeg)).join('/');
    if (!sBody) return '/';
    return '/' + sBody + (sTrailing ? '/' : '');
};

/**
 * Build a /api/files URL. The path is segment-encoded (see encodeFilePath); `aQuery` (e.g. `?filter=*.sql`,
 * `?recursive=true`) is appended as-is, because encoding it would turn '?' into %3F and make it part of the name.
 */
export const buildFilesUrl = (aPath: string, aQuery?: string): string => `/api/files${encodeFilePath(aPath)}${aQuery ?? ''}`;

/**
 * The one share-link rule (r13), used where a link is made (ShareModal, PanelHeader childBoard) and where it is
 * opened (/view DashboardView, public-dashboard DashboardView): a name or path whose last segment ends in `.dsh`
 * (any case) is kept as is, anything else gets `.dsh` appended. Links now carry the real file name (`d/X.DSH`,
 * `v1.2.dsh`); links made before carry the stem (`d/x`) and keep working. No `split('.')[0]` + lower-case `.dsh`
 * rebuild: that broke `X.DSH` (404 on case-sensitive servers) and cut `v1.2.dsh` to `v1`.
 */
export const toDshPath = (aNameOrPath: string): string => {
    const sLast = (aNameOrPath ?? '').split('/').at(-1) ?? '';
    const sDot = sLast.lastIndexOf('.');
    return sDot > 0 && sLast.slice(sDot + 1).toLowerCase() === 'dsh' ? aNameOrPath : aNameOrPath + '.dsh';
};
