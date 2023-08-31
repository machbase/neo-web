import { sqlMultiQueryParser } from './sqlMultiQueryParser';

test.each([
    [
        '쿼리 여러개',
        `select * from example;\nselect * from example limit 3;`,
        { lineNumber: 1, column: 23 },
        { endColumn: 23, endLineNumber: 1, positionColumn: 23, positionLineNumber: 1, selectionStartColumn: 23, selectionStartLineNumber: 1, startColumn: 23, startLineNumber: 1 },
        ['select * from example', 'select * from example limit 3'],
    ],
])('SQL MULTI - %s', (_, aQueryText, aPosition, aSelection, expected) => {
    expect(sqlMultiQueryParser(aQueryText, aPosition, aSelection)).toEqual(expected);
});
