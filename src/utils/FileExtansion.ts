import { getId } from '.';

// Default contents of a new .wrk / .taz / .dsh file (New file). The name rule lives in src/utils/fileName.ts.
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
