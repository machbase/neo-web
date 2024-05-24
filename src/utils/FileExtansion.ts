import { getId } from '.';

export const FileType = ['sql', 'tql', 'json', 'csv', 'md', 'txt', 'wrk', 'taz', 'dsh', 'html', 'css', 'js'];
// validator file name n extension
export const FileNameAndExtensionValidator = (aTxt: string): boolean => {
    const FileRegExp = new RegExp(`^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9_-\\s]+\\.{1}(${FileType.join('|')}){1}$`, 'gm');
    return FileRegExp.test(aTxt);
};
// validator file name
export const FileNameValidator = (aTxt: string): boolean => {
    const FileRegExp = new RegExp(`^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9\\-\\_\\(\\)\\s]*$`, 'gm');
    return FileRegExp.test(aTxt);
};
// validator path root '/'
export const PathRootValidator = (aTxt: string): boolean => {
    if (aTxt.includes('..') || aTxt.includes('./') || aTxt.includes('/.')) return false;
    const DoubleSlash = new RegExp(`//`, 'gm');
    const BaseRegExp = new RegExp(`^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]*`, 'gm');
    const FileRegExp = aTxt.split('/').every((aItem) => {
        if (aItem.includes('.')) return BaseRegExp.test(aItem.split('.')[1]);
        else return FileNameValidator(aItem);
    });
    return FileRegExp && !DoubleSlash.test(aTxt);
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
        panels: [],
    },
};
