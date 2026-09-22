import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import { isFiniteNumber, isPlainObject } from './objectGuards';
import type { AxisKind } from './rangeExpression/rangeModel';

// Shared series definitions and pure rules. Session metadata and UI options live with their consumers.
export const X_AXIS_KIND_CHANGE_WARNING = 'The panel x-axis type cannot be changed.';

export type SqlIdentifierPath = string & {
    readonly [SQL_IDENTIFIER_PATH_BRAND]: true;
};

export function parseSqlIdentifierPath(
    identifierPath: string,
    label = 'SQL identifier',
): SqlIdentifierPath {
    if (
        identifierPath
            .split('.')
            .some((segment) => !SQL_IDENTIFIER_SEGMENT_PATTERN.test(segment))
    ) {
        throw new Error(
            `${label} contains unsupported characters: ${identifierPath}`,
        );
    }

    return identifierPath as SqlIdentifierPath;
}

export const PANEL_TAG_LIMIT = 12;

export type PanelSeriesSourceColumns = {
    name: string;
    time: string;
    value: string;
    jsonKey?: string;
    timeType?: number;
    timeBaseTime?: boolean;
};

export type ValidatedPanelSeriesSourceColumns = {
    name: SqlIdentifierPath;
    time: SqlIdentifierPath;
    value: SqlIdentifierPath;
    jsonKey?: string;
    timeType?: number;
    timeBaseTime?: boolean;
};

export function validatePanelSeriesSourceColumns(
    columns: PanelSeriesSourceColumns,
): ValidatedPanelSeriesSourceColumns {
    return {
        ...columns,
        name: parseSqlIdentifierPath(columns.name, 'SQL tag name column'),
        time: parseSqlIdentifierPath(columns.time, 'SQL time column'),
        value: parseSqlIdentifierPath(columns.value, 'SQL value column'),
    };
}

export const DEFAULT_PANEL_SERIES_SOURCE_COLUMNS: PanelSeriesSourceColumns = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

export enum PanelSeriesCalculationMode {
    Minimum = 'MIN',
    Maximum = 'MAX',
    Sum = 'SUM',
    Count = 'CNT',
    Average = 'AVG',
    First = 'FIRST',
    Last = 'LAST',
}

export type PanelSeriesDefinition = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: PanelSeriesCalculationMode;
    color?: string;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    sourceColumns: PanelSeriesSourceColumns;
};

export function assertValidPanelSeriesIdentifiers(
    series: {
        table: string;
        sourceColumns: PanelSeriesSourceColumns;
    },
): void {
    parseSqlIdentifierPath(series.table, 'SQL table name');
    validatePanelSeriesSourceColumns(series.sourceColumns);
}

export function normalizePanelSeriesCalculationMode(
    value: unknown,
): PanelSeriesCalculationMode | undefined {
    if (typeof value !== 'string') return undefined;

    const normalizedValue: string = value.trim().toUpperCase();
    return normalizedValue === 'COUNT'
        ? PanelSeriesCalculationMode.Count
        : PANEL_SERIES_CALCULATION_MODES.find((mode) => mode === normalizedValue);
}

export function normalizePanelSeriesDefinitions(
    values: unknown[],
): PanelSeriesDefinition[] | undefined {
    const sSeriesList: PanelSeriesDefinition[] = [];
    for (const value of values) {
        const sSeries = normalizePanelSeriesDefinition(value);
        if (!sSeries) return undefined;
        sSeriesList.push(sSeries);
    }
    return sSeriesList;
}

export function getPanelSeriesEChartsName(
    series: SeriesNamingInfo,
    useRawLabel = false,
): string {
    const sMode = getPanelSeriesModeLabel(series, useRawLabel);
    const sBaseName = [
        series.table,
        series.sourceTagName,
        getPanelSeriesValueLabel(series),
    ]
        .filter((part) => part.trim().length > 0)
        .join(' / ');

    return sBaseName ? `${sBaseName} (${sMode})` : sMode;
}

export function getPanelSeriesDisplayName(series: SeriesNamingInfo): string {
    return series.alias?.trim() || getDefaultPanelSeriesAlias(series);
}

export function updatePanelSeriesCalculationMode(
    series: PanelSeriesDefinition,
    calculationMode: PanelSeriesCalculationMode,
): PanelSeriesDefinition {
    const sCurrentAlias = series.alias.trim();

    return !sCurrentAlias ||
        sCurrentAlias === getDefaultPanelSeriesAlias(series)
        ? withDefaultPanelSeriesAlias({ ...series, calculationMode })
        : { ...series, calculationMode };
}

