export const JSON_COLUMN_TYPE = 61;

export const isJsonTypeColumn = (aType: number) => aType === JSON_COLUMN_TYPE;

const stripJsonRoot = (aPath: string) => {
    let sPath = String(aPath ?? '').trim();
    if (sPath.startsWith('$')) sPath = sPath.slice(1);
    if (sPath.startsWith('.')) sPath = sPath.slice(1);
    return sPath;
};

// A key needs quoting when a bare reader could not find its end, or when the quote character
// itself would be ambiguous. Keys that need none keep their historical spelling exactly, so every
// path already stored in a .taz or .dsh round-trips unchanged.
const needsQuoting = (aSegment: string) => /[[\]']/.test(aSegment);

const pathSegment = (aSegment: string) => {
    const sSegment = String(aSegment ?? '').trim();
    if (!sSegment) return '';
    return needsQuoting(sSegment) ? `['${sSegment.replace(/'/g, "''")}']` : `[${sSegment}]`;
};

/**
 * Read a bracket path into its segments, quoted or not.
 *
 * The plain `/\[([^\]]+)\]/g` this replaced stops at the first `]`, so a key named `[TEST] RENAME_1`
 * was silently cut down to `[TEST` — a dozen distinct keys collapsing onto one wrong path. A quoted
 * segment `['a]b']` is read to its closing quote instead, with `''` standing for a literal quote,
 * which is the same spelling Machbase uses in a json path.
 */
const readPathSegments = (aPath: string): string[] => {
    const sPath = String(aPath ?? '');
    const sSegments: string[] = [];
    let sIndex = 0;

    while (sIndex < sPath.length) {
        const sOpen = sPath.indexOf('[', sIndex);
        if (sOpen < 0) break;

        if (sPath[sOpen + 1] === "'") {
            let sCursor = sOpen + 2;
            let sValue = '';
            while (sCursor < sPath.length) {
                if (sPath[sCursor] === "'") {
                    if (sPath[sCursor + 1] === "'") {
                        sValue += "'";
                        sCursor += 2;
                        continue;
                    }
                    break;
                }
                sValue += sPath[sCursor];
                sCursor += 1;
            }
            // An unterminated quote is malformed input, not a segment; stopping keeps the reader
            // from inventing a key out of the remainder.
            if (sPath[sCursor] !== "'" || sPath[sCursor + 1] !== ']') break;
            if (sValue.trim()) sSegments.push(sValue.trim());
            sIndex = sCursor + 2;
            continue;
        }

        const sClose = sPath.indexOf(']', sOpen + 1);
        if (sClose < 0) break;
        const sValue = sPath.slice(sOpen + 1, sClose).trim();
        if (sValue) sSegments.push(sValue);
        sIndex = sClose + 1;
    }

    return sSegments;
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

const normalizeBracketPath = (aPath: string) => readPathSegments(String(aPath ?? '').trim()).map(pathSegment).join('');

export const normalizeJsonPath = (aPath: string) => {
    const sPath = stripJsonRoot(aPath);
    if (!sPath) return '';
    if (sPath.startsWith('[')) return normalizeBracketPath(sPath);
    return legacyPathToBracketPath(sPath);
};

export const getJsonPathSegments = (aPath: string) => readPathSegments(normalizeJsonPath(aPath));

export const displayJsonPathLabel = (aPath: string) => {
    const sSegments = getJsonPathSegments(aPath);
    if (sSegments.length === 0) return '';
    if (sSegments.some((aSegment) => aSegment.includes('.'))) return sSegments.map(pathSegment).join('');
    if (sSegments.length === 1) return sSegments[0];
    return sSegments.join('.');
};

export const jsonPathInputToStoredPath = (aInput: string, aKnownPaths: string[] = []) => {
    void aKnownPaths;
    return normalizeJsonPath(aInput);
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

/**
 * The JSON type a leaf value carries, as one character.
 *
 * `n` number, `s` string, `b` boolean, `x` anything else. A key can then say what it holds before a
 * single row has been fetched — a JSON collector knows this from its own config, and a table filled
 * by SQL or an external writer has nowhere else it could come from.
 */
export const jsonSampleValueType = (aValue: any): 'n' | 's' | 'b' | 'a' | 'x' => {
    if (typeof aValue === 'number') return 'n';
    if (typeof aValue === 'string') return 's';
    if (typeof aValue === 'boolean') return 'b';
    if (Array.isArray(aValue)) return 'a';
    return 'x';
};

export const extractJsonPathsFromSamples = (aSamples: any[]) => extractJsonPathEntriesFromSamples(aSamples).paths;

/** Paths and their observed types, found in one walk so the two stay index-aligned. */
export const extractJsonPathEntriesFromSamples = (aSamples: any[]) => {
    const sPaths: string[] = [];
    const sTypes: string[] = [];
    const sSeen = new Set<string>();
    const addPath = (aPath: string, aValue?: any) => {
        if (!aPath || sSeen.has(aPath)) return;
        sSeen.add(aPath);
        sPaths.push(aPath);
        sTypes.push(jsonSampleValueType(aValue));
    };
    const isObjectValue = (aValue: any) => aValue !== null && typeof aValue === 'object';
    const walk = (aValue: any, aPrefix = '') => {
        if (Array.isArray(aValue)) {
            aValue.forEach((aItem, aIdx) => {
                const sPath = `${aPrefix}[${aIdx}]`;
                if (isObjectValue(aItem)) {
                    walk(aItem, sPath);
                } else {
                    addPath(sPath, aItem);
                }
            });
            return;
        }
        if (!isObjectValue(aValue)) {
            addPath(aPrefix, aValue);
            return;
        }

        Object.keys(aValue).forEach((aKey) => {
            const sPath = `${aPrefix}${pathSegment(aKey)}`;
            if (isObjectValue(aValue[aKey])) {
                walk(aValue[aKey], sPath);
            } else {
                addPath(sPath, aValue[aKey]);
            }
        });
    };

    aSamples.forEach((aSample) => {
        const sParsedSample = parseSample(aSample);
        if (sParsedSample !== undefined) walk(sParsedSample);
    });

    return { paths: sPaths, types: sTypes.join('') };
};
