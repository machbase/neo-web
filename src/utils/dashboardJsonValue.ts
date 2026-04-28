export const JSON_COLUMN_TYPE = 61;

export const isJsonTypeColumn = (aType: number) => aType === JSON_COLUMN_TYPE;

const stripJsonRoot = (aPath: string) => {
    let sPath = String(aPath ?? '').trim();
    if (sPath.startsWith('$')) sPath = sPath.slice(1);
    if (sPath.startsWith('.')) sPath = sPath.slice(1);
    return sPath;
};

const pathSegment = (aSegment: string) => {
    const sSegment = String(aSegment ?? '').trim();
    return sSegment ? `[${sSegment}]` : '';
};

const legacyPathToBracketPath = (aPath: string) => {
    return String(aPath ?? '')
        .split('.')
        .flatMap((aPart) => {
            const sPart = aPart.trim();
            if (!sPart) return [];

            const sBracketStart = sPart.indexOf('[');
            if (sBracketStart < 0) return [sPart];

            const sSegments: string[] = [];
            const sHead = sPart.slice(0, sBracketStart).trim();
            if (sHead) sSegments.push(sHead);

            const sBracketText = sPart.slice(sBracketStart);
            const sBracketMatches = [...sBracketText.matchAll(/\[([^\]]+)\]/g)].map((aMatch) => aMatch[1].trim()).filter(Boolean);
            sSegments.push(...sBracketMatches);

            return sSegments.length ? sSegments : [sPart];
        })
        .map(pathSegment)
        .join('');
};

const normalizeBracketPath = (aPath: string) => {
    const sPath = String(aPath ?? '').trim();
    const sSegments = [...sPath.matchAll(/\[([^\]]+)\]/g)].map((aMatch) => aMatch[1].trim()).filter(Boolean);
    return sSegments.map(pathSegment).join('');
};

const bracketPathSegments = (aPath: string) => {
    return [...normalizeJsonPath(aPath).matchAll(/\[([^\]]+)\]/g)].map((aMatch) => aMatch[1].trim()).filter(Boolean);
};

export const normalizeJsonPath = (aPath: string) => {
    const sPath = stripJsonRoot(aPath);
    if (!sPath) return '';
    if (sPath.startsWith('[')) return normalizeBracketPath(sPath);
    return legacyPathToBracketPath(sPath);
};

export const displayJsonPathLabel = (aPath: string) => {
    const sSegments = bracketPathSegments(aPath);
    if (sSegments.length <= 1) return sSegments[0] ?? '';
    return sSegments.join(' > ');
};

export const jsonPathInputToStoredPath = (aInput: string, aKnownPaths: string[] = []) => {
    const sInput = String(aInput ?? '').trim();
    const sMatchedPath = aKnownPaths.find((aPath) => displayJsonPathLabel(aPath) === sInput);
    return normalizeJsonPath(sMatchedPath || sInput);
};

export const jsonPathToSqlPath = (aPath: string) => {
    const sPath = normalizeJsonPath(aPath);
    return sPath ? `$${sPath}` : '';
};

export const formatJsonValueField = (aColumn: string, aPath: string) => {
    const sPath = normalizeJsonPath(aPath);
    return sPath ? `${aColumn}->$${sPath}` : aColumn;
};

export const parseJsonValueField = (aValue: string): { column: string; path: string } | null => {
    const sValue = String(aValue ?? '').trim();
    const sMatch = sValue.match(/^(.+?)->'?(\$\.?.+?)'?$/);
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

    return `${sColumn}->'${jsonPathToSqlPath(sPath).replace(/'/g, "''")}'`;
};

export const toSqlValueExpression = (aValue: string, aJsonKey?: string) => jsonValueFieldToSql(aValue, aJsonKey);

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

export const extractJsonPathsFromSamples = (aSamples: any[]) => {
    const sPaths: string[] = [];
    const sSeen = new Set<string>();
    const addPath = (aPath: string) => {
        if (!aPath || sSeen.has(aPath)) return;
        sSeen.add(aPath);
        sPaths.push(aPath);
    };
    const isObjectValue = (aValue: any) => aValue !== null && typeof aValue === 'object';
    const walk = (aValue: any, aPrefix = '') => {
        if (Array.isArray(aValue)) {
            aValue.forEach((aItem, aIdx) => {
                const sPath = `${aPrefix}[${aIdx}]`;
                if (isObjectValue(aItem)) {
                    walk(aItem, sPath);
                } else {
                    addPath(sPath);
                }
            });
            return;
        }
        if (!isObjectValue(aValue)) {
            addPath(aPrefix);
            return;
        }

        Object.keys(aValue).forEach((aKey) => {
            const sPath = `${aPrefix}${pathSegment(aKey)}`;
            if (isObjectValue(aValue[aKey])) {
                walk(aValue[aKey], sPath);
            } else {
                addPath(sPath);
            }
        });
    };

    aSamples.forEach((aSample) => {
        const sParsedSample = parseSample(aSample);
        if (sParsedSample !== undefined) walk(sParsedSample);
    });

    return sPaths;
};
