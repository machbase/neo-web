import moment from 'moment';
import { parseTimeRangeInputValue } from '../../time/TimeBoundaryParser';
import { formatTimeRangeInputValue } from './EditorTimeBoundaryValueFormatter';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(
    ABSOLUTE_TIME_TEXT,
    'YYYY-MM-DD HH:mm:ss',
    true,
).valueOf();

describe('EditorTimeBoundaryValueFormatter', () => {
    it('keeps empty and relative values in editor input format', () => {
        expect(formatTimeRangeInputValue({ kind: 'empty' })).toBe('');
        expect(formatTimeRangeInputValue(parseTimeRangeInputValue('now-1h')!)).toBe(
            'now-1h',
        );
        expect(formatTimeRangeInputValue(parseTimeRangeInputValue('last-30m')!)).toBe(
            'last-30m',
        );
    });

    it('formats absolute values for the editor input', () => {
        expect(
            formatTimeRangeInputValue({
                kind: 'absolute',
                timestamp: ABSOLUTE_TIME_MILLIS,
            }),
        ).toBe(ABSOLUTE_TIME_TEXT);
    });
});
