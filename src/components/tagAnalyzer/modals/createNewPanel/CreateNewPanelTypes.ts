import {
    isNumericBaseTimeSourceColumns,
    type PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';

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

    return isNumericBaseTimeSourceColumns(sourceColumns)
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

export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
