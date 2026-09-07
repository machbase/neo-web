import {
    decodeAxisRange,
    encodeAxisRange,
    formatNumericExpression,
    parseNumericExpression,
} from './serializeRange';

describe('decodeAxisRange', () => {
    it('orders persisted endpoints', () => {
        expect(decodeAxisRange({ startTime: 20, endTime: 10 })).toEqual({
            start: 10,
            end: 20,
        });
    });

    it('keeps the persisted endpoint names when encoding', () => {
        expect(encodeAxisRange({ start: 10, end: 20 })).toEqual({
            startTime: 10,
            endTime: 20,
        });
    });

    it.each([
        undefined,
        { startTime: 10, endTime: 10 },
        { startTime: '10', endTime: 20 },
    ])('rejects an invalid persisted range', (value) => {
        expect(decodeAxisRange(value)).toBeUndefined();
    });
});

describe('numeric range expressions', () => {
    it.each([
        ['first+10', { anchor: 'data_start', offset: 10 }, 'first+10'],
        ['first-10', { anchor: 'data_start', offset: -10 }, 'first-10'],
        ['last-10', { anchor: 'data_end', offset: -10 }, 'last-10'],
        ['last+10', { anchor: 'data_end', offset: 10 }, 'last+10'],
        ['FIRST + 1e1', { anchor: 'data_start', offset: 10 }, 'first+10'],
    ] as const)(
        'normalizes %s to the runtime distance grammar',
        (value, parsed, formatted) => {
            expect(parseNumericExpression(value)).toEqual(parsed);
            expect(formatNumericExpression(parsed)).toBe(formatted);
        },
    );

    it.each(['first+', 'first+Infinity', 'last-abc', '0x10'])(
        'rejects invalid distance input %s',
        (value) => {
            expect(parseNumericExpression(value)).toBeUndefined();
        },
    );
});
