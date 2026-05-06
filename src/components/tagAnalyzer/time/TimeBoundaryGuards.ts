import type {
    AbsoluteTimeBoundary,
    EmptyTimeBoundary,
    LastTimeBoundary,
    TimeBoundary,
} from './TimeTypes';

export function isEmptyTimeBoundary(boundary: TimeBoundary): boundary is EmptyTimeBoundary {
    return boundary.kind === 'empty';
}

export function isAbsoluteTimeBoundary(
    boundary: TimeBoundary,
): boundary is AbsoluteTimeBoundary {
    return boundary.kind === 'absolute';
}

export function isLastTimeBoundary(boundary: TimeBoundary): boundary is LastTimeBoundary {
    return boundary.kind === 'last';
}
