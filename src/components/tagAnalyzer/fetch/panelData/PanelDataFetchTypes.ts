import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import type {
    IntervalOption,
    TimeRangeMs,
    TimeUnit,
    UnixMilliseconds,
} from '../../domain/time/TimeTypes';

export type TagFetchRow = [number, number | null, ...unknown[]];

export type ChartFetchResponse = {
    data: {
        column: string[];
        rows: TagFetchRow[];
    };
};

export type SeriesFetchColumnMap = {
    name: string;
    time: string;
    value: string;
    jsonKey?: string | undefined;
    timeType?: number | undefined;
    timeBaseTime?: boolean | undefined;
};

export type CalculationFetchRequest = {
    Table: string;
    TagNames: string;
    Start: UnixMilliseconds;
    End: UnixMilliseconds;
    CalculationMode: string;
    IntervalType: TimeUnit;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
    rollupColumnName?: string | undefined;
};

export type RawFetchSampling =
    | {
          kind: 'disabled';
      }
    | {
          kind: 'enabled';
          value: number | string;
      };

export enum SortOrderEnum {
    Unsorted = 'unsorted',
    Ascending = 'ascending',
    Descending = 'descending',
}

export type RawFetchRequest = {
    Table: string;
    TagNames: string;
    Start: UnixMilliseconds;
    End: UnixMilliseconds;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    SortOrder?: SortOrderEnum;
    sampling: RawFetchSampling;
};

export type DataAvailabilityIssueKind =
    | 'missing-table'
    | 'missing-tag'
    | 'no-data'
    | 'request-failed';

export type DataAvailabilityIssue = {
    kind: DataAvailabilityIssueKind;
    table: string;
    tagName?: string;
    message: string;
};

export type DataAvailabilityResult = {
    timeRange: TimeRangeMs | undefined;
    issues: DataAvailabilityIssue[];
};

type PanelSeriesFetchError = {
    kind: DataAvailabilityIssueKind;
    message: string;
};

export type PanelSeriesFetchResult = {
    seriesConfig: PanelSeriesDefinition;
    fetchResult: ChartFetchResponse;
    usesRollup: boolean;
    isLimitReached?: boolean;
    error?: PanelSeriesFetchError;
};

export type PanelSeriesRollupStatus = {
    seriesName: string;
    usesRollup: boolean;
};

export type FetchPanelSeriesRowsResult = {
    seriesFetchResults: PanelSeriesFetchResult[];
    interval?: IntervalOption;
    numericInterval?: number;
    count: number;
    isRaw: boolean;
};

export type DataRangeSeries = {
    table: string;
    sourceTagName: string | undefined;
    sourceColumns: PanelSeriesSourceColumns;
};

export type TableTagMap = {
    table: string;
    tags: string[];
    cols: PanelSeriesSourceColumns;
};

export type CalculationTimeGroupKeySqlInfo = {
    outerTimeExpressionSql: string;
    nonRollupBucketIntervalSeconds: number;
};

export type ChartFetchApiResponse = {
    status?: number;
    success?: boolean;
    data: unknown;
    statusText?: string;
    reason?: unknown;
    message?: unknown;
    error?: unknown;
};

export type RollupTableMap = Record<string, Record<string, Record<string, string[]>>>;
