import { resolveEditableTimeRangeInput } from './TimeRangeInputParsing';

const PREVIOUS_RANGE = {
    startTime: 10_000,
    endTime: 20_000,
};

describe('resolveEditableTimeRangeInput', () => {
    it('treats an empty input pair as empty with the previous concrete range', () => {
        const resolvedRange = resolveEditableTimeRangeInput({
            startValue: '',
            endValue: '',
            previousConcreteRange: PREVIOUS_RANGE,
            currentTime: 30_000,
            lastDataTime: PREVIOUS_RANGE.endTime,
        });

        expect(resolvedRange.status).toBe('empty');
        if (resolvedRange.status === 'empty') {
            expect(resolvedRange.rangeInput).toEqual({ start: '', end: '' });
            expect(resolvedRange.concreteRange).toEqual(PREVIOUS_RANGE);
        }
    });

    it('resolves a concrete range from relative input using last data time', () => {
        const resolvedRange = resolveEditableTimeRangeInput({
            startValue: 'last-5s',
            endValue: 'last',
            previousConcreteRange: PREVIOUS_RANGE,
            currentTime: 200_000,
            lastDataTime: 100_000,
        });

        expect(resolvedRange.status).toBe('valid');
        if (resolvedRange.status === 'valid') {
            expect(resolvedRange.rangeInput).toEqual({
                start: 'last-5s',
                end: 'last',
            });
            expect(resolvedRange.concreteRange).toEqual({
                startTime: 95_000,
                endTime: 100_000,
            });
        }
    });

    it('reports invalid when only one side is set or the range is reversed', () => {
        const partialRange = resolveEditableTimeRangeInput({
            startValue: '',
            endValue: 'now',
            previousConcreteRange: PREVIOUS_RANGE,
            currentTime: 30_000,
            lastDataTime: PREVIOUS_RANGE.endTime,
        });
        const reversedRange = resolveEditableTimeRangeInput({
            startValue: 'last',
            endValue: 'last-5s',
            previousConcreteRange: PREVIOUS_RANGE,
            currentTime: 30_000,
            lastDataTime: PREVIOUS_RANGE.endTime,
        });

        expect(partialRange.status).toBe('invalid');
        expect(reversedRange.status).toBe('invalid');
    });

    it('reports invalid for an unparseable expression', () => {
        const resolvedRange = resolveEditableTimeRangeInput({
            startValue: 'not a time',
            endValue: 'now',
            previousConcreteRange: PREVIOUS_RANGE,
            currentTime: 30_000,
            lastDataTime: PREVIOUS_RANGE.endTime,
        });

        expect(resolvedRange.status).toBe('invalid');
    });
});
