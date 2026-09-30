import { jsonPathSegment, jsonPathToSqlPath } from './dashboardJsonValue';

export type ManualJsonPathSegment = { kind: 'key'; value: string } | { kind: 'index'; value: number };

/** Strict, input-only parser. Saved legacy paths deliberately keep their existing reader. */
export function parseManualJsonPath(input: string): { path: string; segments: ManualJsonPathSegment[] } {
    const text = input.trim();
    let cursor = 0;
    const segments: ManualJsonPathSegment[] = [];
    const invalid = () => new Error('Enter a key path, for example device.value or channels[0].value.');
    if (!text || text === '$') throw new Error('Enter a key path; the whole document ($) is not supported.');
    if (text[cursor] === '$') {
        cursor++;
        if (text[cursor] === '.') { cursor++; if (text[cursor] === '[') throw invalid(); }
        else if (text[cursor] !== '[') throw invalid();
    }
    const readKey = () => {
        const match = /^[\p{L}_][\p{L}\p{N}_-]*/u.exec(text.slice(cursor));
        if (!match) throw invalid();
        segments.push({ kind: 'key', value: match[0] });
        cursor += match[0].length;
    };
    const readBracket = () => {
        cursor++;
        const quote = text[cursor];
        if (quote === "'" || quote === '"') {
            cursor++;
            let value = '';
            let closed = false;
            while (cursor < text.length) {
                const char = text[cursor++];
                if (char === quote) {
                    if (quote === "'" && text[cursor] === "'") { value += "'"; cursor++; continue; }
                    closed = true; break;
                }
                // Displayed and saved paths treat backslashes literally, not as escapes.
                value += char;
            }
            if (!closed || text[cursor++] !== ']') throw invalid();
            if (/^\d+$/.test(value)) throw new Error('Numeric object keys cannot be distinguished from array indexes in saved paths.');
            segments.push({ kind: 'key', value });
        } else {
            const end = text.indexOf(']', cursor);
            if (end < 0) throw invalid();
            const value = text.slice(cursor, end);
            if (/^(0|[1-9]\d*)$/.test(value)) {
                if (!Number.isSafeInteger(Number(value))) throw invalid();
                segments.push({ kind: 'index', value: Number(value) });
            } else {
                // Accept displayed/stored bracket keys too, with literal backslashes and no JSONPath expressions.
                if (!value || value.trim() !== value || /^[-+]?\d/.test(value) || /[\[\*?@():\r\n]/.test(value)) throw invalid();
                segments.push({ kind: 'key', value });
            }
            cursor = end + 1;
        }
    };
    if (text[cursor] === '[') readBracket(); else readKey();
    while (cursor < text.length) {
        if (text[cursor] === '[') readBracket();
        else if (text[cursor++] === '.') readKey();
        else throw invalid();
    }
    const path = segments.map(segment => jsonPathSegment(String(segment.value))).join('');
    jsonPathToSqlPath(path);
    return { path, segments };
}