export const MIXED_X_AXIS_KIND_WARNING =
    'Datetime and numeric x-axis series cannot be mixed in one chart.';

export function isNumericBaseTimeSourceColumns(
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined,
): boolean {
    return (
        sourceColumns?.timeBaseTime === true &&
        Number(sourceColumns.timeType) !== DATETIME_COLUMN_TYPE
    );
}

export function hasNumericBaseTimeSeries(
    seriesList: SeriesWithSourceColumns[] = [],
): boolean {
    return seriesList.some((series) =>
        isNumericBaseTimeSourceColumns(series.sourceColumns),
    );
}

export function hasMixedXAxisValueKinds(
    seriesList: SeriesWithSourceColumns[] = [],
): boolean {
    return (
        hasNumericBaseTimeSeries(seriesList) &&
        seriesList.some(
            ({ sourceColumns }) =>
                !isNumericBaseTimeSourceColumns(sourceColumns),
        )
    );
}

export function getSeriesListAxisKind(
    seriesList: SeriesWithSourceColumns[] = [],
): AxisKind | undefined {
    if (seriesList.length === 0 || hasMixedXAxisValueKinds(seriesList)) {
        return undefined;
    }

    return isNumericBaseTimeSourceColumns(seriesList[0]?.sourceColumns)
        ? 'numeric'
        : 'time';
}

/**
 * Rejects series lists no panel can plot, at the boundary where untrusted
 * documents enter. An empty list is fine — that is just a panel you have not
 * added series to yet — but clashing x-axis kinds have no valid axis, and every
 * editor path already refuses them, so a document carrying them is malformed.
 */
export function assertCompatiblePanelSeriesList(
    seriesList: SeriesWithSourceColumns[],
    source: string,
): void {
    if (hasMixedXAxisValueKinds(seriesList)) {
        throw new Error(`${source}: ${MIXED_X_AXIS_KIND_WARNING}`);
    }
}

export function shouldUseNumericPanelRangeInput(
    seriesList: SeriesWithSourceColumns[] = [],
): boolean {
    return getSeriesListAxisKind(seriesList) === 'numeric';
}

export function getPanelSeriesDisplayColor(
    series: { color?: string },
    seriesIndex: number,
): string {
    return (
        series.color ??
        TAG_ANALYZER_LINE_COLORS[seriesIndex % TAG_ANALYZER_LINE_COLORS.length]
    );
}

export function createPanelSeriesDefinition({
    key,
    table,
    tagName,
    calculationMode,
    columns,
    useRollupTable = false,
    alias,
}: {
    key: string;
    table: string;
    tagName: string;
    calculationMode: PanelSeriesCalculationMode;
    columns: PanelSeriesSourceColumns;
    useRollupTable?: boolean;
    alias?: string;
}): PanelSeriesDefinition {
    const sSeries: PanelSeriesDefinition = {
        key,
        table,
        sourceTagName: tagName,
        alias: alias ?? '',
        calculationMode,
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable,
        sourceColumns: { ...columns },
    };
    assertValidPanelSeriesIdentifiers(sSeries);
    return sSeries.alias.trim()
        ? sSeries
        : withDefaultPanelSeriesAlias(sSeries);
}

export function prepareSeriesDefinitions(
    values: unknown[],
    options: {
        validation: 'strict' | 'compatible';
        fillMissingColors?: boolean;
        source: string;
        invalidSeriesMessage: string;
        invalidCalculationModeMessage?: string;
    },
): { tagSet: PanelSeriesDefinition[]; isNumericAxis: boolean } {
    const inputs = options.fillMissingColors
        ? values.map((value, index) => isPlainObject(value)
            ? {
                  ...value,
                  color: typeof value.color === 'string' && value.color.length > 0
                      ? value.color
                      : getPanelSeriesDisplayColor({}, index),
              }
            : value,
        )
        : values;
    const tagSet = options.validation === 'strict'
        ? normalizePanelSeriesDefinitions(inputs)
        : inputs.map((value) => {
            if (!isPlainObject(value)) {
                throw new Error(options.invalidSeriesMessage);
            }
            const calculationMode = normalizePanelSeriesCalculationMode(value.calculationMode);
            if (!calculationMode) {
                throw new Error(options.invalidCalculationModeMessage ?? options.invalidSeriesMessage);
            }

            // Compatible inputs have already had their field names decoded by the caller.
            // Retain their permissive values; strict validation is a separate policy.
            const columns = value.sourceColumns as Partial<PanelSeriesSourceColumns> | undefined;
            const series = {
                ...value,
                calculationMode,
                sourceColumns: {
                    ...columns,
                    name: columns?.name ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
                    time: columns?.time ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
                    value: columns?.value ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
                },
            } as PanelSeriesDefinition;
            series.alias = getPanelSeriesDisplayName(series);
            return series;
        });

    if (!tagSet) throw new Error(options.invalidSeriesMessage);
    assertCompatiblePanelSeriesList(tagSet, options.source);
    return { tagSet, isNumericAxis: shouldUseNumericPanelRangeInput(tagSet) };
}

