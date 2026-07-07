import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import {
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import { findRollupTableEntry } from '../../fetch/metadata/RollupMetadata';

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
    return {
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
}

export function withUpdatedPanelSeriesSourceColumns(
    series: PanelSeriesDefinition,
    columns: PanelSeriesSourceColumns,
    rollupMetadata: unknown,
): PanelSeriesDefinition {
    return {
        ...series,
        sourceColumns: { ...columns },
        useRollupTable: hasRollupColumn(
            rollupMetadata,
            series.table,
            columns,
        ),
    };
}

export function getPanelSeriesValueSummaryLabel(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): 'Summarized' | 'Not Summarized' | undefined {
    if (rollupMetadata === undefined || !tableName || !columnName) {
        return undefined;
    }

    return getPanelSeriesRollupColumn(
        rollupMetadata,
        tableName,
        columnName,
        jsonKey,
    )
        ? 'Summarized'
        : 'Not Summarized';
}

export function getPanelSeriesRollupColumn(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): string | undefined {
    const sTableEntry = findRollupTableEntry(rollupMetadata, tableName);
    if (!sTableEntry) {
        return undefined;
    }

    return getRollupColumnNameCandidates(columnName, jsonKey).find((candidate) => {
        const sRollupIntervals = sTableEntry[candidate];
        return Array.isArray(sRollupIntervals) && sRollupIntervals.length > 0;
    });
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
