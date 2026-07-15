import * as Parse from 'papaparse';

/** @ref https://www.papaparse.com/docs#strings */
const sParseOption: any = {
    quotes: false,
    quoteChar: '"',
    delimiter: ',',
    skipEmptyLines: true,
    dynamicTyping: true,
    comments: '//',
};

const BodyParser = (raw: any) => {
    return Parse.parse(raw, sParseOption);
};

const HeaderParser = (colLen: number) => {
    return Array.from({ length: colLen }, (_, idx: number) => `column${idx}`);
};

export const TqlCsvParser = (raw: any) => {
    if (String(raw ?? '').trim() === '') return [[], []];
    const sParsedCsvBody: any = BodyParser(raw);
    if (!sParsedCsvBody.data.length || !sParsedCsvBody.data[0]) return [[], []];
    const sParsedCsvHeader: any = HeaderParser(sParsedCsvBody.data[0].length);
    return [sParsedCsvBody.data, sParsedCsvHeader];
};

export const TagzCsvParser = (raw: any) => {
    const sParsedCsvBody: any = BodyParser(raw);
    return sParsedCsvBody.data;
};
