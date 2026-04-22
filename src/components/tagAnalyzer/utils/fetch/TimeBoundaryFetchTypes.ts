import type { SeriesColumns } from '../series/seriesTypes';

export type BoundarySeries = {
    table: string;
    sourceTagName: string | undefined;
    colName: SeriesColumns | undefined;
};

export type VirtualStatTagSet = {
    colName?: Pick<SeriesColumns, 'time'> | undefined;
};

export type TableTagMap = {
    table: string;
    tags: string[];
    cols: SeriesColumns | undefined;
};

export type BoundaryTimeRange = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

export type MinMaxTableResponse = {
    data:
        | {
              rows: Array<[number | null, number | null]> | undefined;
          }
        | undefined;
};
