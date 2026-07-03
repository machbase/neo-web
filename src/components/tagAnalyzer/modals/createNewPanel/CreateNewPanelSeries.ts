import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import {
    getDefaultPanelSeriesAlias,
    isPanelSeriesUsingDefaultAlias,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import { findRollupTableEntry } from '../../fetch/metadata/RollupMetadata';

export type PanelSeriesRollupInfo = {
    columnName: string;
    intervals: number[];
    minimumInterval: number;
    maximumInterval: number;
};

export function createPanelSeriesDefinition({
    key,
    table,
    tagName,
    calculationMode,
    columns,
    rollupMetadata,
}: {
    key: string;
    table: string;
    tagName: string;
    calculationMode: string;
    columns: PanelSeriesSourceColumns;
    rollupMetadata: unknown;
}): PanelSeriesDefinition {
    const sSeries = {
        key,
        table,
        sourceTagName: tagName,
        alias: '',
        calculationMode,
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: hasRollupColumn(rollupMetadata, table, columns),
        sourceColumns: { ...columns },
    };

    return {
        ...sSeries,
        alias: getDefaultPanelSeriesAlias(sSeries),
    };
}

export function withUpdatedPanelSeriesSourceColumns(
    series: PanelSeriesDefinition,
    columns: PanelSeriesSourceColumns,
    rollupMetadata: unknown,
): PanelSeriesDefinition {
    const sSeries = {
        ...series,
        sourceColumns: { ...columns },
        useRollupTable: hasRollupColumn(
            rollupMetadata,
            series.table,
            columns,
        ),
    };

    return {
        ...sSeries,
        alias: isPanelSeriesUsingDefaultAlias(series)
            ? getDefaultPanelSeriesAlias(sSeries)
            : series.alias,
    };
}

export function getPanelSeriesValueSummaryLabel(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): 'Has Rollup' | 'No Rollup' | undefined {
    if (rollupMetadata === undefined || !tableName || !columnName) {
        return undefined;
    }

    return getPanelSeriesRollupInfo(
        rollupMetadata,
        tableName,
        columnName,
        jsonKey,
    )
        ? 'Has Rollup'
        : 'No Rollup';
}

export function getPanelSeriesRollupColumn(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): string | undefined {
    return getPanelSeriesRollupInfo(
        rollupMetadata,
        tableName,
        columnName,
        jsonKey,
    )?.columnName;
}

export function getPanelSeriesRollupInfo(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): PanelSeriesRollupInfo | undefined {
    const sTableEntry = findRollupTableEntry(rollupMetadata, tableName);
    if (!sTableEntry) {
        return undefined;
    }

    for (const candidate of getRollupColumnNameCandidates(columnName, jsonKey)) {
        const sRollupIntervals = sTableEntry[candidate];
        if (!Array.isArray(sRollupIntervals) || sRollupIntervals.length === 0) {
            continue;
        }

        const sIntervals = normalizeRollupIntervals(sRollupIntervals);
        if (sIntervals.length === 0) {
            continue;
        }

        return {
            columnName: candidate,
            intervals: sIntervals,
            minimumInterval: sIntervals[0],
            maximumInterval: sIntervals[sIntervals.length - 1],
        };
    }

    return undefined;
}

export function formatRollupIntervalList(intervals: number[]): string {
    return intervals.map(formatRollupInterval).join(', ');
}

export function formatRollupRangeLabel(rollupInfo: PanelSeriesRollupInfo): string {
    const sMinimumLabel = formatRollupInterval(rollupInfo.minimumInterval);
    const sMaximumLabel = formatRollupInterval(rollupInfo.maximumInterval);

    return sMinimumLabel === sMaximumLabel
        ? sMinimumLabel
        : `${sMinimumLabel} - ${sMaximumLabel}`;
}

function normalizeRollupIntervals(intervals: unknown[]): number[] {
    return Array.from(new Set(
        intervals
            .map((interval) => Number(interval))
            .filter((interval) => Number.isFinite(interval) && interval > 0),
    )).sort((left, right) => left - right);
}

function formatRollupInterval(intervalMs: number): string {
    const sSecond = 1000;
    const sMinute = 60 * sSecond;
    const sHour = 60 * sMinute;
    const sDay = 24 * sHour;
    const sYear = 365 * sDay;

    if (intervalMs % sYear === 0) {
        return `${intervalMs / sYear}y`;
    }

    if (intervalMs % sDay === 0) {
        return `${intervalMs / sDay}d`;
    }

    if (intervalMs % sHour === 0) {
        return `${intervalMs / sHour}h`;
    }

    if (intervalMs % sMinute === 0) {
        return `${intervalMs / sMinute}min`;
    }

    if (intervalMs % sSecond === 0) {
        return `${intervalMs / sSecond}s`;
    }

    return `${intervalMs}ms`;
}

function hasRollupColumn(
    rollupMetadata: unknown,
    tableName: string,
    sourceColumns: PanelSeriesSourceColumns,
): boolean {
    return getPanelSeriesRollupColumn(
        rollupMetadata,
        tableName,
        sourceColumns.value,
        sourceColumns.jsonKey,
    ) !== undefined;
}