// -------------------- Local --------------------

const SQL_IDENTIFIER_SEGMENT_PATTERN: RegExp = /^[A-Za-z_][A-Za-z0-9_$]*$/;

declare const SQL_IDENTIFIER_PATH_BRAND: unique symbol;

const PANEL_SERIES_CALCULATION_MODES = Object.values(PanelSeriesCalculationMode);

function normalizePanelSeriesDefinition(
    value: unknown,
): PanelSeriesDefinition | undefined {
    if (!isPlainObject(value) || !isPlainObject(value.sourceColumns)) {
        return undefined;
    }

    const sColumns = value.sourceColumns;
    const sCalculationMode = normalizePanelSeriesCalculationMode(
        value.calculationMode,
    );
    if (
        typeof value.key !== 'string' ||
        typeof value.table !== 'string' ||
        typeof value.sourceTagName !== 'string' ||
        !sCalculationMode ||
        typeof sColumns.name !== 'string' ||
        typeof sColumns.time !== 'string' ||
        typeof sColumns.value !== 'string'
    ) {
        return undefined;
    }

    const sSeries: PanelSeriesDefinition = {
        key: value.key,
        table: value.table,
        sourceTagName: value.sourceTagName,
        alias: typeof value.alias === 'string' ? value.alias : '',
        calculationMode: sCalculationMode,
        color: typeof value.color === 'string' ? value.color : undefined,
        useSecondaryAxis: value.useSecondaryAxis === true,
        id: typeof value.id === 'string' ? value.id : undefined,
        useRollupTable: value.useRollupTable === true,
        sourceColumns: {
            name: sColumns.name,
            time: sColumns.time,
            value: sColumns.value,
            jsonKey:
                typeof sColumns.jsonKey === 'string'
                    ? sColumns.jsonKey
                    : undefined,
            timeType: isFiniteNumber(sColumns.timeType)
                ? sColumns.timeType
                : undefined,
            timeBaseTime:
                typeof sColumns.timeBaseTime === 'boolean'
                    ? sColumns.timeBaseTime
                    : undefined,
        },
    };

    try {
        assertValidPanelSeriesIdentifiers(sSeries);
    } catch {
        return undefined;
    }

    sSeries.alias = getPanelSeriesDisplayName(sSeries);
    return sSeries;
}

type SeriesWithSourceColumns = {
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined;
};

type SeriesNamingInfo = Pick<
    PanelSeriesDefinition,
    'table' | 'sourceTagName'
> & {
    alias?: string;
    calculationMode?: PanelSeriesCalculationMode;
    sourceColumns: Partial<PanelSeriesSourceColumns> | undefined;
};

function getPanelSeriesModeLabel(
    series: Pick<SeriesNamingInfo, 'calculationMode'>,
    useRawLabel = false,
): string {
    return useRawLabel
        ? 'raw'
        : series.calculationMode ?? PanelSeriesCalculationMode.Average;
}

function getPanelSeriesValueLabel(
    series: Pick<SeriesNamingInfo, 'sourceColumns'>,
): string {
    const sValue = String(series.sourceColumns?.value ?? '').trim();
    const sJsonKey = series.sourceColumns?.jsonKey?.trim();

    return sJsonKey ? `${sValue} -> ${sJsonKey}` : sValue;
}

function getDefaultPanelSeriesAlias(series: SeriesNamingInfo): string {
    const sBaseName = [
        series.sourceTagName,
        getPanelSeriesValueLabel(series),
    ]
        .map((part) => String(part ?? '').trim())
        .filter((part) => part.length > 0)
        .join(' / ');
    const sTableName = String(series.table ?? '').trim();

    if (sBaseName && sTableName) {
        return `${sBaseName} (${sTableName})`;
    }

    return sBaseName || sTableName || getPanelSeriesModeLabel(series);
}

function withDefaultPanelSeriesAlias(
    series: PanelSeriesDefinition,
): PanelSeriesDefinition {
    return {
        ...series,
        alias: getDefaultPanelSeriesAlias(series),
    };
}

const TAG_ANALYZER_LINE_COLORS = [
    '#367FEB',
    '#EB5757',
    '#6FCF97',
    '#FFD95F',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#2D9CDB',
    '#C3A080',
    '#C9C9C9',
    '#6B6B6B',
];
