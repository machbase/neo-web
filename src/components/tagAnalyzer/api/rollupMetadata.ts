import { ADMIN_ID } from '@/utils/constants';
import { getCurrentDatabaseName } from '@/utils/currentDatabaseState';
import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';

export type RollupDefinition = {
    intervalMs: number;
    supportsFirstLast: boolean;
};

export type RollupTableEntry = {
    [columnName: string]: RollupDefinition[];
};

export type RollupTableMap = {
    [userName: string]: {
        [tableName: string]: RollupTableEntry;
    };
};

export function findRollupTableEntry(
    rollupMetadata: RollupTableMap | undefined,
    tableName: string,
): RollupTableEntry | undefined {
    if (!rollupMetadata) return undefined;

    // A name with no database part means the one this session is in. Rollup metadata is keyed
    // `database.table`, so the unqualified form is also tried for the current database — that
    // is where a bare name would have been stored before the key gained its prefix.
    const sCurrentDb = getCurrentDatabaseName();
    const [
        table,
        user = ADMIN_ID.toUpperCase(),
        database = sCurrentDb,
    ] = tableName.split('.').reverse();
    const qualifiedTable = `${database}.${table}`;
    const tableNames = database.toUpperCase() === sCurrentDb.toUpperCase()
        ? [qualifiedTable, table]
        : [qualifiedTable];

    for (const userName of new Set([user, user.toUpperCase()])) {
        const userEntry = rollupMetadata[userName];
        if (!userEntry) continue;

        for (const candidate of new Set(
            tableNames.flatMap((name) => [name, name.toUpperCase()]),
        )) {
            const tableEntry = userEntry[candidate];
            if (tableEntry) return tableEntry;
        }
    }

    return undefined;
}

export type PanelSeriesRollupInfo = {
    columnName: string;
    intervals: number[];
    minimumInterval: number;
    maximumInterval: number;
};

export function getPanelSeriesValueSummaryLabel(
    rollupMetadata: RollupTableMap | undefined,
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
    rollupMetadata: RollupTableMap | undefined,
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
    rollupMetadata: RollupTableMap | undefined,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): PanelSeriesRollupInfo | undefined {
    const sTableEntry = findRollupTableEntry(rollupMetadata, tableName);
    if (!sTableEntry) {
        return undefined;
    }

    for (const candidate of getRollupColumnNameCandidates(columnName, jsonKey)) {
        const sRollupDefinitions = sTableEntry[candidate];
        if (!sRollupDefinitions?.length) {
            continue;
        }

        const sIntervals = sRollupDefinitions
            .map(({ intervalMs }) => intervalMs)
            .sort((left, right) => left - right);

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

// -------------------- Local --------------------

const ROLLUP_INTERVAL_UNITS = [
    [31_536_000_000, 'y'],
    [86_400_000, 'd'],
    [3_600_000, 'h'],
    [60_000, 'min'],
    [1_000, 's'],
] as const;

function formatRollupInterval(intervalMs: number): string {
    const sUnit = ROLLUP_INTERVAL_UNITS.find(
        ([unitMs]) => intervalMs % unitMs === 0,
    );
    return sUnit
        ? `${intervalMs / sUnit[0]}${sUnit[1]}`
        : `${intervalMs}ms`;
}
