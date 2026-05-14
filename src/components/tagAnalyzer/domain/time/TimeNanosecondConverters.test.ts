import {
    convertTimeRangeMsToNanoseconds,
    convertUnixMillisecondsToNanoseconds,
} from './TimeNanosecondConverters';

describe('TimeNanosecondConverters', () => {
    it('converts one millisecond timestamp into nanoseconds', () => {
        expect(convertUnixMillisecondsToNanoseconds(123)).toBe(123000000);
    });

    it('converts a millisecond range into a nanosecond fetch range', () => {
        expect(
            convertTimeRangeMsToNanoseconds({
                startTime: 100,
                endTime: 200,
            }),
        ).toEqual({
            startTime: 100000000,
            endTime: 200000000,
        });
    });
});
