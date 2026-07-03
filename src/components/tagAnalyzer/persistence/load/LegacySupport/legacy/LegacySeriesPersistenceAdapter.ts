import {
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../../../../domain/SeriesDomain';
import type { LegacyCompatibleSeriesConfig } from './LegacySeriesTypes';

export function normalizeLegacySeriesConfigs(
    items: LegacyCompatibleSeriesConfig[],
): PanelSeriesDefinition[] {
    return items.map((item) => normalizeLegacySeriesConfig(item));
}

export function fromLegacyBoolean(value: 'Y' | 'N' | undefined): boolean {
    return value === 'Y';
}

function normalizeLegacySeriesConfig(item: LegacyCompatibleSeriesConfig): PanelSeriesDefinition {
    const {
        key,
        table,
        alias,
        calculationMode,
        color,
        id,
        sourceColumns,
        columnNames,
        colName,
        tagName,
        sourceTagName,
        use_y2,
        onRollup,
        annotations,
        ...rest
    } = item;
    void annotations;

    return {
        key: key,
        table: table,
        alias: alias,
        calculationMode: calculationMode,
        color: color,
        id: id,
        sourceColumns: createRuntimeSourceColumnsFromLegacyFields(
            sourceColumns,
            columnNames,
            colName,
        ),
        ...rest,
        sourceTagName: sourceTagName || tagName || '',
        useSecondaryAxis: fromLegacyBoolean(use_y2),
        useRollupTable: onRollup ?? false,
    };
}

function createRuntimeSourceColumnsFromLegacyFields(
    sourceColumns: PanelSeriesSourceColumns | undefined,
    legacyColumnNames: PanelSeriesSourceColumns | undefined,
    legacyColName: PanelSeriesSourceColumns | undefined,
): PanelSeriesSourceColumns {
    const resolvedSourceColumns = sourceColumns ?? legacyColumnNames ?? legacyColName;

    return {
        ...(resolvedSourceColumns ?? {}),
        name: resolvedSourceColumns?.name ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: resolvedSourceColumns?.time ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: resolvedSourceColumns?.value ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
    };
}
