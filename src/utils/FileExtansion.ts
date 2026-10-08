import { getId } from '.';

import { FileType, isTypingName, isTypingPath, validateName } from './fileName';

// Thin wrappers over src/utils/fileName.ts (the single name rule) for existing importers.
export { FileType };
export const FileNameAndExtensionValidator = (aTxt: string): boolean => validateName(aTxt, { kind: 'file' }).ok;
export const isAllowedFileNameInput = (aTxt: string): boolean => isTypingName(aTxt);
export const FileNameValidator = (aTxt: string): boolean => validateName(aTxt, { kind: 'folder' }).ok;
// input-time path check
export const PathRootValidator = (aTxt: string): boolean => isTypingPath(aTxt);

// WRK
export const FileWrkDfltVal = {
    data: [
        {
            contents: '',
            height: 200,
            id: getId(),
            lang: [
                ['markdown', 'Markdown'],
                ['SQL', 'SQL'],
                ['javascript', 'TQL'],
            ],
            minimal: false,
            result: '',
            status: true,
            type: 'mrk',
        },
    ],
};
// TAZ
export const FileTazDfltVal = { id: getId(), type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false };
// DSH
export const FileDshDfltVal = {
    id: getId(),
    type: 'new',
    name: 'new',
    path: '',
    code: '',
    panels: [],
    range_bgn: '',
    range_end: '',
    sheet: [],
    savedCode: false,
    shell: {
        icon: 'file-document-outline',
        theme: '',
        id: 'dsh',
    },
    dashboard: {
        timeRange: {
            start: 'now-3h',
            end: 'now',
            refresh: 'Off',
        },
        // distance (numeric base) range, kind-separated from timeRange. '' start/end = full [first, last].
        distanceRange: {
            start: '',
            end: '',
        },
        panels: [],
    },
};
