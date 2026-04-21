export const JSON_COLUMN_TYPE = 61;

export const isJsonTypeColumn = (aType: number) => aType === JSON_COLUMN_TYPE;

export const normalizeJsonPath = (aPath: string) => {
    return String(aPath ?? '')
        .trim()
        .replace(/^\$\./, '')
        .replace(/^\$/, '')
        .replace(/^\./, '');
};

export const formatJsonValueField = (aColumn: string, aPath: string) => {
    const sPath = normalizeJsonPath(aPath);
    return sPath ? `${aColumn}->$${sPath}` : aColumn;
};

export const parseJsonValueField = (aValue: string): { column: string; path: string } | null => {
    const sValue = String(aValue ?? '').trim();
    const sMatch = sValue.match(/^(.+?)->(\$\.?.+)$/);
    if (!sMatch) return null;

    const sColumn = sMatch[1].trim();
    const sPath = normalizeJsonPath(sMatch[2]);
    if (!sColumn || !sPath) return null;

    return { column: sColumn, path: sPath };
};

export const normalizeJsonValueField = (aValue: string) => {
    const sParsed = parseJsonValueField(aValue);
    if (!sParsed) return aValue;
    return formatJsonValueField(sParsed.column, sParsed.path);
};

export const jsonValueFieldToSql = (aValue: string, aJsonKey?: string) => {
    const sParsed = parseJsonValueField(aValue);
    const sColumn = sParsed?.column ?? aValue;
    const sPath = normalizeJsonPath(aJsonKey || sParsed?.path || '');
    if (!sColumn || !sPath) return sColumn;

    return `${sColumn}->'$.${sPath.replace(/'/g, "''")}'`;
};

const getJsonValueFieldParts = (aValue: string, aJsonKey?: string) => {
    const sParsed = parseJsonValueField(aValue);
    const sColumn = sParsed?.column ?? aValue;
    const sPath = normalizeJsonPath(aJsonKey || sParsed?.path || '');
    return { column: sColumn, path: sPath };
};

const jsonExtractIntegerToSql = (aValue: string, aJsonKey?: string) => {
    const { column, path } = getJsonValueFieldParts(aValue, aJsonKey);
    if (!column || !path) return column;
    return `JSON_EXTRACT_INTEGER(${column}, '$.${path.replace(/'/g, "''")}')`;
};

export const toSqlValueExpression = (aValue: string, aJsonKey?: string) => jsonValueFieldToSql(aValue, aJsonKey);

export const hasJsonPathSelection = (aValue: string, aJsonKey?: string) => Boolean(normalizeJsonPath(aJsonKey || parseJsonValueField(aValue)?.path || ''));

export const toSqlTimeExpression = (aTime: string, aTimeJsonKey?: string, aTimeJsonType?: string) => {
    const sJsonTime = jsonValueFieldToSql(aTime, aTimeJsonKey);
    if (!hasJsonPathSelection(aTime, aTimeJsonKey)) return sJsonTime;

    const sJsonTimestamp = jsonExtractIntegerToSql(aTime, aTimeJsonKey);
    switch (aTimeJsonType) {
        case 'datetime':
            return `TO_DATE_SAFE(${sJsonTime})`;
        case 'timestamp_sec':
            return `FROM_TIMESTAMP(${sJsonTimestamp} * 1000000000)`;
        case 'timestamp_ms':
            return `FROM_TIMESTAMP(${sJsonTimestamp} * 1000000)`;
        case 'timestamp_us':
            return `FROM_TIMESTAMP(${sJsonTimestamp} * 1000)`;
        case 'timestamp_ns':
            return `FROM_TIMESTAMP(${sJsonTimestamp})`;
        default:
            return `NVL(TO_DATE_SAFE(${sJsonTime}), FROM_TIMESTAMP(${sJsonTimestamp}))`;
    }
};

export const toSqlTimeWhereExpression = (aTime: string, aStart: string | number, aEnd: string | number, aTimeJsonKey?: string, aTimeJsonType?: string) => {
    const sTime = toSqlTimeExpression(aTime, aTimeJsonKey, aTimeJsonType);
    if (hasJsonPathSelection(aTime, aTimeJsonKey)) return `${sTime} BETWEEN FROM_TIMESTAMP(${aStart}000000) AND FROM_TIMESTAMP(${aEnd}000000)`;
    return `${sTime} BETWEEN ${aStart}000000 AND ${aEnd}000000`;
};

