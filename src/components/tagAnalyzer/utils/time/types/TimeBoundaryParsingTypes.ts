import type {
    AbsoluteTimeBoundary,
    RelativeTimeBoundary,
    TimeBoundary,
} from './TimeTypes';

export type RelativeTimeRangeConfig = {
    start: RelativeTimeBoundary;
    end: RelativeTimeBoundary;
};

export type LastRelativeTimeBoundary = RelativeTimeBoundary & { anchor: 'last' };

export type LastRelativeTimeRangeConfig = {
    start: LastRelativeTimeBoundary;
    end: LastRelativeTimeBoundary;
};

export type NowRelativeTimeBoundary = RelativeTimeBoundary & { anchor: 'now' };

export type NowRelativeTimeRangeConfig = {
    start: NowRelativeTimeBoundary;
    end: NowRelativeTimeBoundary;
};

export type AbsoluteTimeRangeConfig = {
    start: AbsoluteTimeBoundary;
    end: AbsoluteTimeBoundary;
};

export type TimeRangeConfigOf<TBoundary extends TimeBoundary> = {
    start: TBoundary;
    end: TBoundary;
};
