import type { PanelSeriesSourceColumns } from '../series/seriesTypes';

export type BoundarySeries = {
    table: string;
    sourceTagName: string | undefined;
    sourceColumns: PanelSeriesSourceColumns;
};

export type VirtualStatTagSet = {
    sourceColumns: Pick<PanelSeriesSourceColumns, 'time'>;
};

export type TableTagMap = {
    table: string;
    tags: string[];
    cols: PanelSeriesSourceColumns;
};

export type MinMaxTableResponse = {
    data:
        | {
              rows: Array<[number | null, number | null]> | undefined;
          }
        | undefined;
};
