import moment from 'moment';
import { formatTimeRangeInputValue, parseTimeRangeInputValue } from './TimeRangeUtils';
import {
    isLastRelativeTimeValue,
    isNowRelativeTimeValue,
} from '../utils/TagAnalyzerDateUtils';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('TimeRangeUtils', () => {
    describe('formatTimeRangeInputValue', () => {
        it('keeps empty and relative values unchanged', () => {
            expect(formatTimeRangeInputValue('')).toBe('');
            expect(formatTimeRangeInputValue('now-1h')).toBe('now-1h');
            expect(formatTimeRangeInputValue('last-30m')).toBe('last-30m');
        });

        it('formats numeric millisecond values for the editor input', () => {
            expect(formatTimeRangeInputValue(ABSOLUTE_TIME_MILLIS)).toBe(ABSOLUTE_TIME_TEXT);
        });
    });

    describe('parseTimeRangeInputValue', () => {
        it('keeps relative expressions and blank values as strings', () => {
            expect(parseTimeRangeInputValue('')).toBe('');
            expect(parseTimeRangeInputValue('now-1h')).toBe('now-1h');
            expect(parseTimeRangeInputValue('last-30m')).toBe('last-30m');
            expect(parseTimeRangeInputValue('Now-1h')).toBe('Now-1h');
        });

        it('converts valid absolute dates into epoch milliseconds', () => {
            expect(parseTimeRangeInputValue(ABSOLUTE_TIME_TEXT)).toBe(ABSOLUTE_TIME_MILLIS);
        });

        it('leaves unparseable values untouched', () => {
            expect(parseTimeRangeInputValue('not-a-date')).toBe('not-a-date');
        });
    });

    describe('relative range guards', () => {
        it('detects last-based and now-based range values', () => {
            expect(isLastRelativeTimeValue('last-30m')).toBe(true);
            expect(isLastRelativeTimeValue('Last-30m')).toBe(true);
            expect(isLastRelativeTimeValue('now-30m')).toBe(false);
            expect(isNowRelativeTimeValue('now-30m')).toBe(true);
            expect(isNowRelativeTimeValue('Now-30m')).toBe(true);
            expect(isNowRelativeTimeValue(1000)).toBe(false);
        });
    });
});
