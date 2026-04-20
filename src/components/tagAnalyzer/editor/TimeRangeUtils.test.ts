import moment from 'moment';
import {
    isLastRelativeTimeValue,
    isNowRelativeTimeValue,
} from '../utils/TagAnalyzerTimeRangeUtils';
import {
    createTimeRangeConfig,
    formatTimeRangeInputValue,
    isAbsoluteTimeRangeConfig,
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    isRelativeTimeRangeConfig,
    parseLegacyTimeBoundary,
    parseTimeRangeInputValue,
    toLegacyTimeValue,
} from '../utils/TagAnalyzerTimeRangeConfig';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('TimeRangeUtils', () => {
    describe('formatTimeRangeInputValue', () => {
        it('keeps empty and relative values unchanged', () => {
            expect(formatTimeRangeInputValue(parseLegacyTimeBoundary(''))).toBe('');
            expect(formatTimeRangeInputValue(parseLegacyTimeBoundary('now-1h'))).toBe('now-1h');
            expect(formatTimeRangeInputValue(parseLegacyTimeBoundary('last-30m'))).toBe('last-30m');
        });

        it('formats numeric millisecond values for the editor input', () => {
            expect(formatTimeRangeInputValue(parseLegacyTimeBoundary(ABSOLUTE_TIME_MILLIS))).toBe(
                ABSOLUTE_TIME_TEXT,
            );
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
        it('detects last-based and now-based range values', () => {
            expect(isLastRelativeTimeValue('last-30m')).toBe(true);
            expect(isLastRelativeTimeValue('Last-30m')).toBe(true);
            expect(isLastRelativeTimeValue('now-30m')).toBe(false);
            expect(isNowRelativeTimeValue('now-30m')).toBe(true);
            expect(isNowRelativeTimeValue('Now-30m')).toBe(true);
            expect(isNowRelativeTimeValue('2024-03-09 16:00:00')).toBe(false);
        });

        it('detects matching structured range-config boundary types', () => {
            const sLastRangeConfig = createTimeRangeConfig(
                parseLegacyTimeBoundary('last-30m'),
                parseLegacyTimeBoundary('last-10m'),
            );
            const sNowRangeConfig = createTimeRangeConfig(
                parseLegacyTimeBoundary('now-30m'),
                parseLegacyTimeBoundary('now'),
            );
            const sAbsoluteRangeConfig = createTimeRangeConfig(
                parseLegacyTimeBoundary(ABSOLUTE_TIME_MILLIS),
                parseLegacyTimeBoundary(ABSOLUTE_TIME_MILLIS + 60_000),
            );
            const sMixedRangeConfig = createTimeRangeConfig(
                parseLegacyTimeBoundary('now-30m'),
                parseLegacyTimeBoundary(ABSOLUTE_TIME_MILLIS),
            );

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
