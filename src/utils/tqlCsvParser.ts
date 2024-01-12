import * as Parse from 'papaparse';

/** @ref https://www.papaparse.com/docs#strings */
const sParseOption: any = {
    quotes: false,
    quoteChar: '"',
    delimiter: '"',
    skipEmptyLines: true,
    dynamicTyping: false,
    comments: '//',
};

const BodyParser = (raw: any) => {
    return Parse.parse(raw, sParseOption);
};

const HeaderParser = (colLen: number) => {
    return Array.from({ length: colLen }, (_, idx: number) => `column${idx}`);
};

export const TqlCsvParser = (raw: any) => {
    const sCheckCsv = raw.split('\n').filter((aRaw: string) => aRaw !== '');
    let sTmpRaw: string = '';
    if (sCheckCsv.length === 1) sTmpRaw = `"${sCheckCsv[0]}"`;
    else sTmpRaw = raw;
    const sParsedCsvBody: any = BodyParser(sTmpRaw);
    const sParsedCsvHeader: any = HeaderParser(sParsedCsvBody.data[0].length);
    return [sParsedCsvBody.data, sParsedCsvHeader];
};

export const TagzCsvParser = (raw: any) => {
    const sParsedCsvBody: any = BodyParser(raw);
    return sParsedCsvBody.data;
};
