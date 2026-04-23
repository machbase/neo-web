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
 * @param {LegacySourceTagNameInput} aItem - The legacy item to inspect.
 * @returns {string} The resolved source tag name, or an empty string when none is present.
 */
export function getSourceTagName(aItem: LegacySourceTagNameInput): string {
    if ('sourceTagName' in aItem && aItem.sourceTagName) {
        return aItem.sourceTagName;
    }

    if ('tagName' in aItem && aItem.tagName) {
        return aItem.tagName;
    }

    return '';
}

/**
 * Returns a copy of the item with `sourceTagName` normalized.
 * Intent: Keep every legacy tag record on one canonical field before it flows to newer code.
 * @param {T} aItem - The legacy item to normalize.
 * @returns {LegacyNormalizedSourceTagName<T>} The item with a normalized `sourceTagName`.
 */
export function withNormalizedSourceTagName<T extends LegacySourceTagNameInput>(
    aItem: T,
): LegacyNormalizedSourceTagName<T> {
    const sItem = aItem as T & {
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
 * @param {T[]} aItems - The legacy items to normalize.
 * @returns {Array<LegacyNormalizedSourceTagName<T>>} The normalized items.
 */
export function normalizeSourceTagNames<T extends LegacySourceTagNameInput>(
    aItems: T[],
): Array<LegacyNormalizedSourceTagName<T>> {
    return aItems.map((aItem) => withNormalizedSourceTagName(aItem));
}

/**
 * Converts legacy-compatible series configs into modern series configs.
 * Intent: Keep legacy series shape translation in one adapter entry point.
 * @param {LegacyCompatibleSeriesConfig[]} aItems - The legacy series configs to convert.
 * @returns {PanelSeriesConfig[]} The converted series configs.
 */
export function normalizeLegacySeriesConfigs(
    aItems: LegacyCompatibleSeriesConfig[],
): PanelSeriesConfig[] {
    return aItems.map((aItem) => normalizeLegacySeriesConfig(aItem));
}

/**
 * Converts legacy chart series data into the chart-series data shape.
 * Intent: Bridge legacy series storage into the chart renderer without exposing legacy arrays.
 * @param {LegacyChartSeries} aSeries - The legacy chart series to convert.
 * @returns {Pick<ChartSeriesItem, 'data'>} The chart-series data payload.
 */
export function normalizeLegacyChartSeries(
    aSeries: LegacyChartSeries,
): Pick<ChartSeriesItem, 'data'> {
    return {
        data: legacyChartSeriesToRows(aSeries),
    };
}

/**
 * Returns a copy of the item with `tagName` restored for legacy storage.
 * Intent: Preserve the old storage contract while keeping the modern `sourceTagName` field in memory.
 * @param {T} aItem - The item to convert.
 * @returns {LegacyTagNameItem<T>} The item with a legacy `tagName` field.
 */
export function toLegacyTagNameItem<T extends { sourceTagName: string | undefined }>(
    aItem: T,
): LegacyTagNameItem<T> {
    const { sourceTagName, ...sRest } = aItem;

    return {
        ...sRest,
        tagName: sourceTagName || '',
    } as LegacyTagNameItem<T>;
}

/**
 * Converts each item in a list back to the legacy tag-name shape.
 * Intent: Batch-serialize tag metadata for legacy storage writes.
 * @param {T[]} aItems - The items to convert.
 * @returns {Array<LegacyTagNameItem<T>>} The legacy tag-name items.
 */
export function toLegacyTagNameList<T extends { sourceTagName: string | undefined }>(
    aItems: T[],
): Array<LegacyTagNameItem<T>> {
    return aItems.map((aItem) => toLegacyTagNameItem(aItem));
}

/**
 * Converts modern series configs into the legacy-compatible series config list.
 * Intent: Serialize chart series data back into the format expected by old board storage.
 * @param {PanelSeriesConfig[]} aItems - The modern series configs to convert.
 * @returns {LegacyCompatibleSeriesConfig[]} The legacy-compatible series configs.
 */
export function toLegacySeriesConfigs(
    aItems: PanelSeriesConfig[],
): LegacyCompatibleSeriesConfig[] {
    return toLegacyTagNameList<PanelSeriesConfig>(aItems).map((aItem) => {
        const sLegacySeriesConfig = aItem as LegacyTagNameItem<PanelSeriesConfig>;

        return {
            ...sLegacySeriesConfig,
            use_y2: toLegacyBoolean(sLegacySeriesConfig.useSecondaryAxis as boolean),
        };
    }) as LegacyCompatibleSeriesConfig[];
}

/**
 * Converts a legacy series payload into chart point objects.
 * Intent: Feed the chart data pipeline with point objects instead of legacy row structures.
 * @param {Pick<ChartSeriesItem, 'data'> | LegacyChartSeries} aSeries - The legacy or chart-series input.
 * @returns {LegacyChartPoint[]} The converted chart points.
 */
export function legacySeriesToChartPoints(
    aSeries: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): LegacyChartPoint[] {
    return chartSeriesDataToRows(aSeries).map((aRow) => ({
        x: aRow[0],
        y: aRow[1],
    }));
}

/**
 * Normalizes one legacy-compatible series config into the modern series config shape.
 * Intent: Collapse legacy field names and flag values before chart series state uses them.
 * @param {LegacyCompatibleSeriesConfig} aItem - The legacy-compatible series config to normalize.
 * @returns {PanelSeriesConfig} The normalized series config.
 */
function normalizeLegacySeriesConfig(aItem: LegacyCompatibleSeriesConfig): PanelSeriesConfig {
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
    } = aItem;

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
    aSourceColumns: PanelSeriesSourceColumns | undefined,
    aLegacyColumnNames: PanelSeriesSourceColumns | undefined,
    aLegacyColName: PanelSeriesSourceColumns | undefined,
): PanelSeriesSourceColumns {
    const sSourceColumns = aSourceColumns ?? aLegacyColumnNames ?? aLegacyColName;

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
 * @param {'Y' | 'N' | undefined} aValue - The legacy flag value.
 * @returns {boolean} `true` when the value is `Y`; otherwise `false`.
 */
export function fromLegacyBoolean(aValue: 'Y' | 'N' | undefined): boolean {
    return aValue === 'Y';
}

/**
 * Converts a boolean into a legacy `Y`/`N` flag.
 * Intent: Encode modern boolean state back into the storage format used by older records.
 * @param {boolean} aValue - The boolean value to convert.
 * @returns {'Y' | 'N'} The legacy flag value.
 */
export function toLegacyBoolean(aValue: boolean): 'Y' | 'N' {
    return aValue ? 'Y' : 'N';
}

/**
 * Checks whether a legacy series stores its data in x/y arrays.
 * Intent: Detect the legacy chart-series representation before converting it to rows.
 * @param {Pick<ChartSeriesItem, 'data'> | LegacyChartSeries} aSeries - The series to inspect.
 * @returns {boolean} `true` when the series has `xData` and `yData` arrays.
 */
function legacyChartSeriesHasArrays(
    aSeries: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): aSeries is LegacyChartSeries & { xData: number[]; yData: number[] } {
    return (
        Array.isArray((aSeries as LegacyChartSeries).xData) &&
        Array.isArray((aSeries as LegacyChartSeries).yData)
    );
}

/**
 * Converts a legacy chart series into chart rows.
 * Intent: Produce row-based chart data after the legacy array form is detected.
 * @param {LegacyChartSeries} aSeries - The legacy chart series to convert.
 * @returns {ChartRow[]} The chart rows for the series.
 */
function chartSeriesDataToRows(
    aSeries: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): ChartRow[] {
    if (legacyChartSeriesHasArrays(aSeries)) {
        return aSeries.xData.map((aX, aIndex) => [aX, aSeries.yData[aIndex]]);
    }

    return (aSeries.data ?? []).map(legacyChartDataItemToRow);
}

function legacyChartDataItemToRow(aItem: ChartRow | LegacyChartPoint): ChartRow {
    return Array.isArray(aItem) ? [aItem[0], aItem[1]] : [aItem.x, aItem.y];
}

function legacyChartSeriesToRows(aSeries: LegacyChartSeries): ChartRow[] {
    return chartSeriesDataToRows(aSeries);
}