export const jsonValueFieldToNumericSql = (aValue: string, aJsonKey?: string) => {
    const sSqlValue = jsonValueFieldToSql(aValue, aJsonKey);
    if (sSqlValue === aValue) return aValue;
    return `TO_NUMBER_SAFE(${sSqlValue})`;
};

const JSON_NUMERIC_AGGREGATOR_LIST = ['sum', 'min', 'max', 'avg', 'sumsq', 'stddev', 'stddev_pop', 'stddev (pop)', 'variance', 'var_pop', 'variance (pop)'];

export const toSqlValueExpressionForAggregator = (aValue: string, aAggregator: string, aJsonKey?: string) => {
    const sAggregator = String(aAggregator ?? '').toLowerCase();
    if (JSON_NUMERIC_AGGREGATOR_LIST.includes(sAggregator)) return jsonValueFieldToNumericSql(aValue, aJsonKey);
    return toSqlValueExpression(aValue, aJsonKey);
};

const parseSample = (aSample: any) => {
    const sSample = Array.isArray(aSample) && aSample.length === 1 ? aSample[0] : aSample;
    if (typeof sSample !== 'string') return sSample;

    try {
        return JSON.parse(sSample);
    } catch {
        return undefined;
    }
};

const getJsonPathValue = (aValue: any, aPath: string) => {
    const sPath = normalizeJsonPath(aPath);
    if (!sPath) return undefined;

    return sPath
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter(Boolean)
        .reduce((aCurrent: any, aKey: string) => {
            if (aCurrent === undefined || aCurrent === null) return undefined;
            return aCurrent[aKey];
        }, aValue);
};

const inferTimestampUnit = (aValue: number) => {
    const sAbsValue = Math.abs(aValue);
    if (sAbsValue >= 100000000000000000) return 'timestamp_ns';
    if (sAbsValue >= 100000000000000) return 'timestamp_us';
    if (sAbsValue >= 100000000000) return 'timestamp_ms';
    return 'timestamp_sec';
};

export const inferJsonTimeTypeFromSamples = (aSamples: any[], aPath: string) => {
    for (const aSample of aSamples) {
        const sParsedSample = parseSample(aSample);
        const sValue = getJsonPathValue(sParsedSample, aPath);
        if (sValue === undefined || sValue === null || typeof sValue === 'object' || typeof sValue === 'boolean') continue;

        if (typeof sValue === 'number' && Number.isFinite(sValue)) return inferTimestampUnit(sValue);
        if (typeof sValue === 'string') {
            const sTrimmedValue = sValue.trim();
            if (/^-?\d+$/.test(sTrimmedValue)) return inferTimestampUnit(Number(sTrimmedValue));
            if (!Number.isNaN(Date.parse(sTrimmedValue))) return 'datetime';
        }
    }

    return '';
};

export const extractJsonPathsFromSamples = (aSamples: any[]) => {
    const sPaths: string[] = [];
    const sSeen = new Set<string>();
    const addPath = (aPath: string) => {
        if (!aPath || sSeen.has(aPath)) return;
        sSeen.add(aPath);
        sPaths.push(aPath);
    };
    const walk = (aValue: any, aPrefix = '') => {
        if (Array.isArray(aValue)) {
            aValue.forEach((aItem, aIdx) => {
                const sPath = `${aPrefix}[${aIdx}]`;
                addPath(sPath);
                walk(aItem, sPath);
            });
            return;
        }
        if (!aValue || typeof aValue !== 'object') return;

        Object.keys(aValue).forEach((aKey) => {
            const sPath = aPrefix ? `${aPrefix}.${aKey}` : aKey;
            addPath(sPath);
            walk(aValue[aKey], sPath);
        });
    };

    aSamples.forEach((aSample) => {
        const sParsedSample = parseSample(aSample);
        if (sParsedSample !== undefined) walk(sParsedSample);
    });

    return sPaths;
};
