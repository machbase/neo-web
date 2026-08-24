import {
    calculateInterval,
    type IntervalOption,
    TimeUnit,
} from './intervalResolver';

const SECOND = 1_000;
const DAY = 24 * 60 * 60 * SECOND;

function intervalForDuration(durationMs: number): IntervalOption {
    return calculateInterval(0, durationMs, 100, 100);
}

describe('calculateInterval', () => {
    it.each([
        [1 * SECOND, TimeUnit.Second, 1],
        [2 * SECOND, TimeUnit.Second, 2],
        [5 * SECOND, TimeUnit.Second, 5],
        [10 * SECOND, TimeUnit.Second, 10],
        [15 * SECOND, TimeUnit.Second, 15],
        [30 * SECOND, TimeUnit.Second, 30],
        [60 * SECOND, TimeUnit.Minute, 1],
        [2 * 60 * SECOND, TimeUnit.Minute, 2],
        [5 * 60 * SECOND, TimeUnit.Minute, 5],
        [10 * 60 * SECOND, TimeUnit.Minute, 10],
        [15 * 60 * SECOND, TimeUnit.Minute, 15],
        [30 * 60 * SECOND, TimeUnit.Minute, 30],
        [60 * 60 * SECOND, TimeUnit.Hour, 1],
        [2 * 60 * 60 * SECOND, TimeUnit.Hour, 2],
        [3 * 60 * 60 * SECOND, TimeUnit.Hour, 3],
        [6 * 60 * 60 * SECOND, TimeUnit.Hour, 6],
        [12 * 60 * 60 * SECOND, TimeUnit.Hour, 12],
        [1 * DAY, TimeUnit.Day, 1],
        [2 * DAY, TimeUnit.Day, 2],
        [5 * DAY, TimeUnit.Day, 5],
        [10 * DAY, TimeUnit.Day, 10],
        [20 * DAY, TimeUnit.Day, 20],
        [50 * DAY, TimeUnit.Day, 50],
    ])(
        'keeps an exact ladder boundary at %d ms',
        (durationMs, expectedType, expectedValue) => {
            expect(intervalForDuration(durationMs)).toEqual({
                IntervalType: expectedType,
                IntervalValue: expectedValue,
            });
        },
    );

    it.each([
        [15 * SECOND, TimeUnit.Second, 15],
        [15 * SECOND + 1, TimeUnit.Second, 30],
        [5 * DAY, TimeUnit.Day, 5],
        [5 * DAY + 1, TimeUnit.Day, 10],
    ])(
        'selects the smallest step covering %d ms',
        (durationMs, expectedType, expectedValue) => {
            expect(intervalForDuration(durationMs)).toEqual({
                IntervalType: expectedType,
                IntervalValue: expectedValue,
            });
        },
    );

    it.each([
        [50 * DAY + 1, 100],
        [100 * DAY, 100],
        [100 * DAY + 1, 200],
        [200 * DAY + 1, 500],
    ])(
        'continues with 1/2/5 day steps above 50 days',
        (durationMs, expectedDays) => {
            expect(intervalForDuration(durationMs)).toEqual({
                IntervalType: TimeUnit.Day,
                IntervalValue: expectedDays,
            });
        },
    );

    it('uses one second as the minimum interval', () => {
        expect(intervalForDuration(SECOND / 2)).toEqual({
            IntervalType: TimeUnit.Second,
            IntervalValue: 1,
        });
    });
});
