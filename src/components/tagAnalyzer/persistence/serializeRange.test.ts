import { decodeAxisRange, encodeAxisRange } from './serializeRange';

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
