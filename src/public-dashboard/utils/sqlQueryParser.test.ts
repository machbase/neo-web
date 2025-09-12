import { sqlQueryParser, sqlRemoveLimitKeyword } from './sqlQueryParser';

test.each([
    [
        '쿼리문 1개 단일 라인',
        `select * from example;`,
        { lineNumber: 1, column: 23 },
        { endColumn: 23, endLineNumber: 1, positionColumn: 23, positionLineNumber: 1, selectionStartColumn: 23, selectionStartLineNumber: 1, startColumn: 23, startLineNumber: 1 },
        'select * from example',
    ],
    [
        '쿼리문 1개 단일 라인 위아래 공백 - 위 공백 포커싱',
        `\nselect * from example;\n`,
        { lineNumber: 1, column: 1 },
        { endColumn: 1, endLineNumber: 1, positionColumn: 1, positionLineNumber: 1, selectionStartColumn: 1, selectionStartLineNumber: 1, startColumn: 1, startLineNumber: 1 },
        'select * from example',
    ],
    [
        '쿼리문 1개 단일 라인 위아래 공백 - 아래 공백 포커싱',
        `\nselect * from example;\n`,
        { lineNumber: 3, column: 1 },
        { endColumn: 1, endLineNumber: 3, positionColumn: 1, positionLineNumber: 3, selectionStartColumn: 1, selectionStartLineNumber: 3, startColumn: 1, startLineNumber: 3 },
        'select * from example',
    ],
    [
        '쿼리문 1개 다중 라인',
        `select\n*\nfrom\nexample\n;`,
        { lineNumber: 5, column: 2 },
        { endColumn: 2, endLineNumber: 5, positionColumn: 2, positionLineNumber: 5, selectionStartColumn: 2, selectionStartLineNumber: 5, startColumn: 2, startLineNumber: 5 },
        'select * from example',
    ],
    [
        '쿼리문 1개 다중 라인 위아래 공백 - 위 공백 포커싱',
        `\nselect\n*\nfrom\nexample\n;`,
        { lineNumber: 1, column: 1 },
        { endColumn: 1, endLineNumber: 1, positionColumn: 1, positionLineNumber: 1, selectionStartColumn: 1, selectionStartLineNumber: 1, startColumn: 1, startLineNumber: 1 },
        'select * from example',
    ],
    [
        '쿼리문 1개 다중 라인 위아래 공백 - 아래 공백 포커싱',
        `\nselect\n*\nfrom\nexample\n;\n`,
        { lineNumber: 7, column: 1 },
        { endColumn: 1, endLineNumber: 7, positionColumn: 1, positionLineNumber: 7, selectionStartColumn: 1, selectionStartLineNumber: 7, startColumn: 1, startLineNumber: 7 },
        'select * from example',
    ],
    [
        '쿼리문 2개 단일 라인 - 1번째 쿼리 실행',
        `select * from example; select * from example limit 3;`,
        { lineNumber: 1, column: 23 },
        { endColumn: 23, endLineNumber: 1, positionColumn: 23, positionLineNumber: 1, selectionStartColumn: 23, selectionStartLineNumber: 1, startColumn: 23, startLineNumber: 1 },
        'select * from example',
    ],
    [
        '쿼리문 2개 단일 라인 - 2번째 쿼리 실행',
        `select * from example; select * from example limit 3;`,
        { lineNumber: 1, column: 54 },
        { endColumn: 54, endLineNumber: 1, positionColumn: 54, positionLineNumber: 1, selectionStartColumn: 54, selectionStartLineNumber: 1, startColumn: 54, startLineNumber: 1 },
        'select * from example limit 3',
    ],
    [
        '쿼리문 2개 다중 라인 - 1번째 쿼리 실행',
        `select\n*\nfrom\nexample\n; select\n* from\nexample\nlimit\n2;`,
        { lineNumber: 5, column: 2 },
        { endColumn: 2, endLineNumber: 5, positionColumn: 2, positionLineNumber: 5, selectionStartColumn: 2, selectionStartLineNumber: 5, startColumn: 2, startLineNumber: 5 },
        'select * from example',
    ],
    [
        '쿼리문 2개 다중 라인 - 2번째 쿼리 실행',
        `select\n*\nfrom\nexample\n; select\n* from\nexample\nlimit\n2;`,
        { lineNumber: 9, column: 3 },
        { endColumn: 3, endLineNumber: 9, positionColumn: 3, positionLineNumber: 9, selectionStartColumn: 3, selectionStartLineNumber: 9, startColumn: 3, startLineNumber: 9 },
        'select * from example limit 2',
    ],
    [
        '주석 실행',
        `-- annotation`,
        { lineNumber: 1, column: 14 },
        { endColumn: 1, endLineNumber: 1, positionColumn: 1, positionLineNumber: 1, selectionStartColumn: 1, selectionStartLineNumber: 1, startColumn: 1, startLineNumber: 1 },
        '',
    ],
    [
        '주석에 세미클론이 있을 때',
        `-- annotation;\nselect * from example;`,
        { lineNumber: 2, column: 23 },
        { endColumn: 23, endLineNumber: 2, positionColumn: 23, positionLineNumber: 2, selectionStartColumn: 23, selectionStartLineNumber: 2, startColumn: 23, startLineNumber: 2 },
        'select * from example',
    ],
    [
        '쿼리문 위 아래 라인이 주석',
        `-- annotation\nselect * from example;\n-- annotation`,
        { lineNumber: 2, column: 23 },
        { endColumn: 23, endLineNumber: 2, positionColumn: 23, positionLineNumber: 2, selectionStartColumn: 23, selectionStartLineNumber: 2, startColumn: 23, startLineNumber: 2 },
        'select * from example',
    ],
    [
        '다중 라인으로 작성된 쿼리문 사이에 주석',
        `select\n*\n-- annotation\nfrom\nexample;\n`,
        { lineNumber: 5, column: 9 },
        { endColumn: 9, endLineNumber: 5, positionColumn: 9, positionLineNumber: 5, selectionStartColumn: 9, selectionStartLineNumber: 5, startColumn: 9, startLineNumber: 5 },
        'select * from example',
    ],
    [
        `where절 있을 경우`,
        `select name, time from example where name = 'wave.sin' limit 5;`,
        { column: 64, lineNumber: 1 },
        { endColumn: 64, endLineNumber: 1, positionColumn: 64, positionLineNumber: 1, selectionStartColumn: 64, selectionStartLineNumber: 1, startColumn: 64, startLineNumber: 1 },
        `select name, time from example where name = 'wave.sin' limit 5`,
    ],
    [
        `''내의 데이터 유지`,
        `select time, value from example where\nname = ',./;[;];asdfasdf<>?;:"{}${'`'}~4355dgb;!@;#$;%^asdf123123;&;*;;();_;+-='\nlimit 10;`,
        { lineNumber: 3, column: 10 },
        { endColumn: 10, endLineNumber: 3, positionColumn: 10, positionLineNumber: 3, selectionStartColumn: 10, selectionStartLineNumber: 3, startColumn: 10, startLineNumber: 3 },
        `select time, value from example where name = ',./;[;];asdfasdf<>?;:"{}${'`'}~4355dgb;!@;#$;%^asdf123123;&;*;;();_;+-=' limit 10`,
    ],
    [
        `문자가 없는 다중 라인 - https://github.com/machbase/neo/issues/376`,
        `\n\n\n\n\n\n\n\n\n\n`,
        { lineNumber: 3, column: 1 },
        { endColumn: 1, endLineNumber: 3, positionColumn: 1, positionLineNumber: 3, selectionStartColumn: 1, selectionStartLineNumber: 3, startColumn: 1, startLineNumber: 3 },
        ``,
    ],
    [
        `sql - string 형식 안의 semicolon 치환 - https://github.com/machbase/neo/issues/366`,
        `select * from example where name=';';`,
        { lineNumber: 1, column: 38 },
        { endColumn: 38, endLineNumber: 1, positionColumn: 38, positionLineNumber: 1, selectionStartColumn: 38, selectionStartLineNumber: 1, startColumn: 38, startLineNumber: 1 },
        `select * from example where name=';'`,
    ],
    [
        `SQL Statement 실행 오류 - https://github.com/machbase/neo/issues/353`,
        `select * from example;\n\nselect\n* from\nexample\nlimit\n2;\n`,
        { lineNumber: 2, column: 1 },
        { endColumn: 1, endLineNumber: 2, positionColumn: 1, positionLineNumber: 2, selectionStartColumn: 1, selectionStartLineNumber: 2, startColumn: 1, startLineNumber: 2 },
        `select * from example`,
    ],
    [
        `SQL 입력시 마지막에 스페이스가 있으면 정상작동하지 않는 문제 - https://github.com/machbase/neo/issues/320`,
        `select min(time), max(time) from example where name = 'wave.sin';`,
        { lineNumber: 1, column: 66 },
        { endColumn: 66, endLineNumber: 1, positionColumn: 66, positionLineNumber: 1, selectionStartColumn: 66, selectionStartLineNumber: 1, startColumn: 66, startLineNumber: 1 },
        `select min(time), max(time) from example where name = 'wave.sin'`,
    ],
    [
        `주석이 여러개 있을 때 현재 커서가 포커싱 된 행이 정상적으로 실행 되는가 - https://github.com/machbase/neo/issues/399`,
        `-- Create "example" table
        CREATE TAG TABLE IF NOT EXISTS example (
            name varchar(100) primary key,
            time dateTime basetime,
            value double
        ); 
        
        -- Insert records
        INSERT INTO example VALUES('my-car', now, 1.2345);
        INSERT INTO example VALUES('my-car', now, 1.2345 * 1.1); 
        INSERT INTO example VALUES('my-car', now, 1.2345 * 1.2);
        INSERT INTO example VALUES('my-car', now, 1.2345 * 1.3);         
        
        -- Select records 1
        SELECT time, value FROM example WHERE name = 'my-car';`,
        { lineNumber: 15, column: 55 },
        {
            endColumn: 55,
            endLineNumber: 15,
            positionColumn: 55,
            positionLineNumber: 15,
            selectionStartColumn: 55,
            selectionStartLineNumber: 15,
            startColumn: 55,
            startLineNumber: 15,
        },
        `SELECT time, value FROM example WHERE name = 'my-car'`,
    ],
    [
        `; 이후 공백이 있는 쿼리에 대한 쿼리 실행이 정상적으로 수행되는가 - https://github.com/machbase/neo/issues/399`,
        `-- Create "example" table
        CREATE TAG TABLE IF NOT EXISTS example (
            name varchar(100) primary key,
            time dateTime basetime,
            value double
        ); 
        
        -- Insert records
        INSERT INTO example VALUES('my-car', now, 1.2345);
        INSERT INTO example VALUES('my-car', now, 1.2345 * 1.1); 
        INSERT INTO example VALUES('my-car', now, 1.2345 * 1.2);
        INSERT INTO example VALUES('my-car', now, 1.2345 * 1.3);         
        
        -- Select records 1
        SELECT time, value FROM example WHERE name = 'my-car';`,
        { lineNumber: 12, column: 66 },
        {
            endColumn: 66,
            endLineNumber: 12,
            positionColumn: 66,
            positionLineNumber: 12,
            selectionStartColumn: 66,
            selectionStartLineNumber: 12,
            startColumn: 66,
            startLineNumber: 12,
        },
        `INSERT INTO example VALUES('my-car', now, 1.2345 * 1.3)`,
    ],
    [
        `공백 없는 1번 라인 sql 실행`,
        `select * from example;
 
        select
        * from
        example
        limit
        2;
        `,
        { lineNumber: 1, column: 1 },
        {
            endColumn: 1,
            endLineNumber: 1,
            positionColumn: 1,
            positionLineNumber: 1,
            selectionStartColumn: 1,
            selectionStartLineNumber: 1,
            startColumn: 1,
            startLineNumber: 1,
        },
        `select * from example`,
    ],
    [
        `issues 838`,
        `BACKUP TABLE TAG INTO DISK = 'TB_TAG';                              -- 테이블 백업을 수행 ( TB_TAG 폴더 아래에 테이블 백업 파일을 저장 )

mount database 'TB_TAG' to mntdb;                                   -- 테이블 백업 데이터를 마운트

select count(*) from mntdb.sys.tag;                                 -- 마운트한 테이블의 건수 확인

select to_char(min(time)), to_char(max(time)) from mntdb.sys.tag;   -- 마운트한 테이블의 데이터 시간 범위 확인

umount database mntdb;                                              -- 마운트 해제`,
        { lineNumber: 9, column: 1 },
        {
            endColumn: 1,
            endLineNumber: 9,
            positionColumn: 1,
            positionLineNumber: 9,
            selectionStartColumn: 1,
            selectionStartLineNumber: 9,
            startColumn: 1,
            startLineNumber: 9,
        },
        `umount database mntdb`,
    ],
])('SQL - %s', (_, aQueryText, aPosition, aSelection, expected) => {
    expect(sqlQueryParser(aQueryText, aPosition, aSelection)).toEqual(expected);
});

