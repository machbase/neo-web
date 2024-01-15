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
    const sParsedCsvBody: any = BodyParser(raw);
    const sParsedCsvHeader: any = HeaderParser(sParsedCsvBody.data[0].length);
    return [sParsedCsvBody.data, sParsedCsvHeader];
};

export const TagzCsvParser = (raw: any) => {
    const sParsedCsvBody: any = BodyParser(raw);
    return sParsedCsvBody.data;
};
