import { formatOverlapElapsedTime } from './overlapTime';

describe('formatOverlapElapsedTime', () => {
    test('formats elapsed milliseconds as total hours and minutes by default', () => {
        expect(formatOverlapElapsedTime(0)).toBe('00:00');
        expect(formatOverlapElapsedTime(30 * 60 * 1000)).toBe('00:30');
        expect(formatOverlapElapsedTime(60 * 60 * 1000)).toBe('01:00');
        expect(formatOverlapElapsedTime(25 * 60 * 60 * 1000)).toBe('25:00');
    });

    test('includes seconds when ticks are below one minute', () => {
        expect(formatOverlapElapsedTime(30 * 1000, 30 * 1000)).toBe('00:00:30');
        expect(formatOverlapElapsedTime(60 * 60 * 1000 + 5 * 1000, 30 * 1000)).toBe('01:00:05');
    });

    test('includes milliseconds when ticks are below one second', () => {
        expect(formatOverlapElapsedTime(1500, 500)).toBe('00:00:01.500');
    });
});
