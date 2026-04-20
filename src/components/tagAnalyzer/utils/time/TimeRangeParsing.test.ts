import moment from 'moment';
import {
    formatAxisTime,
    formatTimeRangeInputValue,
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    parseTimeRangeInputValue,
} from './TimeRangeParsing';
import { toLegacyTimeValue } from '../legacy/LegacyTimeAdapter';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('TimeRangeParsing', () => {
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

    describe('formatTimeRangeInputValue', () => {
        it('keeps empty and relative values unchanged', () => {
            expect(formatTimeRangeInputValue({ kind: 'empty' })).toBe('');
            expect(formatTimeRangeInputValue(parseTimeRangeInputValue('now-1h')!)).toBe('now-1h');
            expect(formatTimeRangeInputValue(parseTimeRangeInputValue('last-30m')!)).toBe(
                'last-30m',
            );
        });

        it('formats numeric millisecond values for the editor input', () => {
            expect(
                formatTimeRangeInputValue({
                    kind: 'absolute',
                    timestamp: ABSOLUTE_TIME_MILLIS,
                }),
            ).toBe(ABSOLUTE_TIME_TEXT);
        });
    });

    describe('parseTimeRangeInputValue', () => {
        it('parses relative expressions and blank values into the structured holder', () => {
            expect(toLegacyTimeValue(parseTimeRangeInputValue('')!)).toBe('');
            expect(toLegacyTimeValue(parseTimeRangeInputValue('now-1h')!)).toBe('now-1h');
            expect(toLegacyTimeValue(parseTimeRangeInputValue('last-30m')!)).toBe('last-30m');
            expect(toLegacyTimeValue(parseTimeRangeInputValue('Now-1h')!)).toBe('Now-1h');
        });

        it('converts valid absolute dates into epoch milliseconds', () => {
            expect(toLegacyTimeValue(parseTimeRangeInputValue(ABSOLUTE_TIME_TEXT)!)).toBe(
                ABSOLUTE_TIME_MILLIS,
            );
        });

        it('ignores unparseable values while the user is still typing', () => {
            expect(parseTimeRangeInputValue('not-a-date')).toBeUndefined();
        });
    });

    describe('relative range guards', () => {
        it('detects matching structured range-config boundary types', () => {
            const sLastRangeConfig = {
                start: parseTimeRangeInputValue('last-30m')!,
                end: parseTimeRangeInputValue('last-10m')!,
            };
            const sNowRangeConfig = {
                start: parseTimeRangeInputValue('now-30m')!,
                end: parseTimeRangeInputValue('now')!,
            };
            const sAbsoluteRangeConfig = {
                start: {
                    kind: 'absolute' as const,
                    timestamp: ABSOLUTE_TIME_MILLIS,
                },
                end: {
                    kind: 'absolute' as const,
                    timestamp: ABSOLUTE_TIME_MILLIS + 60_000,
                },
            };
            const sMixedRangeConfig = {
                start: parseTimeRangeInputValue('now-30m')!,
                end: {
                    kind: 'absolute' as const,
                    timestamp: ABSOLUTE_TIME_MILLIS,
                },
            };

            expect(isRelativeTimeRangeConfig(sLastRangeConfig)).toBe(true);
            expect(isLastRelativeTimeRangeConfig(sLastRangeConfig)).toBe(true);
            expect(isNowRelativeTimeRangeConfig(sLastRangeConfig)).toBe(false);

            expect(isRelativeTimeRangeConfig(sNowRangeConfig)).toBe(true);
            expect(isNowRelativeTimeRangeConfig(sNowRangeConfig)).toBe(true);
            expect(isLastRelativeTimeRangeConfig(sNowRangeConfig)).toBe(false);

            expect(isAbsoluteTimeRangeConfig(sAbsoluteRangeConfig)).toBe(true);
            expect(isRelativeTimeRangeConfig(sAbsoluteRangeConfig)).toBe(false);

            expect(isRelativeTimeRangeConfig(sMixedRangeConfig)).toBe(false);
            expect(isAbsoluteTimeRangeConfig(sMixedRangeConfig)).toBe(false);
            expect(isLastRelativeTimeRangeConfig(undefined)).toBe(false);
        });
    });
});
