import * as Parse from 'papaparse';
import { isNumericValue } from '@/design-system/components/Table/CommonTable';

/** @ref https://www.papaparse.com/docs#strings */
const sParseOption: any = {
    quotes: false,
    quoteChar: '"',
    delimiter: ',',
    skipEmptyLines: true,
    dynamicTyping: true,
    comments: '//',
};

/**
 * A TQL CSV result is shown as the server sent it (#1566): typing turned `007` into 7 and `1e3` into
 * 1000, and `//` comments dropped any row that starts with `//` (a path, a URL). Only the result
 * table reads it this way; the tag data CSV keeps its numbers. An empty field is still NULL, as the
 * typing made it: Machbase stores '' as NULL, so a table page shows the same row that way.
 */
const sTqlResultParseOption: any = { ...sParseOption, dynamicTyping: false, comments: false };

const BodyParser = (raw: any, aOption: any = sParseOption) => {
    return Parse.parse(raw, aOption);
};

const HeaderParser = (colLen: number) => {
    return Array.from({ length: colLen }, (_, idx: number) => `column${idx}`);
};

export const TqlCsvParser = (raw: any) => {
    if (String(raw ?? '').trim() === '') return [[], []];
    const sParsedCsvBody: any = BodyParser(raw, sTqlResultParseOption);
    if (!sParsedCsvBody.data.length || !sParsedCsvBody.data[0]) return [[], []];
    const sParsedCsvHeader: any = HeaderParser(sParsedCsvBody.data[0].length);
    const sBody = sParsedCsvBody.data.map((aRow: string[]) => aRow.map((aCell) => (aCell === '' ? null : aCell)));
    return [sBody, sParsedCsvHeader];
};

/**
 * Column kinds for a CSV result table. A CSV carries no types, so the table judged every cell on its
 * own and a NULL sat left in a column of right-aligned numbers. A column is a number column when every
 * cell that holds a value is a number; NULL - an empty field, or the `NULL` the CSV sink writes - does
 * not decide it. Pass the rows the table shows (a header row taken out).
 */
export const tqlCsvColumnTypes = (aRows: unknown[][]): string[] => {
    const sColumnCount = aRows.reduce((aMax, aRow) => Math.max(aMax, aRow?.length ?? 0), 0);
    return Array.from({ length: sColumnCount }, (_, aIdx) => {
        const sValues = aRows.map((aRow) => aRow?.[aIdx]).filter((aCell) => aCell !== null && aCell !== undefined && aCell !== '' && aCell !== 'NULL');
        return sValues.length > 0 && sValues.every(isNumericValue) ? 'double' : 'string';
    });
};

export const TagzCsvParser = (raw: any) => {
    const sParsedCsvBody: any = BodyParser(raw);
    return sParsedCsvBody.data;
};
