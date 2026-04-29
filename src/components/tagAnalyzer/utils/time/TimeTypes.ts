import type { ValueRange, ValueRangePair } from '../ValueRange';
import type { PanelShiftHandlers, PanelZoomHandlers } from '../../panel/PanelTypes';

export enum TimeUnit {
    Millisecond = 'ms',
    Second = 'sec',
    Minute = 'min',
    Hour = 'hour',
    Day = 'day',
    Week = 'week',
}

export type UnixMilliseconds = number;

export type UnixNanoseconds = number;

export type TimeRangeMs = {
    startTime: UnixMilliseconds;
    endTime: UnixMilliseconds;
};

export type TimeRangeNs = {
    startTime: UnixNanoseconds;
    endTime: UnixNanoseconds;
};

export type RelativeTimeAnchor = 'now' | 'last';

export type RelativeTimeUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

export type EmptyTimeBoundary = {
    kind: 'empty';
};

export type AbsoluteTimeBoundary = {
    kind: 'absolute';
    timestamp: UnixMilliseconds;
};

export type RelativeTimeBoundary = {
    kind: 'relative';
    anchor: RelativeTimeAnchor;
    amount: number;
    unit: RelativeTimeUnit | undefined;
    expression: string;
};

export type RawTimeBoundary = {
    kind: 'raw';
    value: string;
};

export type TimeBoundary =
    | EmptyTimeBoundary
    | AbsoluteTimeBoundary
    | RelativeTimeBoundary
    | RawTimeBoundary;

export type TimeRangeConfig = {
    start: TimeBoundary;
    end: TimeBoundary;
};

export type ResolvedTimeBounds = {
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
};

export type InputTimeBounds =
    | {
          kind: 'empty';
      }
    | {
          kind: 'resolved';
          value: ResolvedTimeBounds;
      };

export type IntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

export type TimeRangePair = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

export type PanelTimeRangeSource = {
    range: TimeRangeMs | undefined;
    defaultRange: TimeRangeMs;
};

export type RestoredTimeRangePairResult =
    | {
          kind: 'empty';
      }
    | {
          kind: 'resolved';
          value: TimeRangePair;
      };

export type PanelRangeResolutionMode = 'initialize' | 'reset';

export type ConcreteTimeRangeSource = ValueRangePair['start'] | TimeRangeConfig;

export type TimeUnitOption = {
    value: TimeUnit;
    label: TimeUnit;
    disabled: undefined;
};

export type IntervalSpec = {
    type:
        | TimeUnit.Second
        | TimeUnit.Minute
        | TimeUnit.Hour
        | TimeUnit.Day;
    value: number;
};

export type IntervalRule = {
    limit: number;
    buildIntervalSpec: (calc: number) => IntervalSpec;
};

export type RangeDirection = 'left' | 'right';

export type RangeSetter = (
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs | undefined,
) => void;

export type PanelRangeUpdate = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs | undefined;
};

export type PanelRangeControlHandlers = {
    shiftHandlers: PanelShiftHandlers;
    zoomHandlers: PanelZoomHandlers;
};

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
