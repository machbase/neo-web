import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../series/PanelSeriesTypes';
import type {
    ChartRow,
    ChartSeriesItem,
    PanelSeriesSourceColumns,
    PanelSeriesConfig,
} from '../series/PanelSeriesTypes';
import type {
    LegacyChartPoint,
    LegacyChartSeries,
    LegacyCompatibleSeriesConfig,
    LegacyNormalizedSourceTagName,
    LegacySourceTagNameInput,
    LegacyTagNameItem,
} from './LegacyTypes';

/**
 * Gets the source tag name from a legacy source-tag input.
 * Intent: Normalize `sourceTagName` and `tagName` into one lookup for downstream adapters.
 * @param {LegacySourceTagNameInput} item - The legacy item to inspect.
 * @returns {string} The resolved source tag name, or an empty string when none is present.
 */
export function getSourceTagName(item: LegacySourceTagNameInput): string {
    if ('sourceTagName' in item && item.sourceTagName) {
        return item.sourceTagName;
    }

    if ('tagName' in item && item.tagName) {
        return item.tagName;
    }

    return '';
}

/**
 * Returns a copy of the item with `sourceTagName` normalized.
 * Intent: Keep every legacy tag record on one canonical field before it flows to newer code.
 * @param {T} item - The legacy item to normalize.
 * @returns {LegacyNormalizedSourceTagName<T>} The item with a normalized `sourceTagName`.
 */
export function withNormalizedSourceTagName<T extends LegacySourceTagNameInput>(
    item: T,
): LegacyNormalizedSourceTagName<T> {
    const sItem = item as T & {
        sourceTagName: string | undefined;
        tagName: string | undefined;
    };
    const { tagName, sourceTagName, ...sRest } = sItem;

    return {
        ...sRest,
        sourceTagName: sourceTagName || tagName || '',
    } as LegacyNormalizedSourceTagName<T>;
}

/**
 * Normalizes the source tag name on each legacy item in a list.
 * Intent: Batch-convert legacy collections without duplicating per-item adapter logic.
 * @param {T[]} items - The legacy items to normalize.
 * @returns {Array<LegacyNormalizedSourceTagName<T>>} The normalized items.
 */
export function normalizeSourceTagNames<T extends LegacySourceTagNameInput>(
    items: T[],
): Array<LegacyNormalizedSourceTagName<T>> {
    return items.map((item) => withNormalizedSourceTagName(item));
}

/**
 * Converts legacy-compatible series configs into modern series configs.
 * Intent: Keep legacy series shape translation in one adapter entry point.
 * @param {LegacyCompatibleSeriesConfig[]} items - The legacy series configs to convert.
 * @returns {PanelSeriesConfig[]} The converted series configs.
 */
export function normalizeLegacySeriesConfigs(
    items: LegacyCompatibleSeriesConfig[],
): PanelSeriesConfig[] {
    return items.map((item) => normalizeLegacySeriesConfig(item));
}

/**
 * Converts legacy chart series data into the chart-series data shape.
 * Intent: Bridge legacy series storage into the chart renderer without exposing legacy arrays.
 * @param {LegacyChartSeries} series - The legacy chart series to convert.
 * @returns {Pick<ChartSeriesItem, 'data'>} The chart-series data payload.
 */
export function normalizeLegacyChartSeries(
    series: LegacyChartSeries,
): Pick<ChartSeriesItem, 'data'> {
    return {
        data: legacyChartSeriesToRows(series),
    };
}

/**
 * Returns a copy of the item with `tagName` restored for legacy storage.
 * Intent: Preserve the old storage contract while keeping the modern `sourceTagName` field in memory.
 * @param {T} item - The item to convert.
 * @returns {LegacyTagNameItem<T>} The item with a legacy `tagName` field.
 */
export function toLegacyTagNameItem<T extends { sourceTagName: string | undefined }>(
    item: T,
): LegacyTagNameItem<T> {
    const { sourceTagName, ...sRest } = item;

    return {
        ...sRest,
        tagName: sourceTagName || '',
    } as LegacyTagNameItem<T>;
}

/**
 * Converts each item in a list back to the legacy tag-name shape.
 * Intent: Batch-serialize tag metadata for legacy storage writes.
 * @param {T[]} items - The items to convert.
 * @returns {Array<LegacyTagNameItem<T>>} The legacy tag-name items.
 */
export function toLegacyTagNameList<T extends { sourceTagName: string | undefined }>(
    items: T[],
): Array<LegacyTagNameItem<T>> {
    return items.map((item) => toLegacyTagNameItem(item));
}

