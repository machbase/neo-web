import { ADMIN_ID } from '@/utils/constants';
import { getConfiguredRollupVersion } from './RollupVersionConfig';

export type ParsedRollupTableName = {
    databaseName: string;
    userName: string;
    tableName: string;
};

export type RollupMetadataLookupKey = {
    userName: string;
    tableName: string;
};

export function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    return value as Record<string, unknown>;
}

export function parseRollupTableName(tableName: string): ParsedRollupTableName | undefined {
    const sTableSegments = tableName.split('.');
    const sTableName = sTableSegments.at(-1);
    if (!sTableName) {
        return undefined;
    }

    let sDatabaseName = 'MACHBASEDB';
    if (sTableSegments.length > 2) {
        sDatabaseName = sTableSegments.at(-3) ?? 'MACHBASEDB';
    }

    let sUserName = ADMIN_ID.toUpperCase();
    if (sTableSegments.length > 1) {
        sUserName = sTableSegments.at(-2) ?? ADMIN_ID.toUpperCase();
    }

    return {
        databaseName: sDatabaseName,
        userName: sUserName,
        tableName: sTableName,
    };
}

export function getRollupMetadataLookupKey(
    tableName: string,
): RollupMetadataLookupKey | undefined {
    const sParsedTableName = parseRollupTableName(tableName);
    if (!sParsedTableName) {
        return undefined;
    }

    const sRollupVersion = getConfiguredRollupVersion();
    if (
        sRollupVersion === 'OLD' &&
        sParsedTableName.databaseName.toUpperCase() !== 'MACHBASEDB'
    ) {
        return undefined;
    }

    let sTableNameForLookup = sParsedTableName.tableName;
    if (sRollupVersion === 'RECENT') {
        sTableNameForLookup = `${sParsedTableName.databaseName}.${sParsedTableName.tableName}`;
    }

    return {
        userName: sParsedTableName.userName,
        tableName: sTableNameForLookup,
    };
}
