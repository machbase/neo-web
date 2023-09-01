import { sqlMultiQueryParser } from './sqlMultiQueryParser';

const ISSUES_399 = `       
-- Create "example" table
    
CREATE TAG TABLE IF NOT EXISTS example (
    name varchar(100) primary key,
    time dateTime basetime,
    value double
);    
-- Insert records
INSERT INTO example VALUES('my-car;', now, 1.2345);
INSERT INTO example VALUES('my-car;', now, 1.2345 * 1.1);INSERT INTO example VALUES('my-car;', now, 1.2345 * 1.2);             INSERT INTO example
VALUES('my-car', now, 1.2345 * 1.3);       
  
-- Select records 1
SELECT time, value FROM example WHERE name = 'my-car'; `;

test.each([
    [
        'ISSUES_399 기반 마지막 쿼리 뒤 공백',
        ISSUES_399,
        { lineNumber: 15, column: 55 },
        {
            endColumn: 56,
            endLineNumber: 15,
            positionColumn: 55,
            positionLineNumber: 15,
            selectionStartColumn: 56,
            selectionStartLineNumber: 15,
            startColumn: 55,
            startLineNumber: 15,
        },
        [],
    ],
    [
        'ISSUES_399 기반 중간 쿼리 뒤 공백',
        ISSUES_399,
        { lineNumber: 11, column: 127 },
        {
            endColumn: 127,
            endLineNumber: 11,
            positionColumn: 127,
            positionLineNumber: 11,
            selectionStartColumn: 116,
            selectionStartLineNumber: 11,
            startColumn: 116,
            startLineNumber: 11,
        },
        [],
    ],
    [
        'ISSUES_399 기반 첫 쿼리 앞 공백',
        ISSUES_399,
        { lineNumber: 3, column: 5 },
        {
            endColumn: 5,
            endLineNumber: 3,
            positionColumn: 5,
            positionLineNumber: 3,
            selectionStartColumn: 1,
            selectionStartLineNumber: 3,
            startColumn: 1,
            startLineNumber: 3,
        },
        [],
    ],
    [
        'ISSUES_399 기반 주석 앞 공백',
        ISSUES_399,
        { lineNumber: 1, column: 1 },
        {
            endColumn: 7,
            endLineNumber: 1,
            positionColumn: 1,
            positionLineNumber: 1,
            selectionStartColumn: 7,
            selectionStartLineNumber: 1,
            startColumn: 1,
            startLineNumber: 1,
        },
        [],
    ],
    [
        'ISSUES_399 쿼리 2개',
        ISSUES_399,
        { lineNumber: 12, column: 37 },
        {
            endColumn: 37,
            endLineNumber: 12,
            positionColumn: 37,
            positionLineNumber: 12,
            selectionStartColumn: 58,
            selectionStartLineNumber: 11,
            startColumn: 58,
            startLineNumber: 11,
        },
        ["INSERT INTO example VALUES('my-car;', now, 1.2345 * 1.2)", "INSERT INTO example VALUES('my-car', now, 1.2345 * 1.3)"],
    ],
    [
        'ISSUES_399 쿼리 2개 한글자 씩',
        ISSUES_399,
        { lineNumber: 11, column: 59 },
        {
            endColumn: 59,
            endLineNumber: 11,
            positionColumn: 59,
            positionLineNumber: 11,
            selectionStartColumn: 57,
            selectionStartLineNumber: 11,
            startColumn: 57,
            startLineNumber: 11,
        },
        ["INSERT INTO example VALUES('my-car;', now, 1.2345 * 1.1)", "INSERT INTO example VALUES('my-car;', now, 1.2345 * 1.2)"],
    ],
])('SQL MULTI - %s', (_, aQueryText, aPosition, aSelection, expected) => {
    expect(sqlMultiQueryParser(aQueryText, aPosition, aSelection)).toEqual(expected);
});
