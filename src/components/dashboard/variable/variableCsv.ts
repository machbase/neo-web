import Papa from 'papaparse';
import { generateUUID } from '@/utils';
import type { VARIABLE_TYPE } from '.';

/**
 * The variable CSV that Export writes and Import reads: `LABEL,VARIABLE NAME,VALUES`, one variable per
 * row, its values in the VALUES field as a comma list.
 *
 * That list is itself read as one CSV line, so a value holding a comma or a quote is kept whole when it is
 * quoted inside the field - Export writes `Seoul, Korea` as `"""Seoul, Korea"""`. A list of plain values
 * is written exactly as before (`"a,b,c"`), so earlier exports import unchanged (#1566).
 */
export const VARIABLE_CSV_HEADER = ['LABEL', 'VARIABLE NAME', 'VALUES'];

export interface VariableCsvParseResult {
    /** Set when the first row is not the Export header; nothing else is read then. */
    headerError?: string;
    variables: VARIABLE_TYPE[];
    /** Rows left out because the label, the name or the values are empty - `row N` (1-based, header = row 1). */
    skipped: string[];
}

// Only a comma separates values: left to guess, papaparse also split on `;`, `|` or a tab. A line break
// it reads as the next row, but inside this one field it belongs to the value, so the rows are joined back.
const parseValueList = (aField: string): string[] => {
    const sParsed = Papa.parse<string[]>(aField, { header: false, delimiter: ',' });
    const sLineBreak = sParsed.meta?.linebreak || '\n';
    return (sParsed.data ?? []).reduce<string[]>((aValues, aRow, aIdx) => {
        if (aIdx === 0) return [...aRow];
        const [sHead = '', ...sRest] = aRow;
        return [...aValues.slice(0, -1), `${aValues[aValues.length - 1] ?? ''}${sLineBreak}${sHead}`, ...sRest];
    }, []);
};

export const parseVariableCsv = (aRows: unknown[][]): VariableCsvParseResult => {
    const [sHeader, ...sRows] = aRows;
    if (!sHeader || sHeader.map((aCell) => String(aCell ?? '')).join(',') !== VARIABLE_CSV_HEADER.join(',')) {
        return {
            headerError: `The first row must be ${VARIABLE_CSV_HEADER.join(',')} (as Export writes it).`,
            variables: [],
            skipped: [],
        };
    }

    const sVariables: VARIABLE_TYPE[] = [];
    const sSkipped: string[] = [];
    sRows.forEach((aRow, aIdx) => {
        const sCells = (aRow ?? []).map((aCell) => String(aCell ?? ''));
        // A blank line (the file's trailing newline included) is not a row.
        if (sCells.every((aCell) => aCell.trim() === '')) return;
        const [sLabel = '', sKey = '', sValueField = ''] = sCells;
        if (!sLabel || !sKey || !sValueField) {
            sSkipped.push(`row ${aIdx + 2}${sLabel ? ` (${sLabel})` : ''}`);
            return;
        }
        const sValueList = parseValueList(sValueField).map((aValue) => ({ id: generateUUID(), type: 'CSV', value: aValue }));
        sVariables.push({ id: generateUUID(), label: sLabel, key: sKey, type: 'SELECT', use: sValueList[0], valueList: sValueList });
    });
    return { variables: sVariables, skipped: sSkipped };
};

/** One variable as an Export row. Plain values give the same text as before; see the note above. */
export const variableCsvRow = (aVariable: VARIABLE_TYPE): string => {
    const sValueList = Papa.unparse([aVariable?.valueList?.map((aValue) => aValue.value) ?? []], { newline: '' });
    return `${aVariable.label},${aVariable.key},"${sValueList.replace(/"/g, '""')}"`;
};

/** Merge keeps the board's variables and lets an imported one take the place of the one with its name. */
export const mergeVariables = (aCurrent: VARIABLE_TYPE[], aImported: VARIABLE_TYPE[]): VARIABLE_TYPE[] => {
    const sImportedByKey = new Map(aImported.map((aVariable) => [aVariable.key, aVariable]));
    const sMerged = aCurrent.map((aVariable) => sImportedByKey.get(aVariable.key) ?? aVariable);
    const sCurrentKeys = new Set(aCurrent.map((aVariable) => aVariable.key));
    return sMerged.concat(aImported.filter((aVariable) => !sCurrentKeys.has(aVariable.key)));
};
