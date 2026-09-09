import { decodeAxisRange, encodeAxisRange, parseNumericExpression, formatNumericExpression } from './serializeRange';

describe('numeric range expressions', () => {
    it.each(['first+100', 'first-100'])('loads %s as an offset from the first point', (input) => {
        const expression = parseNumericExpression(input);
        expect(expression).toEqual({ anchor: 'data_start', offset: 100 });
        expect(formatNumericExpression(expression!)).toBe('first+100');
    });

    it('preserves last offsets and rejects last plus an offset', () => {
        expect(parseNumericExpression('last-100')).toEqual({ anchor: 'data_end', offset: 100 });
        expect(parseNumericExpression('last+100')).toBeUndefined();
    });
});

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
