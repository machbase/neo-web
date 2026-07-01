import type { PanelSeriesSourceColumns } from '../../domain/SeriesDomain';

export type CreateNewPanelTagSearchItem = {
    id: string;
    name: string;
};

export type CreateNewPanelColumnMetadataRow =
    | [name: string, type: number, ...rest: unknown[]]
    | string[];


export type BaseNewPanelSeriesPath = {
    key: string;
    table: string;
    tagName: string;
    calculationMode: string;
    sourceColumns: PanelSeriesSourceColumns;
};

export type NumericNewPanelSeriesPath = BaseNewPanelSeriesPath & {
    kind: 'numeric';
};

export type JsonNewPanelSeriesPath = BaseNewPanelSeriesPath & {
    kind: 'json';
};

export type RollupNewPanelSeriesPath = BaseNewPanelSeriesPath & {
    kind: 'rollup';
    rollupColumn: string | undefined;
};

export type NewPanelSeriesPath =
    | NumericNewPanelSeriesPath
    | JsonNewPanelSeriesPath
    | RollupNewPanelSeriesPath;
