import moment from 'moment';
import { serializeTimeBoundaryValue } from '../../../time/TimeBoundaryParsing';
import { parseStoredTimeRangeBoundary } from './StoredTimeBoundaryParser';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('StoredTimeBoundaryParser', () => {
    describe('parseStoredTimeRangeBoundary', () => {
        it('converts empty stored values into empty structured boundaries', () => {
            const sResolvedTimeBounds = parseStoredTimeRangeBoundary('', '');

            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.start)).toBe('');
            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.end)).toBe('');
        });

        it('converts stored absolute values into absolute structured boundaries', () => {
            const sResolvedTimeBounds = parseStoredTimeRangeBoundary(
                ABSOLUTE_TIME_MILLIS,
                ABSOLUTE_TIME_MILLIS + 60_000,
            );

            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.start)).toBe(
                ABSOLUTE_TIME_MILLIS,
            );
            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.end)).toBe(
                ABSOLUTE_TIME_MILLIS + 60_000,
            );
        });

        it('converts supported stored string expressions into structured boundaries', () => {
            const sResolvedTimeBounds = parseStoredTimeRangeBoundary('now-1h', 'now');

            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.start)).toBe(
                'now-1h',
            );
            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.end)).toBe('now');
        });

        it('preserves unsupported stored strings as raw boundaries', () => {
            const sResolvedTimeBounds = parseStoredTimeRangeBoundary('not-a-date', 'now');

            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.start)).toBe(
                'not-a-date',
            );
            expect(serializeTimeBoundaryValue(sResolvedTimeBounds.rangeConfig.end)).toBe('now');
        });
    });
});
