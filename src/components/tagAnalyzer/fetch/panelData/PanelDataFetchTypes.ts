import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import type {
    IntervalOption,
    TimeRangeMs,
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
    IntervalType: string;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
    RollupList: RollupTableMap;
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
    CalculationMode: string;
    IntervalType: string;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
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

export type PanelSeriesFetchError = {
    kind: DataAvailabilityIssueKind;
    message: string;
};

export type PanelSeriesFetchResult = {
    seriesConfig: PanelSeriesDefinition;
    fetchResult: ChartFetchResponse;
    isLimitReached?: boolean;
    error?: PanelSeriesFetchError;
};

export type FetchPanelSeriesRowsResult = {
    seriesFetchResults: PanelSeriesFetchResult[];
    interval: IntervalOption;
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

export type PrimitiveErrorValue = string | number | boolean;

export type RequestSuccessPayload<TData> = {
    data: TData;
    success: boolean;
    reason?: string;
    elapse?: string;
};

export type HttpErrorResponse<TData = unknown> = {
    status: number;
    data: TData;
    statusText?: string;
};

export type ErrorMessageContainer = {
    reason?: unknown;
    message?: unknown;
};

export type RequestErrorData = PrimitiveErrorValue | ErrorMessageContainer | null;

export type RequestClientResponse<TData> =
    | RequestSuccessPayload<TData>
    | HttpErrorResponse<RequestErrorData>;

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

export type TableListFetchResponse = {
    success?: boolean;
    status?: number;
    data: unknown;
};

export type RawTableListData = {
    columns: unknown[];
    rows: unknown[];
};
