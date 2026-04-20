import { formatAxisTime } from './TagAnalyzerTimeUtils';

describe('TagAnalyzerTimeUtils', () => {
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
});
