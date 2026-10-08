import { loadTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';

export const TEXT_OPEN_EXTENSIONS = ['sql', 'tql', 'json', 'csv', 'md', 'txt'];

/** Every extension "Open a file" can open — the file picker `accept` is built from this so it never greys out a supported file. */
export const OPENABLE_EXTENSIONS = ['wrk', 'taz', 'dsh', ...TEXT_OPEN_EXTENSIONS];
export const OPEN_FILE_ACCEPT = OPENABLE_EXTENSIONS.map((aExt) => '.' + aExt).join(',');

/**
 * Required-key check shared by the New tab ("Open a file") and the file explorer (loadBoardFromFile),
 * so both refuse the same broken boards. Returns an error message, or null when the shape is valid.
 */
export const validateBoardContent = (aExt: string, aParsed: unknown): string | null => {
    if (aExt === 'dsh') {
        const sDashboard = (aParsed as any)?.dashboard;
        if (!sDashboard || typeof sDashboard !== 'object' || Array.isArray(sDashboard)) return 'Not a dashboard file: "dashboard" is missing.';
        return null;
    }
    if (aExt === 'wrk') {
        if (!Array.isArray((aParsed as any)?.data)) return 'Not a worksheet file: "data" is missing.';
        return null;
    }
    return null;
};

export type OpenedFileResult =
    | { ok: true; mode: 'replace'; board: Record<string, any> }
    | { ok: true; mode: 'merge'; fields: Record<string, any> }
    | { ok: false; error: string };

const parseJson = (aText: string): { value: any } | { error: string } => {
    try {
        return { value: JSON.parse(aText) };
    } catch (aError) {
        return { error: aError instanceof Error ? `Invalid file: ${aError.message}` : 'Invalid file.' };
    }
};

/**
 * Turn a locally opened file into tab content. Never throws.
 * - dsh/taz: a whole board that REPLACES the current tab (merging would keep the old tab's code/sheet).
 *   path stays '' so the first save goes through Save as instead of silently overwriting a server file.
 * - wrk/text: fields merged into the current tab.
 */
export const parseOpenedFile = (aExt: string, aText: string, aFileName: string, aId: string): OpenedFileResult => {
    if (TEXT_OPEN_EXTENSIONS.includes(aExt)) return { ok: true, mode: 'merge', fields: { name: aFileName, code: aText, type: aExt } };
    if (aExt !== 'dsh' && aExt !== 'taz' && aExt !== 'wrk') return { ok: false, error: `Cannot open .${aExt} files here.` };

    const sParsed = parseJson(aText);
    if ('error' in sParsed) return { ok: false, error: sParsed.error };

    if (aExt === 'taz') {
        try {
            return { ok: true, mode: 'replace', board: loadTazBoard(sParsed.value, aId, aFileName, '') as any };
        } catch (aError) {
            return { ok: false, error: aError instanceof Error ? aError.message : 'Failed to load TAZ file.' };
        }
    }

    const sShapeError = validateBoardContent(aExt, sParsed.value);
    if (sShapeError) return { ok: false, error: sShapeError };

    if (aExt === 'dsh') return { ok: true, mode: 'replace', board: { ...sParsed.value, id: aId, name: aFileName, type: 'dsh', path: '' } };
    return { ok: true, mode: 'merge', fields: { name: aFileName, sheet: sParsed.value.data, type: 'wrk' } };
};
