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
const needsQuoting = (aSegment: string) => aSegment.length === 0 || aSegment.trim() !== aSegment || aSegment.startsWith('"') || /[\[\]\\']/.test(aSegment);

export const jsonPathSegment = (aSegment: string) => {
    const sSegment = String(aSegment ?? '');
    if (!needsQuoting(sSegment)) return `[${sSegment}]`;
    // These are JSONPath delimiters, not SQL string delimiters. Doubling an apostrophe
    // inside JSONPath changes the key; SQL escaping happens only when building SQL below.
    if (sSegment.includes("'") && !sSegment.includes('"')) return `["${sSegment}"]`;
    if (sSegment.includes("'") && sSegment.includes('"') && !sSegment.includes(']') && !/^["']/.test(sSegment)) return `[${sSegment}]`;
    return `['${sSegment.replace(/'/g, "''")}']`;
};

/**
 * Read a bracket path into its segments, quoted or not.
 *
 * The plain `/\[([^\]]+)\]/g` this replaced stops at the first `]`, so a key named `[TEST] RENAME_1`
 * was silently cut down to `[TEST` — a dozen distinct keys collapsing onto one wrong path. A quoted
 * segment `['a]b']` is read to its closing quote instead. Old saved paths with `''` are
 * decoded to their original key, then written using a delimiter Machbase can read.
 */
const readPathSegments = (aPath: string, strict = false): string[] => {
    const sPath = String(aPath ?? '');
    const sSegments: string[] = [];
    let sIndex = 0;

    while (sIndex < sPath.length) {
        const sOpen = sPath.indexOf('[', sIndex);
        if (sOpen !== sIndex) {
            if (strict) throw new Error(`Invalid JSON path: ${sPath}`);
            break;
        }

        if (sPath[sOpen + 1] === "'" || sPath[sOpen + 1] === '"') {
            const sQuote = sPath[sOpen + 1];
            let sCursor = sOpen + 2;
            let sValue = '';
            while (sCursor < sPath.length) {
                if (sPath[sCursor] === sQuote) {
                    if (sQuote === "'" && sPath[sCursor + 1] === "'") {
                        sValue += "'";
                        sCursor += 2;
                        continue;
                    }
                    break;
                }
                sValue += sPath[sCursor];
                sCursor += 1;
            }
            if (sPath[sCursor] !== sQuote || sPath[sCursor + 1] !== ']') {
                if (strict) throw new Error(`Invalid JSON path: ${sPath}`);
                break;
            }
            sSegments.push(sValue);
            sIndex = sCursor + 2;
            continue;
        }

        const sClose = sPath.indexOf(']', sOpen + 1);
        if (sClose < 0) {
            if (strict) throw new Error(`Invalid JSON path: ${sPath}`);
            break;
        }
        const sValue = sPath.slice(sOpen + 1, sClose);
        sSegments.push(sValue);
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
        .map(jsonPathSegment)
        .join('');
};

const normalizeBracketPath = (aPath: string) => readPathSegments(String(aPath ?? '').trim()).map(jsonPathSegment).join('');

export const normalizeJsonPath = (aPath: string) => {
    const sPath = stripJsonRoot(aPath);
    if (!sPath) return '';
    if (sPath.startsWith('[')) return normalizeBracketPath(sPath);
    return legacyPathToBracketPath(sPath);
};

export const getJsonPathSegments = (aPath: string) => readPathSegments(normalizeJsonPath(aPath));

/** Keep unusual key names visibly distinct from nested ordinary keys. */
export const displayJsonPathSegments = (sSegments: string[]) => {
    if (sSegments.length === 0) return '';
    if (sSegments.length === 1 && !sSegments[0].includes('.') && !needsQuoting(sSegments[0])) return sSegments[0];
    if (sSegments.some((aSegment) => aSegment.includes('.') || needsQuoting(aSegment))) return sSegments.map(jsonPathSegment).join('');
    return sSegments.join('.');
};

export const displayJsonPathLabel = (aPath: string) => displayJsonPathSegments(getJsonPathSegments(aPath));

export const jsonPathInputToStoredPath = (aInput: string, aKnownPaths: string[] = []) => {
    void aKnownPaths;
    return normalizeJsonPath(aInput);
};

export const jsonPathToSqlPath = (aPath: string) => {
    const raw = stripJsonRoot(aPath);
    if (raw.startsWith('[')) readPathSegments(raw, true);
    const sPath = normalizeJsonPath(aPath);
    // Machbase cannot load a JSON document containing an empty key. Its path parser also
    // cannot address a key containing both quotes and a closing bracket. Fail clearly
    // instead of returning NULL for a different key.
    const unsupported = readPathSegments(sPath).find((segment) => segment === '' || (segment.includes("'") && segment.includes('"') && (segment.includes(']') || /^["']/.test(segment))));
    if (unsupported !== undefined) throw new Error(`This JSON key cannot be queried: ${JSON.stringify(unsupported)}`);
    return sPath ? `$${sPath}` : '';
};

/** Escape a JSONPath only after it has been placed inside a Machbase SQL string. */
export const escapeJsonPathSqlString = (path: string) => path.replace(/\\/g, '\\\\').replace(/'/g, "''");

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

    return `${sColumn}->'${escapeJsonPathSqlString(jsonPathToSqlPath(sPath))}'`;
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
            const sPath = `${aPrefix}${jsonPathSegment(aKey)}`;
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
