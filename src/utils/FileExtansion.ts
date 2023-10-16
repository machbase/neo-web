import { getId } from '.';

export const FileType = [
    'sql',
    'tql',
    'json',
    'csv',
    'md',
    'txt',
    'wrk',
    'taz',
    // 'dsh',
];

export const FileTypeValidator = (aTxt: string): boolean => {
    const FileRegExp = new RegExp(`^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]+.{1}(${FileType.join('|')})$`, 'gm');
    return FileRegExp.test(aTxt);
};
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
