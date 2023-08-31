/** POSITION INTERFACE */
export interface PositionType {
    column: number;
    lineNumber: number;
}
/** SELECTION INTERFACE */
export interface SelectionType {
    endColumn: number;
    endLineNumber: number;
    positionColumn: number;
    positionLineNumber: number;
    selectionStartColumn: number;
    selectionStartLineNumber: number;
    startColumn: number;
    startLineNumber: number;
}
/** REMOVE ANNOTATION */
const removeAnnotation = (aSplitQuery: string[]): string[] => {
    return aSplitQuery
        .map((aQuery: string) => {
            if (aQuery.includes('--') && !!aQuery.split('--')[0].trim()) {
                return aQuery.split('--')[0];
            }
            if (aQuery.includes('--')) return;
            return aQuery;
        })
        .filter((aItem: string | undefined) => aItem !== undefined) as string[];
};
/** CHECK SELECTION ANNOTATION LINE */
const isSelectAnnotationLine = (aSplitQuery: string[], aPosition: PositionType): boolean => {
    return aSplitQuery[aPosition.lineNumber - 1].includes('--') && !aSplitQuery[aPosition.lineNumber - 1].split('--')[0].trim();
};
/** CHECK BLANK QUERY */
const isBlankQuery = (aQuery: string): boolean => {
    return aQuery.trim() === '';
};
/** FIND VARIABLE & PARSING QUERY */
const findVariableNParsedQuery = (aNoAnnotationList: string[]) => {
    const sRegExp: RegExp = new RegExp("([']*'[^']*')", 'igm');
    let sParsedQuery: string = aNoAnnotationList.join('\n');
    let sVariableList: { value: string; replaceValue: string }[] | null = [];

    if (sParsedQuery.match(sRegExp)) {
        const sTmpMatchList = sParsedQuery.match(sRegExp);
        if (!sTmpMatchList) return { sParsedQuery, sVariableList };
        sVariableList = sTmpMatchList.map((aString: string) => {
            return { value: aString, replaceValue: aString.replaceAll(';', 'M') };
        });
        sVariableList.map((aVariable) => {
            sParsedQuery = sParsedQuery.replace(aVariable.value, aVariable.replaceValue);
        });
    }
    return { sParsedQuery, sVariableList };
};
/** FIND START & END LINE */
const findStartNEndLine = (aSplitQueryList: string[], aSelection: SelectionType): { sStartLine: number; sEndLine: number; sStartColumn: number; sEndColumn: number } => {
    let sStartLine: number = aSelection.startLineNumber - 1;
    let sEndLine: number = aSelection.endLineNumber - 1;
    const sStartColumn: number = aSelection.startColumn - 1;
    const sEndColumn: number = aSelection.endColumn - 1;

    aSplitQueryList.map((aQuery: string, aIdx: number) => {
        if (aQuery.includes('--') && aIdx <= sStartLine) {
            if (aQuery.split('--')[0].trim() === '') sStartLine -= 1;
        }
        if (aQuery.includes('--') && aIdx <= sEndLine) {
            if (aQuery.split('--')[0].trim() === '') sEndLine -= 1;
        }
    });
    return { sStartLine, sEndLine, sStartColumn, sEndColumn };
};
/** FIND CURSOR LENGTH */
const findCursorLength = (aNoAnnotationList: string[], aStartLine: number, aEndLine: number, aStartColumn: number, aEndColumn: number) => {
    let rTotalLen = 0;
    let sSelectionStartLen = 0;
    let sSelectionEndLen = 0;

    aNoAnnotationList.map((aRow: string, aIdx: number) => {
        if (aStartLine === aIdx) {
            sSelectionStartLen = rTotalLen + aStartColumn + aIdx;
        }
        if (aIdx === aEndLine) {
            sSelectionEndLen = rTotalLen + aEndColumn + aIdx;
        }
        rTotalLen += aRow.length;
    });

    return { sSelectionStartLen, sSelectionEndLen };
};
/** FIND TARGET QUERY */
const findTargetQuery = (
    aParsedQuery: string,
    sSelectionStartLen: number,
    sSelectionEndLen: number,
    aVariableList: {
        value: string;
        replaceValue: string;
    }[]
) => {
    let semiTotalLen = 0;
    let sBlank = false;
    const targetQuery: string[] = [];
    const sSemiList = aParsedQuery.split(';');

    sSemiList.map((aRow: string) => {
        if (targetQuery.length > 0 && semiTotalLen < sSelectionEndLen - (aRow.length - aRow.trim().length)) {
            targetQuery.push(aRow.split('\n').join(' ').trim());
        }
        if (targetQuery.length === 0 && sSelectionStartLen < semiTotalLen + aRow.length + 1 && !sBlank) {
            if (sSelectionStartLen + aRow.length - aRow.trimStart().length >= sSelectionEndLen) sBlank = true;
            else targetQuery[0] = aRow.split('\n').join(' ').trim();
        }
        semiTotalLen += aRow.length + 1;
    });
    console.log('targetquerylist', targetQuery);

    return targetQuery;
};
/**
 * SQL Multi QUERY PARSER
 * @QUERY_TEXT string;
 * @POSITION PositionType
 * @SELECTION SelectionType
 */
export const sqlMultiQueryParser = (aQueryTxt: string, aPosition: PositionType, aSelection: SelectionType) => {
    if (isBlankQuery(aQueryTxt)) return '';
    if (!aPosition) return '';
    if (!aSelection) return '';
    const sSplitQueryList = JSON.parse(JSON.stringify(aQueryTxt)).split('\n');
    if (isSelectAnnotationLine(sSplitQueryList, aPosition)) return '';
    const sNoAnnotationList = removeAnnotation(sSplitQueryList);
    const { sStartLine, sEndLine, sStartColumn, sEndColumn } = findStartNEndLine(sSplitQueryList, aSelection);
    const { sParsedQuery, sVariableList } = findVariableNParsedQuery(sNoAnnotationList);
    const { sSelectionStartLen, sSelectionEndLen } = findCursorLength(sNoAnnotationList, sStartLine, sEndLine, sStartColumn, sEndColumn);
    return findTargetQuery(sParsedQuery, sSelectionStartLen, sSelectionEndLen, sVariableList);
};
