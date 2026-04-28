import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../../series/PanelSeriesTypes';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../series/PanelSeriesTypes';
import type {
    LegacyCompatibleSeriesConfig,
    LegacyTagNameItem,
} from './LegacySeriesTypes';

export function normalizeLegacySeriesConfigs(
    items: LegacyCompatibleSeriesConfig[],
): PanelSeriesDefinition[] {
    return items.map((item) => normalizeLegacySeriesConfig(item));
}

export function toLegacyTagNameItem<T extends { sourceTagName: string | undefined }>(
    item: T,
): LegacyTagNameItem<T> {
    const { sourceTagName, ...rest } = item;

    return {
        ...rest,
        tagName: sourceTagName || '',
    } as LegacyTagNameItem<T>;
}

export function toLegacyTagNameList<T extends { sourceTagName: string | undefined }>(
    items: T[],
): Array<LegacyTagNameItem<T>> {
    return items.map((item) => toLegacyTagNameItem(item));
}

export function toLegacySeriesConfigs(
    items: PanelSeriesDefinition[],
): LegacyCompatibleSeriesConfig[] {
    return toLegacyTagNameList<PanelSeriesDefinition>(items).map((item) => {
        const legacySeriesConfig = item as LegacyTagNameItem<PanelSeriesDefinition>;

        return {
            ...legacySeriesConfig,
            use_y2: toLegacyBoolean(legacySeriesConfig.useSecondaryAxis),
        };
    }) as LegacyCompatibleSeriesConfig[];
}

export function fromLegacyBoolean(value: 'Y' | 'N' | undefined): boolean {
    return value === 'Y';
}

export function toLegacyBoolean(value: boolean): 'Y' | 'N' {
    return value ? 'Y' : 'N';
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
        ...rest
    } = item;

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
        annotations: [],
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
