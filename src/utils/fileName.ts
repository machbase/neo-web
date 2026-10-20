/**
 * The one place that decides whether a file/folder name is acceptable, and the one place that turns a
 * download/clone URL into a name. Callers pass the raw name and use the verdict — no lower-casing,
 * trimming, extension comparison or segment splitting on the caller side.
 */

export const FileType = ['sql', 'tql', 'json', 'csv', 'md', 'txt', 'wrk', 'taz', 'dsh', 'html', 'css', 'js'];

// Extensions the server stores as a FILE on POST /api/files (measured in a sandbox 2026-10-07, case-insensitive; the
// same 29 as the server's contentTypeOfFile). Any other extension (pdf, yaml, zip, tif, ...) makes the server create a
// DIRECTORY of that name instead. URL download accepts these; New file / Save As keep FileType (what the app can open
// in an editor tab).
export const SERVER_FILE_EXTENSIONS: readonly string[] = [
    'sql', 'tql', 'taz', 'wrk', 'dsh', 'json', 'csv', 'md', 'markdown', 'txt', 'html', 'htm', 'css', 'js', 'mjs',
    'png', 'apng', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'bmp', 'ico', 'tiff', 'sh', 'py', 'ipynb',
];

// Raster images among SERVER_FILE_EXTENSIONS: their bytes are binary, so a download reads them as an ArrayBuffer and
// the upload POST goes out as application/octet-stream (svg is text and is not in this list).
export const RASTER_IMAGE_EXTENSIONS: readonly string[] = ['png', 'apng', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'tiff'];

// One character set for every name check: the union of the two validators it replaces (they differed only in
// the parentheses). '-' is literal (escaped). Whitespace is `\s` minus the line terminators (\n \r U+2028 U+2029):
// tab, NBSP, U+3000 (IME full-width space) etc. stay allowed as before; a name is never multi-line.
// No 'g'/'m' flags: a global regex keeps lastIndex between .test() calls, and 'm' lets '^…$' match a single line
// of a multi-line name.
const LINE_TERMINATORS = '\\n\\r\\u2028\\u2029';
export const NAME_CHARS = 'ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9_\\-\\(\\)\\s\\.';
const NameCharsRegExp = new RegExp(`^(?:(?![${LINE_TERMINATORS}])[${NAME_CHARS}])*$`);
const LineTerminatorRegExp = new RegExp(`[${LINE_TERMINATORS}]`);

export type NameKind = 'file' | 'folder';
export type NameVerdict = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): NameVerdict => ({ ok: false, reason });

export type NameOpts = { kind: NameKind; type?: string; extensions?: readonly string[] };

/**
 * Final check of a single name (no '/'). File extensions are compared case-insensitively, here only, against
 * `extensions` (default FileType — the editor types; URL download passes SERVER_FILE_EXTENSIONS).
 */
export const validateName = (aName: string, aOpts: NameOpts): NameVerdict => {
    if (typeof aName !== 'string' || aName.trim().length === 0) return fail('Name is empty.');
    if (LineTerminatorRegExp.test(aName)) return fail('Name must be a single line.');
    if (aName.startsWith('.')) return fail(`'${aName}' must not start with '.'.`);
    if (!NameCharsRegExp.test(aName)) return fail(`'${aName}' contains characters that are not allowed.`);
    if (aOpts.kind === 'file') {
        const sDot = aName.lastIndexOf('.');
        if (sDot < 0) return fail(`'${aName}' needs a file extension.`);
        const sBase = aName.slice(0, sDot);
        const sExt = aName.slice(sDot + 1).toLowerCase();
        if (sBase.trim().length === 0) return fail(`'${aName}' has no name before the extension.`);
        if (!(aOpts.extensions ?? FileType).includes(sExt)) return fail(`'.${aName.slice(sDot + 1)}' is not a supported file type.`);
        if (aOpts.type && sExt !== aOpts.type.toLowerCase()) return fail(`The file name must end with '.${aOpts.type}'.`);
    }
    return { ok: true };
};

/** Final check of a path: every non-empty segment is a folder name, the last one is `kind`. */
export const validatePath = (aPath: string, aOpts: NameOpts): NameVerdict => {
    if (typeof aPath !== 'string') return fail('Path is empty.');
    if (aPath.includes('//')) return fail(`'${aPath}' contains an empty folder name.`);
    const sSegments = aPath.split('/').filter((aSeg) => aSeg !== '');
    if (sSegments.some((aSeg) => aSeg === '..' || aSeg === '.')) return fail(`'${aPath}' must not contain '.' or '..'.`);
    if (sSegments.length === 0) return fail('Path is empty.');
    for (let i = 0; i < sSegments.length; i++) {
        const sLast = i === sSegments.length - 1;
        const sVerdict = validateName(sSegments[i], sLast ? aOpts : { kind: 'folder' });
        if (!sVerdict.ok) return sVerdict;
    }
    return { ok: true };
};

/** While typing a single name: empty is fine; otherwise the same character set, no leading '.', single line. */
export const isTypingName = (aPartial: string): boolean => {
    if (typeof aPartial !== 'string') return false;
    if (aPartial.startsWith('.')) return false;
    return NameCharsRegExp.test(aPartial);
};

/** While typing a path: '' and a trailing '/' are fine; it starts with '/', no '//' and no '..' segment. */
export const isTypingPath = (aPartial: string): boolean => {
    if (typeof aPartial !== 'string') return false;
    if (aPartial === '') return true;
    if (!aPartial.startsWith('/')) return false;
    if (aPartial.includes('//')) return false;
    return aPartial.split('/').every((aSeg) => aSeg !== '..' && isTypingName(aSeg));
};

export type NameFromUrl = { ok: true; name: string } | { ok: false; reason: string };

/**
 * Name from a download (`kind:'file'`) or clone (`kind:'repo'`) URL: the last path segment, percent-decoded
 * once (raw segment kept when not valid percent-encoding). Query and fragment never enter the name. scp-style
 * SSH addresses (`git@host:org/repo.git`) are not WHATWG URLs and fall back to a string split on '/' or ':'.
 * 'repo' strips a trailing '.git' and is checked with the folder rule; 'file' with the file rule.
 */
export const nameFromUrl = (aUrl: string, aOpts: { kind: 'file' | 'repo'; extensions?: readonly string[] }): NameFromUrl => {
    const sDecodeOnce = (aSeg: string) => {
        try {
            return decodeURIComponent(aSeg);
        } catch {
            return aSeg;
        }
    };
    let sSegment: string;
    try {
        const sPath = new URL(aUrl).pathname.replace(/\/+$/, '');
        sSegment = sPath.slice(sPath.lastIndexOf('/') + 1);
    } catch {
        const sRaw = (aUrl ?? '').split(/[?#]/)[0].replace(/\/+$/, '');
        sSegment = sRaw.slice(Math.max(sRaw.lastIndexOf('/'), sRaw.lastIndexOf(':')) + 1);
    }
    let sName = sDecodeOnce(sSegment);
    if (aOpts.kind === 'repo' && sName.endsWith('.git')) sName = sName.slice(0, -4);
    const sVerdict = aOpts.kind === 'repo' ? validateName(sName, { kind: 'folder' }) : validateName(sName, { kind: 'file', extensions: aOpts.extensions });
    if (!sVerdict.ok) return { ok: false, reason: `Invalid ${aOpts.kind === 'repo' ? 'folder' : 'file'} name '${sName}' from the url. ${sVerdict.reason}` };
    return { ok: true, name: sName };
};
