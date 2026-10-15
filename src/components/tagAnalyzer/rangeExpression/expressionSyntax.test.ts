import {
    formatNumericExpression,
    isValidTimeExpression,
    parseNumericExpression,
} from './expressionSyntax';

import { resolveRangeInput, parseRangeInputValue } from './rangeInput';

describe('numeric range expressions', () => {
    it.each([
        ['first', { anchor: 'data_start', offset: 0 }, 'first'],
        ['last', { anchor: 'data_end', offset: 0 }, 'last'],
        ['first+10', { anchor: 'data_start', offset: 10 }, 'first+10'],
        ['first-10', { anchor: 'data_start', offset: -10 }, 'first-10'],
        ['last-10', { anchor: 'data_end', offset: -10 }, 'last-10'],
        ['last+10', { anchor: 'data_end', offset: 10 }, 'last+10'],
        ['FIRST + 1e1', { anchor: 'data_start', offset: 10 }, 'first+10'],
        ['last - .25e+2', { anchor: 'data_end', offset: -25 }, 'last-25'],
        ['first-1e-2', { anchor: 'data_start', offset: -0.01 }, 'first-0.01'],
        ['-2.5e2', { anchor: 'value', value: -250 }, '-250'],
    ] as const)(
        'normalizes %s to the runtime distance grammar',
        (value, parsed, formatted) => {
            expect(parseNumericExpression(value)).toEqual(parsed);
            expect(formatNumericExpression(parsed)).toBe(formatted);
        },
    );

    it.each(['first+', 'first+Infinity', 'last-abc', '0x10', 'first--1', 'last+1e309', 'first+0x10'])(
        'rejects invalid distance input %s',
        (value) => {
            expect(parseNumericExpression(value)).toBeUndefined();
        },
    );
});

describe('shared time expression grammar', () => {
    const fullRange = {
        start: new Date(2024, 0, 31, 12).getTime(),
        end: new Date(2024, 4, 31, 12).getTime(),
    };
    const referenceTime = new Date(2024, 2, 31, 12).getTime();

    it.each([
        ['first', fullRange.start],
        [' FIRST+1ms ', fullRange.start + 1],
        ['first+1s', fullRange.start + 1_000],
        ['first+1m', fullRange.start + 60_000],
        ['first+1h', fullRange.start + 3_600_000],
        ['first+1d', new Date(2024, 1, 1, 12).getTime()],
        ['first+1w', new Date(2024, 1, 7, 12).getTime()],
        ['first+1M', new Date(2024, 1, 29, 12).getTime()],
        ['now-1M', new Date(2024, 1, 29, 12).getTime()],
        ['last-1M', new Date(2024, 3, 30, 12).getTime()],
        ['last-1y', new Date(2023, 4, 31, 12).getTime()],
        ['now', referenceTime],
    ] as const)('validates and resolves %s consistently', (start, expectedStart) => {
        expect(isValidTimeExpression(start)).toBe(true);
        expect(resolveRangeInput({ start, end: 'last' }, 'time', fullRange, fullRange, referenceTime))
            .toEqual({ start: expectedStart, end: fullRange.end });
    });

    it.each(['first-1h', 'last+1h', 'now+1h', 'first+1H', 'last-1.5h', 'now -1h', 'tomorrow'])(
        'rejects %s in validation and resolution', (start) => {
            expect(isValidTimeExpression(start)).toBe(false);
            expect(resolveRangeInput({ start, end: 'last' }, 'time', fullRange, fullRange, referenceTime))
                .toBeUndefined();
        },
    );

    it('retains the distinct absolute-date rules for persisted and interactive input', () => {
        expect(isValidTimeExpression('2024-03-')).toBe(false);
        expect(parseRangeInputValue('2024-03-', 'time')).toBe(new Date(2024, 2, 1).getTime());
        expect(isValidTimeExpression(String(referenceTime))).toBe(false);
        expect(parseRangeInputValue(String(referenceTime), 'time')).toBe(referenceTime);
        expect(isValidTimeExpression('2024-02-30')).toBe(false);
        expect(parseRangeInputValue('2024-02-30', 'time')).toBeUndefined();
    });
});
