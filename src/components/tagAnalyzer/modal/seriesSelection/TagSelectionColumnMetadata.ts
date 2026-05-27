import { ADMIN_ID } from '@/utils/constants';
import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import { getConfiguredRollupVersion } from '../../fetch/RollupVersionConfig';
import type { TagSelectionColumnMetadataRow } from './TagSelectionTypes';

type RollupTableEntry = Record<string, unknown>;

type ParsedTableName = {
    databaseName: string;
    userName: string;
    tableName: string;
};

export type TimeColumnKindLabel = 'dateTime' | 'numeric';
export type ValueSummaryLabel = 'Summarized' | 'Not Summarized';

export function getTimeColumnKindLabel(
    tableColumns: TagSelectionColumnMetadataRow[],
    columnName: string,
): TimeColumnKindLabel | undefined {
    const sColumn = findTableColumn(tableColumns, columnName);
    if (!sColumn) {
        return undefined;
    }

    return Number(sColumn[1]) === DATETIME_COLUMN_TYPE ? 'dateTime' : 'numeric';
}

export function formatTimeColumnOptionLabel(
    columnName: string,
    columnType: number,
): string {
    return `${columnName} (${columnType === DATETIME_COLUMN_TYPE ? 'dateTime' : 'numeric'})`;
}

export function getValueSummaryLabel(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): ValueSummaryLabel | undefined {
    if (rollupMetadata === undefined || !tableName || !columnName) {
        return undefined;
    }

    return hasRollupColumn(rollupMetadata, tableName, columnName, jsonKey)
        ? 'Summarized'
        : 'Not Summarized';
}

export function formatValueColumnOptionLabel(
    columnName: string,
    summaryLabel: ValueSummaryLabel | undefined,
): string {
    return summaryLabel ? `${columnName} (${summaryLabel})` : columnName;
}

function hasRollupColumn(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): boolean {
    const sTableEntry = getRollupTableEntry(rollupMetadata, tableName);
    if (!sTableEntry) {
        return false;
    }

    return getRollupColumnNameCandidates(columnName, jsonKey).some((candidate) => {
        const sRollupIntervals = sTableEntry[candidate];
        return Array.isArray(sRollupIntervals) && sRollupIntervals.length > 0;
    });
}

function getRollupTableEntry(
    rollupMetadata: unknown,
    tableName: string,
): RollupTableEntry | undefined {
    const sRollupMetadataRecord = asRecord(rollupMetadata);
    const sParsedTableName = parseTableName(tableName);
    if (!sRollupMetadataRecord || !sParsedTableName) {
        return undefined;
    }

    const sRollupVersion = getConfiguredRollupVersion();
    if (
        sRollupVersion === 'OLD' &&
        sParsedTableName.databaseName.toUpperCase() !== 'MACHBASEDB'
    ) {
        return undefined;
    }

    const sLookupTableName = sRollupVersion === 'RECENT'
        ? `${sParsedTableName.databaseName}.${sParsedTableName.tableName}`
        : sParsedTableName.tableName;
    const sUserNameCandidates = uniqueStrings([
        sParsedTableName.userName,
        sParsedTableName.userName.toUpperCase(),
    ]);
    const sTableNameCandidates = uniqueStrings([
        sLookupTableName,
        sLookupTableName.toUpperCase(),
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

function parseTableName(tableName: string): ParsedTableName | undefined {
    const sTableSegments = tableName.split('.');
    const sTableName = sTableSegments.at(-1);
    if (!sTableName) {
        return undefined;
    }

    return {
        databaseName: sTableSegments.length > 2
            ? sTableSegments.at(-3) ?? 'MACHBASEDB'
            : 'MACHBASEDB',
        userName: sTableSegments.length > 1
            ? sTableSegments.at(-2) ?? ADMIN_ID.toUpperCase()
            : ADMIN_ID.toUpperCase(),
        tableName: sTableName,
    };
}

function findTableColumn(
    tableColumns: TagSelectionColumnMetadataRow[],
    columnName: string,
): TagSelectionColumnMetadataRow | undefined {
    return tableColumns.find(
        (column) =>
            String(column?.[0] ?? '').toUpperCase() === columnName.toUpperCase(),
    );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    return value as Record<string, unknown>;
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}
