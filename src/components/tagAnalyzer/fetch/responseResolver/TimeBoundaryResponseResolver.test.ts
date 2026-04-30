import {
    resolveTimeBoundaryRangePairFromNanosecondRows,
    resolveTimeBoundaryRangePairFromRows,
} from './TimeBoundaryResponseResolver';

describe('TimeBoundaryResponseResolver', () => {
    function createAbsoluteBoundary(timestamp: number) {
        return { kind: 'absolute' as const, timestamp };
    }

    it('converts nanosecond rows into millisecond boundary pairs', () => {
        expect(
            resolveTimeBoundaryRangePairFromNanosecondRows([
                [1_000_000, 4_000_000],
                [3_000_000, 9_000_000],
            ]),
        ).toEqual({
            start: {
                min: createAbsoluteBoundary(1),
                max: createAbsoluteBoundary(3),
            },
            end: {
                min: createAbsoluteBoundary(4),
                max: createAbsoluteBoundary(9),
            },
        });
    });

    it('filters unresolved row values before building the range pair', () => {
        expect(
            resolveTimeBoundaryRangePairFromRows([
                [null, 4],
                [3, null],
                [2, 6],
            ]),
        ).toEqual({
            start: {
                min: createAbsoluteBoundary(2),
                max: createAbsoluteBoundary(2),
            },
            end: {
                min: createAbsoluteBoundary(6),
                max: createAbsoluteBoundary(6),
            },
        });
    });
});

