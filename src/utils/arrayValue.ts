/** DB ARRAY metadata, never inferred from a sampled value. */
export type ArrayColumnMetadata = {
    kind: 'array';
    elementType: number;
    cardinality: number;
    precision?: number;
    scale?: number;
};

const ELEMENT_TYPES: Record<number, number> = { 137: 4, 141: 104, 145: 8, 149: 108, 153: 12, 157: 112, 161: 16, 165: 20, 169: 132 };
const ELEMENT_NAMES: Record<number, string> = { 4: 'INT16', 104: 'UINT16', 8: 'INT32', 108: 'UINT32', 12: 'INT64', 112: 'UINT64', 16: 'FLOAT', 20: 'DOUBLE', 132: 'DECIMAL' };

export const isArrayTypeColumn = (type: unknown): boolean => Object.prototype.hasOwnProperty.call(ELEMENT_TYPES, Number(type));
export const isArrayColumnType = isArrayTypeColumn;

export function createArrayColumnMetadata(type: unknown, cardinality: unknown, precision?: unknown, scale?: unknown): ArrayColumnMetadata {
    const elementType = ELEMENT_TYPES[Number(type)];
    const length = Number(cardinality);
    if (!elementType || !Number.isInteger(length) || length < 1 || length > 1024) throw new Error('Array schema length is unavailable or invalid. Refresh the schema and try again.');
    const metadata: ArrayColumnMetadata = { kind: 'array', elementType, cardinality: length };
    if (elementType === 132) {
        const p = Number(precision), s = Number(scale);
        if (precision == null || scale == null || !Number.isInteger(p) || p < 1 || p > 65 || !Number.isInteger(s) || s < 0 || s > Math.min(30, p)) {
            throw new Error('DECIMAL array precision and scale are unavailable.');
        }
        metadata.precision = p;
        metadata.scale = s;
    }
    return metadata;
}

export function buildArrayElementSql(column: string, index: number, metadata?: ArrayColumnMetadata): string {
    if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(column)) throw new Error('Array elements require a simple column name.');
    if (!Number.isInteger(index) || index < 0 || index >= (metadata?.cardinality ?? 1024)) throw new Error('Array element index is outside the declared length.');
    return `${column}[${index}]`;
}

export function formatArrayType(metadata: ArrayColumnMetadata): string {
    const name = ELEMENT_NAMES[metadata.elementType];
    return `${name}${metadata.elementType === 132 ? `(${metadata.precision},${metadata.scale})` : ''}[${metadata.cardinality}]`;
}

/** A numeric token parser: preserve every JSON number's original spelling as a string.
 * JSON.parse still validates the grammar. Strings and object property names are untouched.
 * This is opt-in for ARRAY responses; global HTTP numeric behavior is unchanged.
 */
export function parseArrayJsonLosslessly(text: string): unknown {
    let quoted = false, escaped = false, out = '';
    for (let i = 0; i < text.length;) {
        const c = text[i];
        if (quoted) {
            out += c; i++;
            if (escaped) escaped = false;
            else if (c === '\\') escaped = true;
            else if (c === '"') quoted = false;
        } else if (c === '"') { quoted = true; out += c; i++; }
        else if (c === '-' || /[0-9]/.test(c)) {
            const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
            if (!match) throw new Error('Invalid ARRAY JSON response.');
            out += JSON.stringify(match[0]); i += match[0].length;
        } else { out += c; i++; }
    }
    return JSON.parse(out);
}
