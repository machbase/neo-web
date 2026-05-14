import type {
    AbsoluteTimeBoundary,
    EmptyTimeBoundary,
    LastTimeBoundary,
    NowTimeBoundary,
    TimeUnit,
} from './TimeTypes';

export function createEmptyTimeBoundary(): EmptyTimeBoundary {
    return { kind: 'empty' };
}

export function createAbsoluteTimeBoundary(
    timestamp: number,
): AbsoluteTimeBoundary {
    return {
        kind: 'absolute',
        timestamp,
    };
}

export function createAnchoredTimeBoundary(
    kind: NowTimeBoundary['kind'] | LastTimeBoundary['kind'],
    amount: number,
    unit: TimeUnit,
): NowTimeBoundary | LastTimeBoundary {
    return kind === 'now'
        ? {
              kind: 'now',
              amount,
              unit,
          }
        : {
              kind: 'last',
              amount,
              unit,
          };
}
