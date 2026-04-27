import { ADMIN_ID } from '@/utils/constants';
import type {
    ParsedRollupTableName,
    RollupMetadataLookupKey,
    RollupTableEntry,
    RollupValue,
} from './SqlTypes';

/**
 * Finds the rollup metadata entry for one source table.
 * Intent: Keep rollup metadata lookup separate from interval matching and rollup rules.
 * @param {unknown} rollupMetadata - The available rollup metadata map.
 * @param {string} tableName - The qualified source table name.
 * @returns {RollupTableEntry | undefined} The table entry, if available.
 */
export function findRollupTableEntry(
    rollupMetadata: unknown,
    tableName: string,
): RollupTableEntry | undefined {
    const sRollupMetadataRecord = asRecord(rollupMetadata);
    if (!sRollupMetadataRecord) {
        return undefined;
    }

    const sLookupKey = getRollupMetadataKey(tableName);
    if (!sLookupKey) {
        return undefined;
    }

    const sUserEntry = asRecord(sRollupMetadataRecord[sLookupKey.userName]);
    if (!sUserEntry) {
        return undefined;
    }

    return asRollupTableEntry(sUserEntry[sLookupKey.tableName]);
}

function getRollupMetadataKey(tableName: string): RollupMetadataLookupKey | undefined {
    const sParsedTableName = parseRollupTableName(tableName);
    if (!sParsedTableName) {
        return undefined;
    }

    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    if (
        sRollupVersion === 'OLD' &&
        sParsedTableName.databaseName.toUpperCase() !== 'MACHBASEDB'
    ) {
        return undefined;
    }

    const sTableNameForLookup = sRollupVersion === 'RECENT'
        ? `${sParsedTableName.databaseName}.${sParsedTableName.tableName}`
        : sParsedTableName.tableName;

    return {
        userName: sParsedTableName.userName,
        tableName: sTableNameForLookup,
    };
}

function parseRollupTableName(tableName: string): ParsedRollupTableName | undefined {
    const sTableSegments = tableName.split('.');
    const sTableName = sTableSegments.at(-1);
    if (!sTableName) {
        return undefined;
    }

    const sDatabaseName = sTableSegments.length > 2
        ? sTableSegments.at(-3) ?? 'MACHBASEDB'
        : 'MACHBASEDB';
    const sUserName = sTableSegments.length > 1
        ? sTableSegments.at(-2) ?? ADMIN_ID.toUpperCase()
        : ADMIN_ID.toUpperCase();

    return {
        databaseName: sDatabaseName,
        userName: sUserName,
        tableName: sTableName,
    };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    return value as Record<string, unknown>;
}

function asRollupTableEntry(value: unknown): RollupTableEntry | undefined {
    const sEntry = asRecord(value);
    if (!sEntry) {
        return undefined;
    }

    return {
        VALUE: Array.isArray(sEntry.VALUE) ? (sEntry.VALUE as RollupValue[]) : undefined,
        EXT_TYPE: Array.isArray(sEntry.EXT_TYPE) ? (sEntry.EXT_TYPE as RollupValue[]) : undefined,
    };
}
