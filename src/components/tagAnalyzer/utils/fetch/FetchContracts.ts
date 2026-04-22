import type { SeriesConfig } from '../series/seriesTypes';
import type {
    ResolvedTimeBounds,
    UnixMilliseconds,
    ValueRangePair,
} from '../time/timeTypes';

export type TagFetchRow = [number, number, ...unknown[]] | number[];

export type ChartFetchResponse = {
    data:
        | {
              column?: string[] | undefined;
              rows: TagFetchRow[] | undefined;
          }
        | undefined;
};

export type SeriesFetchColumnMap = {
    name: string;
    time: string;
    value: string;
};

export type CalculationFetchRequest = {
    Table: string;
    TagNames: string;
    Start: UnixMilliseconds;
    End: UnixMilliseconds;
    CalculationMode: string;
    IntervalType: string;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
    RollupList: string[];
};

export type RawFetchRequest = {
    Table: string;
    TagNames: string;
    Start: UnixMilliseconds;
    End: UnixMilliseconds;
    CalculationMode: string;
    IntervalType: string;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
    Direction?: number;
    useSampling: boolean | undefined;
    sampleValue: number | string | undefined;
};

export type TopLevelTimeBoundaryRequest = {
    tagSet: SeriesConfig[];
    boardTime: ResolvedTimeBounds;
};

export type TopLevelTimeBoundaryResponse = ValueRangePair | undefined;