/**
 * Converts modern series configs into the legacy-compatible series config list.
 * Intent: Serialize chart series data back into the format expected by old board storage.
 * @param {PanelSeriesConfig[]} items - The modern series configs to convert.
 * @returns {LegacyCompatibleSeriesConfig[]} The legacy-compatible series configs.
 */
export function toLegacySeriesConfigs(
    items: PanelSeriesConfig[],
): LegacyCompatibleSeriesConfig[] {
    return toLegacyTagNameList<PanelSeriesConfig>(items).map((item) => {
        const sLegacySeriesConfig = item as LegacyTagNameItem<PanelSeriesConfig>;

        return {
            ...sLegacySeriesConfig,
            use_y2: toLegacyBoolean(sLegacySeriesConfig.useSecondaryAxis as boolean),
        };
    }) as LegacyCompatibleSeriesConfig[];
}

/**
 * Converts a legacy series payload into chart point objects.
 * Intent: Feed the chart data pipeline with point objects instead of legacy row structures.
 * @param {Pick<ChartSeriesItem, 'data'> | LegacyChartSeries} series - The legacy or chart-series input.
 * @returns {LegacyChartPoint[]} The converted chart points.
 */
export function legacySeriesToChartPoints(
    series: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): LegacyChartPoint[] {
    return chartSeriesDataToRows(series).map((row) => ({
        x: row[0],
        y: row[1],
    }));
}

/**
 * Normalizes one legacy-compatible series config into the modern series config shape.
 * Intent: Collapse legacy field names and flag values before chart series state uses them.
 * @param {LegacyCompatibleSeriesConfig} item - The legacy-compatible series config to normalize.
 * @returns {PanelSeriesConfig} The normalized series config.
 */
function normalizeLegacySeriesConfig(item: LegacyCompatibleSeriesConfig): PanelSeriesConfig {
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
        ...sRest
    } = item;

    return {
        key,
        table,
        alias,
        calculationMode,
        color,
        id,
        sourceColumns: createRuntimeSourceColumnsFromLegacyFields(
            sourceColumns,
            columnNames,
            colName,
        ),
        ...sRest,
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
    const sSourceColumns = sourceColumns ?? legacyColumnNames ?? legacyColName;

    return {
        ...(sSourceColumns ?? {}),
        name: sSourceColumns?.name ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: sSourceColumns?.time ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: sSourceColumns?.value ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
    };
}

/**
 * Converts a legacy `Y`/`N` flag into a boolean.
 * Intent: Decode persisted legacy flags into standard boolean state.
 * @param {'Y' | 'N' | undefined} value - The legacy flag value.
 * @returns {boolean} `true` when the value is `Y`; otherwise `false`.
 */
export function fromLegacyBoolean(value: 'Y' | 'N' | undefined): boolean {
    return value === 'Y';
}

/**
 * Converts a boolean into a legacy `Y`/`N` flag.
 * Intent: Encode modern boolean state back into the storage format used by older records.
 * @param {boolean} value - The boolean value to convert.
 * @returns {'Y' | 'N'} The legacy flag value.
 */
export function toLegacyBoolean(value: boolean): 'Y' | 'N' {
    return value ? 'Y' : 'N';
}

/**
 * Checks whether a legacy series stores its data in x/y arrays.
 * Intent: Detect the legacy chart-series representation before converting it to rows.
 * @param {Pick<ChartSeriesItem, 'data'> | LegacyChartSeries} series - The series to inspect.
 * @returns {boolean} `true` when the series has `xData` and `yData` arrays.
 */
function legacyChartSeriesHasArrays(
    series: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): series is LegacyChartSeries & { xData: number[]; yData: number[] } {
    return (
        Array.isArray((series as LegacyChartSeries).xData) &&
        Array.isArray((series as LegacyChartSeries).yData)
    );
}

/**
 * Converts a legacy chart series into chart rows.
 * Intent: Produce row-based chart data after the legacy array form is detected.
 * @param {LegacyChartSeries} series - The legacy chart series to convert.
 * @returns {ChartRow[]} The chart rows for the series.
 */
function chartSeriesDataToRows(
    series: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): ChartRow[] {
    if (legacyChartSeriesHasArrays(series)) {
        return series.xData.map((x, index) => [x, series.yData[index]]);
    }

    return (series.data ?? []).map(legacyChartDataItemToRow);
}

function legacyChartDataItemToRow(item: ChartRow | LegacyChartPoint): ChartRow {
    return Array.isArray(item) ? [item[0], item[1]] : [item.x, item.y];
}

function legacyChartSeriesToRows(series: LegacyChartSeries): ChartRow[] {
    return chartSeriesDataToRows(series);
}
