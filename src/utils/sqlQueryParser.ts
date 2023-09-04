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
const findStartNEndLine = (aSplitQueryList: string[], aSelection: SelectionType): { sStartLine: number; sEndLine: number } => {
    let sStartLine: number = aSelection.startLineNumber - 1;
    let sEndLine: number = aSelection.endLineNumber - 1;

    aSplitQueryList.map((aQuery: string, aIdx: number) => {
        if (aQuery.includes('--') && aIdx <= aSelection.startLineNumber - 1) {
            if (aQuery.split('--')[0].trim() === '') sStartLine -= 1;
        }
        if (aQuery.includes('--') && aIdx <= aSelection.endLineNumber - 1) {
            if (aQuery.split('--')[0].trim() === '') sEndLine -= 1;
        }
    });
    return { sStartLine, sEndLine };
};
/** FIND CURSOR LENGTH */
const findCursorLength = (aNoAnnotationList: string[], aStartLine: number, aEndLine: number, aSelection: SelectionType) => {
    let rTotalLen = 0;
    let sSelectionLen = 0;

    aNoAnnotationList.map((aRow: string, aIdx: number) => {
        if (aStartLine <= aIdx && aIdx <= aEndLine) {
            if (aRow.trimEnd()[aRow.trimEnd().length - 1] === ';') {
                sSelectionLen = rTotalLen + aSelection.endColumn - 1 + aIdx - (aRow.length - aRow.trimEnd().length);
            } else sSelectionLen = rTotalLen + aSelection.endColumn - 1 + aIdx;
            if (sSelectionLen <= 0) sSelectionLen = 1;
        }
        rTotalLen += aRow.length;
    });

    return sSelectionLen;
};
/** FIND TARGET QUERY */
const findTargetQuery = (
    aParsedQuery: string,
    aSelectionLen: number,
    aVariableList: {
        value: string;
        replaceValue: string;
    }[]
) => {
    let semiTotalLen = 0;
    let targetQuery = '';
    const sSemiList = aParsedQuery.split(';');
    sSemiList.map((aRow: string, aIdx: number) => {
        if (semiTotalLen < aSelectionLen) {
            targetQuery = sSemiList[aIdx];
            if (sSemiList[aIdx].trim() === '') targetQuery = sSemiList[aIdx - 1];
            if (aVariableList.length > 0 && targetQuery && targetQuery.includes("'")) {
                aVariableList.map((aVar, aIdx: number) => {
                    if (targetQuery.includes(aVar.replaceValue)) {
                        targetQuery = targetQuery.replace(aVariableList[aIdx].replaceValue, aVariableList[aIdx].value);
                    }
                });
            }
        }

        semiTotalLen += aRow.length + 1;
    });

    return targetQuery.split('\n').join(' ').trim();
};
/**
 * SQL QUERY PARSER
 * @QUERY_TEXT string;
 * @POSITION PositionType
 * @SELECTION SelectionType
 */
export const sqlQueryParser = (aQueryTxt: string, aPosition: PositionType, aSelection: SelectionType) => {
    if (isBlankQuery(aQueryTxt)) return '';
    if (!aPosition) return '';
    if (!aSelection) return '';
    const sSplitQueryList = JSON.parse(JSON.stringify(aQueryTxt)).split('\n');
    if (isSelectAnnotationLine(sSplitQueryList, aPosition)) return '';
    const sNoAnnotationList = removeAnnotation(sSplitQueryList);
    const { sStartLine, sEndLine } = findStartNEndLine(sSplitQueryList, aSelection);
    const { sParsedQuery, sVariableList } = findVariableNParsedQuery(sNoAnnotationList);
    const sSelectionLen = findCursorLength(sNoAnnotationList, sStartLine, sEndLine, aSelection);
    return findTargetQuery(sParsedQuery, sSelectionLen, sVariableList);
};
