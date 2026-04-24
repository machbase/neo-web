import { formatJsonValueField, normalizeJsonPath, parseJsonValueField } from './dashboardJsonValue';

export const ROLLUP_EXT_TYPE_BY_COLUMN = '__EXT_TYPE_BY_COLUMN';

export type RollupColumnMatch = {
    columnName: string;
    intervalIndex: number;
    rollupTime: number;
    extType: number;
};

export const getRollupColumnNameCandidates = (aValue: string, aJsonKey?: string) => {
    const sValue = String(aValue ?? '').trim();
    const sParsedValue = parseJsonValueField(sValue);
    const sBaseColumn = sParsedValue?.column ?? sValue;
    const sJsonPath = normalizeJsonPath(aJsonKey || sParsedValue?.path || '');
    const sCandidates = [];

    if (sBaseColumn && sJsonPath) sCandidates.push(formatJsonValueField(sBaseColumn, sJsonPath));
    sCandidates.push(sValue, sBaseColumn);

    return Array.from(new Set(sCandidates.filter(Boolean)));
};

export const findRollupColumnMatch = (aTableRollups: any, aCandidates: string[], aInterval: number): RollupColumnMatch | undefined => {
    if (!aTableRollups || !aInterval || aInterval <= 0) return undefined;

    for (const sCandidate of aCandidates) {
        const sRollupTimes = aTableRollups[sCandidate];
        if (!Array.isArray(sRollupTimes)) continue;

        const sIntervalIndex = sRollupTimes.findIndex((aRollupTime: any) => {
            const sRollupTime = Number(aRollupTime);
            return sRollupTime > 0 && aInterval % sRollupTime === 0;
        });

        if (sIntervalIndex >= 0) {
            const sExtTypeList = aTableRollups?.[ROLLUP_EXT_TYPE_BY_COLUMN]?.[sCandidate] ?? aTableRollups?.EXT_TYPE;
            return {
                columnName: sCandidate,
                intervalIndex: sIntervalIndex,
                rollupTime: Number(sRollupTimes[sIntervalIndex]),
                extType: Number(sExtTypeList?.[sIntervalIndex] ?? 0),
            };
        }
    }

    return undefined;
};

export const getBaseJsonRollupValue = (aValue: string, aJsonKey: string | undefined, aMatch?: RollupColumnMatch) => {
    const sValue = String(aValue ?? '').trim();
    const sParsedValue = parseJsonValueField(sValue);
    const sBaseColumn = sParsedValue?.column ?? sValue;
    const sJsonPath = normalizeJsonPath(aJsonKey || sParsedValue?.path || '');

    if (!aMatch || !sBaseColumn || !sJsonPath || aMatch.columnName !== sBaseColumn) return undefined;

    return {
        column: sBaseColumn,
        path: sJsonPath,
    };
};
