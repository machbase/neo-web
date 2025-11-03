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
export interface LocationType {
    position: PositionType;
    selection: SelectionType;
}
export interface SplitItemType {
    beginLine: number;
    endLine: number;
    env: any;
    isComment: boolean;
    text: string;
    length?: number;
}

export const SqlSplitHelper = (aLocation: LocationType, aSplitList: SplitItemType[], aRunAll?: boolean): SplitItemType[] => {
    let parsedQuery: SplitItemType[] = [];
    if (aRunAll) return aSplitList?.filter((statement) => !statement?.isComment);
    // SINGLE
    if (aLocation.selection.endColumn === aLocation.selection.startColumn && aLocation.selection.endLineNumber === aLocation.selection.startLineNumber) {
        parsedQuery = aSplitList?.filter((statement: SplitItemType) => {
            if (!statement.isComment && statement.beginLine <= aLocation.selection.startLineNumber && aLocation.selection.startLineNumber <= statement.endLine) {
                return statement;
            }
        });
    }
    // MULTIPLE
    else {
        parsedQuery = aSplitList?.filter((statement: SplitItemType) => {
            if (!statement.isComment && statement.endLine >= aLocation.selection.startLineNumber && statement.beginLine <= aLocation.selection.endLineNumber) return statement;
        });
    }
    return parsedQuery;
};
