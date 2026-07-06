import type { PanelSeriesSourceColumns } from '../../domain/SeriesDomain';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';

export enum NewPanelTimeType {
    DateTime = 'dateTime',
    Numeric = 'numeric',
    Unselected = 'unselected',
}

export type NewPanelTimeTypeSource = {
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined;
};

export function getNewPanelTimeTypeFromSourceColumns(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): NewPanelTimeType {
    if (!sourceColumns?.time) {
        return NewPanelTimeType.Unselected;
    }

    return sourceColumns.timeBaseTime === true &&
        Number(sourceColumns.timeType) !== DATETIME_COLUMN_TYPE
        ? NewPanelTimeType.Numeric
        : NewPanelTimeType.DateTime;
}

export function getNewPanelTimeTypeFromSeries(
    seriesList: NewPanelTimeTypeSource[],
): NewPanelTimeType {
    const sSelectedTypes = Array.from(
        new Set(
            seriesList
                .map((series) => getNewPanelTimeTypeFromSourceColumns(series.sourceColumns))
                .filter((timeType) => timeType !== NewPanelTimeType.Unselected),
        ),
    );

    return sSelectedTypes.length === 1
        ? sSelectedTypes[0]
        : NewPanelTimeType.Unselected;
}

export function isNewPanelTableTimeTypeCompatible(
    selectedTimeType: NewPanelTimeType,
    tableTimeType: NewPanelTimeType | undefined,
): boolean {
    return (
        selectedTimeType === NewPanelTimeType.Unselected ||
        tableTimeType === undefined ||
        tableTimeType === NewPanelTimeType.Unselected ||
        selectedTimeType === tableTimeType
    );
}

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
