import moment from 'moment';
import {
    normalizeStoredTimeBoundaryRanges,
    normalizeStoredTimeRangeBoundary,
    toStoredTimeValue,
} from './StoredTimeRangeAdapter';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('StoredTimeRangeAdapter', () => {
    describe('normalizeStoredTimeBoundaryRanges', () => {
        it('converts stored min/max payloads into the nested TagAnalyzer range shape', () => {
            expect(
                normalizeStoredTimeBoundaryRanges({
                    bgn_min: 10,
                    bgn_max: 20,
                    end_min: 30,
                    end_max: 40,
                }),
            ).toEqual({
                start: { min: 10, max: 20 },
                end: { min: 30, max: 40 },
            });
        });
    });

    describe('normalizeStoredTimeRangeBoundary', () => {
        it('converts empty stored values into empty structured boundaries', () => {
            const sResolvedTimeBounds = normalizeStoredTimeRangeBoundary('', '');

            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe('');
            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe('');
        });

        it('converts stored absolute values into absolute structured boundaries', () => {
            const sResolvedTimeBounds = normalizeStoredTimeRangeBoundary(
                ABSOLUTE_TIME_MILLIS,
                ABSOLUTE_TIME_MILLIS + 60_000,
            );

            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe(
                ABSOLUTE_TIME_MILLIS,
            );
            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe(
                ABSOLUTE_TIME_MILLIS + 60_000,
            );
        });

        it('converts supported stored string expressions into structured boundaries', () => {
            const sResolvedTimeBounds = normalizeStoredTimeRangeBoundary('now-1h', 'now');

            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe('now-1h');
            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe('now');
        });

        it('preserves unsupported stored strings as raw boundaries', () => {
            const sResolvedTimeBounds = normalizeStoredTimeRangeBoundary('not-a-date', 'now');

            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe('not-a-date');
            expect(toStoredTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe('now');
        });
    });
});
