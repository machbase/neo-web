import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import { asRecord, getRollupMetadataLookupKey } from '../../fetch/RollupTableLookup';

type RollupTableEntry = Record<string, unknown>;

export type ValueSummaryLabel = 'Summarized' | 'Not Summarized';

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
