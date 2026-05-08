import { NANOSECONDS_PER_MILLISECOND } from '../../time/TimeConstants';
import type {
    FetchedTimeBoundaryRange,
} from '../../time/TimeTypes';
import { createAbsoluteTimeBoundary } from '../../time/TimeBoundaryFactories';

export function resolveTimeBoundaryRangePairFromNanosecondRows(
    rows: Array<[number | null, number | null]> | undefined,
): FetchedTimeBoundaryRange | undefined {
    if (!rows || rows.length === 0) {
        return undefined;
    }

    return resolveTimeBoundaryRangePairFromRows(
        rows.map(([aStartNanoseconds, aEndNanoseconds]) => [
            typeof aStartNanoseconds === 'number'
                ? Math.floor(aStartNanoseconds / NANOSECONDS_PER_MILLISECOND)
                : null,
            typeof aEndNanoseconds === 'number'
                ? Math.floor(aEndNanoseconds / NANOSECONDS_PER_MILLISECOND)
                : null,
        ]),
    );
}

export function resolveTimeBoundaryRangePairFromRows(
    rows: Array<[number | null, number | null]> | undefined,
): FetchedTimeBoundaryRange | undefined {
    const sNumericRows = rows?.filter(
        (row): row is [number, number] =>
            typeof row[0] === 'number' && typeof row[1] === 'number',
    );
    if (!sNumericRows || sNumericRows.length === 0) {
        return undefined;
    }

    let sStartMin = sNumericRows[0][0];
    let sStartMax = sNumericRows[0][0];
    let sEndMin = sNumericRows[0][1];
    let sEndMax = sNumericRows[0][1];

    for (const [aStart, aEnd] of sNumericRows.slice(1)) {
        if (aStart < sStartMin) {
            sStartMin = aStart;
        }

        if (aStart > sStartMax) {
            sStartMax = aStart;
        }

        if (aEnd < sEndMin) {
            sEndMin = aEnd;
        }

        if (aEnd > sEndMax) {
            sEndMax = aEnd;
        }
    }

    return {
        start: {
            min: createAbsoluteTimeBoundary(sStartMin),
            max: createAbsoluteTimeBoundary(sStartMax),
        },
        end: {
            min: createAbsoluteTimeBoundary(sEndMin),
            max: createAbsoluteTimeBoundary(sEndMax),
        },
    };
}

