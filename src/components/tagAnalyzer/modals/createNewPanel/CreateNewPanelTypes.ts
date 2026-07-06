import type { PanelSeriesSourceColumns } from '../../domain/SeriesDomain';

export type BaseNewPanelSeriesPath = {
    key: string;
    table: string;
    tagName: string;
    calculationMode: string;
    sourceColumns: PanelSeriesSourceColumns;
};

type NumericNewPanelSeriesPath = BaseNewPanelSeriesPath & {
    kind: 'numeric';
};

type JsonNewPanelSeriesPath = BaseNewPanelSeriesPath & {
    kind: 'json';
};

type RollupNewPanelSeriesPath = BaseNewPanelSeriesPath & {
    kind: 'rollup';
    rollupColumn: string | undefined;
};

export type NewPanelSeriesPath =
    | NumericNewPanelSeriesPath
    | JsonNewPanelSeriesPath
    | RollupNewPanelSeriesPath;
