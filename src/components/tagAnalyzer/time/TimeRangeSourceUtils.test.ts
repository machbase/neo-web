import { EMPTY_TIME_RANGE } from './TimeConstants';
import {
    resolvePanelOrBoardTimeRange,
} from './TimeRangeSourceUtils';
import { parseTimeRangeConfigFromBoundaryValues } from './TimeBoundaryParser';

describe('TimeRangeSourceUtils', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('keeps the shared empty time range concrete', () => {
        expect(EMPTY_TIME_RANGE).toEqual({
            startTime: 0,
            endTime: 0,
        });
    });

    describe('resolvePanelOrBoardTimeRange', () => {
        it('prefers panel-level range values when they exist', () => {
            expect(
                resolvePanelOrBoardTimeRange(
                    {
                        rangeConfig: {
                            start: { kind: 'absolute', timestamp: 100 },
                            end: { kind: 'absolute', timestamp: 200 },
                        },
                    },
                    parseTimeRangeConfigFromBoundaryValues(300, 400),
                ),
            ).toEqual({
                startTime: 100,
                endTime: 200,
            });
        });

        it('falls back to the board range when panel values are empty', () => {
            expect(
                resolvePanelOrBoardTimeRange(
                    {
                        rangeConfig: parseTimeRangeConfigFromBoundaryValues('', ''),
                    },
                    parseTimeRangeConfigFromBoundaryValues(300, 400),
                ),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('falls back to the empty range when panel and board values are absent', () => {
            expect(
                resolvePanelOrBoardTimeRange(
                    {
                        rangeConfig: parseTimeRangeConfigFromBoundaryValues('', ''),
                    },
                    undefined,
                ),
            ).toEqual({
                startTime: 0,
                endTime: 0,
            });
        });

        it('returns already-resolved numeric ranges unchanged', () => {
            expect(
                resolvePanelOrBoardTimeRange(
                    {
                        rangeConfig: {
                            start: {
                                kind: 'absolute',
                                timestamp: new Date('2026-04-06T22:00:00.000Z').getTime(),
                            },
                            end: {
                                kind: 'absolute',
                                timestamp: new Date('2026-04-06T23:30:00.000Z').getTime(),
                            },
                        },
                    },
                    undefined,
                ),
            ).toEqual({
                startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                endTime: new Date('2026-04-06T23:30:00.000Z').getTime(),
            });
        });

        it('falls back to the board range when the panel range is incomplete', () => {
            expect(
                resolvePanelOrBoardTimeRange(
                    {
                        rangeConfig: {
                            start: parseTimeRangeConfigFromBoundaryValues('', '').start,
                            end: parseTimeRangeConfigFromBoundaryValues(400, 400).end,
                        },
                    },
                    parseTimeRangeConfigFromBoundaryValues(500, 600),
                ),
            ).toEqual({
                startTime: 500,
                endTime: 600,
            });
        });

        it('converts immediate relative panel ranges into numeric timestamps', () => {
            expect(
                resolvePanelOrBoardTimeRange(
                    {
                        rangeConfig: parseTimeRangeConfigFromBoundaryValues(
                            'now-2h',
                            'now-1h',
                        ),
                    },
                    undefined,
                ),
            ).toEqual({
                startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                endTime: new Date('2026-04-06T23:00:00.000Z').getTime(),
            });
        });
    });
});
