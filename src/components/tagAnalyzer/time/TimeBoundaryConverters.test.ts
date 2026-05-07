import moment from 'moment';
import {
    parseTimeRangeConfigFromBoundaryValues,
    parseTimeRangeInputValue,
} from './TimeBoundaryParser';

const ABSOLUTE_TIME_TEXT = '2024-03-09 16:00:00';
const ABSOLUTE_TIME_MILLIS = moment(ABSOLUTE_TIME_TEXT, 'YYYY-MM-DD HH:mm:ss', true).valueOf();

describe('TimeBoundaryConverters', () => {
    describe('parseTimeRangeConfigFromBoundaryValues', () => {
        it('normalizes blank stored values into empty boundaries', () => {
            expect(parseTimeRangeConfigFromBoundaryValues('', '')).toEqual({
                start: { kind: 'empty' },
                end: { kind: 'empty' },
            });
        });

        it('normalizes numeric stored values into absolute boundaries', () => {
            expect(parseTimeRangeConfigFromBoundaryValues(1000, 2000)).toEqual({
                start: { kind: 'absolute', timestamp: 1000 },
                end: { kind: 'absolute', timestamp: 2000 },
            });
        });

        it('normalizes supported relative strings into relative boundaries', () => {
            expect(parseTimeRangeConfigFromBoundaryValues('now-1h', 'now')).toEqual({
                start: {
                    kind: 'now',
                    amount: 1,
                    unit: 'hour',
                },
                end: {
                    kind: 'now',
                    amount: 0,
                    unit: 'millisecond',
                },
            });
        });

        it('collapses unsupported stored strings into empty boundaries', () => {
            expect(parseTimeRangeConfigFromBoundaryValues('not-a-date', 'now')).toEqual({
                start: { kind: 'empty' },
                end: {
                    kind: 'now',
                    amount: 0,
                    unit: 'millisecond',
                },
            });
        });
    });

    describe('parseTimeRangeInputValue', () => {
        it('parses relative expressions and blank values into the structured holder', () => {
            expect(parseTimeRangeInputValue('')).toEqual({ kind: 'empty' });
            expect(parseTimeRangeInputValue('now-1h')).toEqual({
                kind: 'now',
                amount: 1,
                unit: 'hour',
            });
            expect(parseTimeRangeInputValue('last-30m')).toEqual({
                kind: 'last',
                amount: 30,
                unit: 'min',
            });
            expect(parseTimeRangeInputValue('Now-1h')).toEqual({
                kind: 'now',
                amount: 1,
                unit: 'hour',
            });
        });

        it('converts valid absolute dates into epoch milliseconds', () => {
            expect(parseTimeRangeInputValue(ABSOLUTE_TIME_TEXT)).toEqual({
                kind: 'absolute',
                timestamp: ABSOLUTE_TIME_MILLIS,
            });
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

            expect(sLastRangeConfig.start.kind === 'last').toBe(true);
            expect(sLastRangeConfig.end.kind === 'last').toBe(true);

            expect(sNowRangeConfig.start.kind === 'now').toBe(true);
            expect(sNowRangeConfig.end.kind === 'now').toBe(true);

            expect(sMixedRangeConfig.start.kind === 'last').toBe(false);
            expect(sAbsoluteRangeConfig.start.kind === 'absolute').toBe(true);
            expect(sAbsoluteRangeConfig.end.kind === 'absolute').toBe(true);
            expect(sMixedRangeConfig.start.kind === 'absolute').toBe(false);
        });
    });
});


