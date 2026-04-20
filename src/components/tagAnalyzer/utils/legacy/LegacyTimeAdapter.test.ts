import moment from 'moment';
import { normalizeLegacyTimeRangeBoundary, toLegacyTimeValue } from './LegacyTimeAdapter';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('LegacyTimeAdapter', () => {
    describe('normalizeLegacyTimeRangeBoundary', () => {
        it('converts empty legacy values into empty structured boundaries', () => {
            const sResolvedTimeBounds = normalizeLegacyTimeRangeBoundary('', '');

            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe('');
            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe('');
        });

        it('converts legacy absolute values into absolute structured boundaries', () => {
            const sResolvedTimeBounds = normalizeLegacyTimeRangeBoundary(
                ABSOLUTE_TIME_MILLIS,
                ABSOLUTE_TIME_MILLIS + 60_000,
            );

            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe(
                ABSOLUTE_TIME_MILLIS,
            );
            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe(
                ABSOLUTE_TIME_MILLIS + 60_000,
            );
        });

        it('converts supported legacy string expressions into structured boundaries', () => {
            const sResolvedTimeBounds = normalizeLegacyTimeRangeBoundary('now-1h', 'now');

            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe('now-1h');
            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe('now');
        });

        it('preserves unsupported legacy strings as raw boundaries', () => {
            const sResolvedTimeBounds = normalizeLegacyTimeRangeBoundary('not-a-date', 'now');

            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.start)).toBe('not-a-date');
            expect(toLegacyTimeValue(sResolvedTimeBounds.rangeConfig.end)).toBe('now');
        });
    });
});
