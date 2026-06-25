import { ADMIN_ID } from '@/utils/constants';

export type ParsedRollupTableName = {
    databaseName: string;
    userName: string;
    tableName: string;
};

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
