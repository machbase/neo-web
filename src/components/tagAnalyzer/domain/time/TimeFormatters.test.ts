import {
    formatAxisTime,
    formatDurationLabel,
    formatElapsedTimeLabel,
    formatUtcRangeLabel,
} from './TimeFormatters';

describe('TimeFormatters', () => {
    describe('formatUtcRangeLabel', () => {
        it('formats panel range labels in UTC to match the chart axis', () => {
            expect(formatUtcRangeLabel(Date.UTC(2026, 3, 7, 12, 34, 56))).toBe(
                '2026-04-07 12:34:56',
            );
        });
    });

    describe('formatAxisTime', () => {
        const sAxisTime = Date.UTC(2026, 3, 7, 12, 34, 56);

        it('shows seconds when the visible span is one hour or less', () => {
            expect(
                formatAxisTime(sAxisTime, {
                    startTime: sAxisTime - 30 * 60 * 1000,
                    endTime: sAxisTime + 30 * 60 * 1000,
                }),
            ).toBe('12:34:56');
        });

        it('shows hours and minutes when the visible span is one day or less', () => {
            expect(
                formatAxisTime(sAxisTime, {
                    startTime: sAxisTime - 2 * 60 * 60 * 1000,
                    endTime: sAxisTime + 2 * 60 * 60 * 1000,
                }),
            ).toBe('12:34');
        });

        it('shows month, day, and time when the visible span is within thirty days', () => {
            expect(
                formatAxisTime(sAxisTime, {
                    startTime: sAxisTime - 10 * 24 * 60 * 60 * 1000,
                    endTime: sAxisTime,
                }),
            ).toBe('04-07 12:34');
        });

        it('shows the full date when the visible span is longer than thirty days', () => {
            expect(
                formatAxisTime(sAxisTime, {
                    startTime: sAxisTime - 40 * 24 * 60 * 60 * 1000,
                    endTime: sAxisTime,
                }),
            ).toBe('2026-04-07');
        });
    });

    describe('formatDurationLabel', () => {
        it('formats duration parts in descending units', () => {
            expect(formatDurationLabel(0, 3_661_005)).toBe('1h 1m 1s  5ms');
        });
    });

    describe('formatElapsedTimeLabel', () => {
        it('formats elapsed milliseconds as total hours and minutes by default', () => {
            expect(formatElapsedTimeLabel(0)).toBe('00:00');
            expect(formatElapsedTimeLabel(30 * 60 * 1000)).toBe('00:30');
            expect(formatElapsedTimeLabel(60 * 60 * 1000)).toBe('01:00');
            expect(formatElapsedTimeLabel(25 * 60 * 60 * 1000)).toBe('25:00');
        });

        it('includes seconds when ticks are below one minute', () => {
            expect(formatElapsedTimeLabel(30 * 1000, 30 * 1000)).toBe('00:00:30');
            expect(formatElapsedTimeLabel(60 * 60 * 1000 + 5 * 1000, 30 * 1000)).toBe('01:00:05');
        });

        it('includes milliseconds when ticks are below one second', () => {
            expect(formatElapsedTimeLabel(1500, 500)).toBe('00:00:01.500');
        });
    });
});