test.each([
    ['Limit 만 작성 - (limit)', `select * from example limit`, 0],
    ['Limit ","사용 - (limit ,)', `select * from example limit ,`, 0],
    ['Limit 공백 없이(limitn)', `select * from example limit3`, '3'],
    ['Limit 1공백 - (limit n)', `select * from example limit 3`, '3'],
    ['Limit n공백 - (limit  n)', `select * from example limit 3`, '3'],
    ['Limit ","사용 & 공백 없이 - (limitn,n)', `select * from example limit3,7`, '7'],
    ['Limit ","사용 & 1공백 - (limit n,n)', `select * from example limit 3,7`, '7'],
    ['Limit ","사용 & n공백 - (limit  n,n)', `select * from example limit  3,7`, '7'],
    ['Limit ","사용 & 숫자 간 공백 - (limit  n , n)', `select * from example limit 3 , 7`, '7'],
    ['Limit ","사용 & 숫자 간 공백 n개 - (limit  n  ,  n)', `select * from example limit 3  ,  7`, '7'],
    ['Limit ","사용 & 숫자 3개 - (limit  n,n,n)', `select * from example limit 3,6,9`, '6'],
])('SQL - %s', (_, aQueryText, expected) => {
    expect(sqlRemoveLimitKeyword(aQueryText)).toEqual(expected);
});
