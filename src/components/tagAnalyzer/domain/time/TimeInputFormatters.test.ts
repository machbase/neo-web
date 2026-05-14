import {
    formatUtcTimestampInput,
    parseUtcTimestampInput,
} from './TimeInputFormatters';

describe('TimeInputFormatters', () => {
    it('formats UTC timestamps down to milliseconds', () => {
        expect(formatUtcTimestampInput(Date.UTC(2026, 3, 24, 10, 11, 12, 345))).toBe(
            '2026-04-24 10:11:12.345',
        );
    });

    it('parses UTC date-time text down to milliseconds', () => {
        expect(parseUtcTimestampInput('2026-04-24 10:11:12.345')).toBe(
            Date.UTC(2026, 3, 24, 10, 11, 12, 345),
        );
    });

    it('keeps epoch-millisecond text valid for direct timestamp edits', () => {
        expect(parseUtcTimestampInput('123')).toBe(123);
    });

    it('rejects invalid UTC date-time text', () => {
        expect(parseUtcTimestampInput('2026-02-31 10:11:12.345')).toBeUndefined();
        expect(parseUtcTimestampInput('2026-04-24 10:61:12.345')).toBeUndefined();
    });
});
