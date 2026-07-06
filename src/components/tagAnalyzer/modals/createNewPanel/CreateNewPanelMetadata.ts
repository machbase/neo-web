import type { TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import { asRecord } from '../../domain/ObjectGuards';
import { getRollupMetadataLookupKey } from '../../fetch/metadata/RollupMetadata';

type RollupTableEntry = Record<string, unknown>;

// The modal works directly with PanelSeriesDefinition (the type it returns to
// the board). These helpers build and update definitions from the source
// selector's column choices, deriving useRollupTable from the rollup metadata.

export function createNewPanelSeriesDefinition({
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
    columns: TagAnalyzerColumnInfo;
    rollupMetadata: unknown;
}): PanelSeriesDefinition {
    const sSourceColumns = createPanelSeriesSourceColumns(columns);

    return {
        key,
        table,
        sourceTagName: tagName,
        alias: '',
        calculationMode,
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: hasRollupColumn(rollupMetadata, table, sSourceColumns),
        sourceColumns: sSourceColumns,
    };
}

export function withUpdatedSeriesSourceColumns(
    series: PanelSeriesDefinition,
    columns: TagAnalyzerColumnInfo,
    rollupMetadata: unknown,
): PanelSeriesDefinition {
    const sSourceColumns = createPanelSeriesSourceColumns(columns);

    return {
        ...series,
        sourceColumns: sSourceColumns,
        useRollupTable: hasRollupColumn(
            rollupMetadata,
            series.table,
            sSourceColumns,
        ),
    };
}

export function getCreateNewPanelValueSummaryLabel(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): 'Summarized' | 'Not Summarized' | undefined {
    if (rollupMetadata === undefined || !tableName || !columnName) {
        return undefined;
    }

    return getCreateNewPanelRollupColumn(
        rollupMetadata,
        tableName,
        columnName,
        jsonKey,
    )
        ? 'Summarized'
        : 'Not Summarized';
}

export function getCreateNewPanelRollupColumn(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): string | undefined {
    const sTableEntry = getRollupTableEntry(rollupMetadata, tableName);
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
    return (
        !sourceColumns.jsonKey &&
        getCreateNewPanelRollupColumn(
            rollupMetadata,
            tableName,
            sourceColumns.value,
        ) !== undefined
    );
}

function createPanelSeriesSourceColumns(
    columns: TagAnalyzerColumnInfo,
): PanelSeriesSourceColumns {
    return {
        name: columns.name,
        time: columns.time,
        value: columns.value,
        jsonKey: columns.jsonKey,
        timeType: columns.timeType,
        timeBaseTime: columns.timeBaseTime,
    };
}

function getRollupTableEntry(
    rollupMetadata: unknown,
    tableName: string,
): RollupTableEntry | undefined {
    const sRollupMetadataRecord = asRecord(rollupMetadata);
    const sLookupKey = getRollupMetadataLookupKey(tableName);
    if (!sRollupMetadataRecord || !sLookupKey) {
        return undefined;
    }

    const sUserNameCandidates = uniqueStrings([
        sLookupKey.userName,
        sLookupKey.userName.toUpperCase(),
    ]);
    const sTableNameCandidates = uniqueStrings([
        sLookupKey.tableName,
        sLookupKey.tableName.toUpperCase(),
    ]);

    for (const sUserName of sUserNameCandidates) {
        const sUserEntry = asRecord(sRollupMetadataRecord[sUserName]);
        if (!sUserEntry) {
            continue;
        }

        for (const sTableName of sTableNameCandidates) {
            const sTableEntry = asRecord(sUserEntry[sTableName]);
            if (sTableEntry) {
                return sTableEntry;
            }
        }
    }

    return undefined;
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}
