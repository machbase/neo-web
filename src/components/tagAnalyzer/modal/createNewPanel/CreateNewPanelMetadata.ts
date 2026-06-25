import type { TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import { getRollupColumnNameCandidates } from '@/utils/rollupColumnCandidates';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import { asRecord } from '../../domain/ObjectGuards';
import { getRollupMetadataLookupKey } from '../../fetch/metadata/RollupMetadata';
import type {
    BaseNewPanelSeriesPath,
    NewPanelSeriesPath,
} from './CreateNewPanelTypes';

type RollupTableEntry = Record<string, unknown>;
type ValueSummaryLabel = 'Summarized' | 'Not Summarized';

type CreateNewPanelSeriesParams = {
    key: string;
    table: string;
    tagName: string;
    calculationMode: string;
    columns: TagAnalyzerColumnInfo;
    rollupMetadata: unknown;
};

export function createNewPanelSeriesPath({
    key,
    table,
    tagName,
    calculationMode,
    columns,
    rollupMetadata,
}: CreateNewPanelSeriesParams): NewPanelSeriesPath {
    const sSourceColumns = createPanelSeriesSourceColumns(columns);
    const sBaseSeriesPath: BaseNewPanelSeriesPath = {
        key,
        table,
        tagName,
        calculationMode,
        sourceColumns: sSourceColumns,
    };

    if (sSourceColumns.jsonKey) {
        return { ...sBaseSeriesPath, kind: 'json' };
    }

    const sRollupColumn = getCreateNewPanelRollupColumn(
        rollupMetadata,
        table,
        sSourceColumns.value,
    );
    if (sRollupColumn) {
        return {
            ...sBaseSeriesPath,
            kind: 'rollup',
            rollupColumn: sRollupColumn,
        };
    }

    return { ...sBaseSeriesPath, kind: 'numeric' };
}

export function createNewPanelSeriesPathsFromDefinitions(
    seriesDefinitions: PanelSeriesDefinition[],
    rollupMetadata: unknown,
): NewPanelSeriesPath[] {
    return seriesDefinitions.map((seriesDefinition) => {
        const sBaseSeriesPath: BaseNewPanelSeriesPath = {
            key: seriesDefinition.key,
            table: seriesDefinition.table,
            tagName: seriesDefinition.sourceTagName,
            calculationMode: seriesDefinition.calculationMode,
            sourceColumns: { ...seriesDefinition.sourceColumns },
        };

        if (seriesDefinition.sourceColumns.jsonKey) {
            return { ...sBaseSeriesPath, kind: 'json' };
        }

        if (seriesDefinition.useRollupTable) {
            return {
                ...sBaseSeriesPath,
                kind: 'rollup',
                rollupColumn: getCreateNewPanelRollupColumn(
                    rollupMetadata,
                    seriesDefinition.table,
                    seriesDefinition.sourceColumns.value,
                ),
            };
        }

        return { ...sBaseSeriesPath, kind: 'numeric' };
    });
}

export function createPanelSeriesDefinitionsFromPaths(
    seriesPaths: NewPanelSeriesPath[],
    existingSeriesDefinitions: PanelSeriesDefinition[] = [],
): PanelSeriesDefinition[] {
    const sExistingSeriesByKey = new Map(
        existingSeriesDefinitions.map((seriesDefinition) => [
            seriesDefinition.key,
            seriesDefinition,
        ]),
    );

    return seriesPaths.map((seriesPath) => {
        const sExistingSeries = sExistingSeriesByKey.get(seriesPath.key);

        return {
            ...(sExistingSeries ?? {}),
            key: seriesPath.key,
            table: seriesPath.table,
            sourceTagName: seriesPath.tagName,
            alias: sExistingSeries?.alias ?? '',
            calculationMode: seriesPath.calculationMode,
            color: sExistingSeries?.color,
            useSecondaryAxis: sExistingSeries?.useSecondaryAxis ?? false,
            id: sExistingSeries?.id,
            useRollupTable: seriesPath.kind === 'rollup',
            sourceColumns: { ...seriesPath.sourceColumns },
        };
    });
}

export function updateNewPanelSeriesSourceColumns(
    seriesPath: NewPanelSeriesPath,
    columns: TagAnalyzerColumnInfo,
    rollupMetadata: unknown,
): NewPanelSeriesPath {
    return createNewPanelSeriesPath({
        key: seriesPath.key,
        table: seriesPath.table,
        tagName: seriesPath.tagName,
        calculationMode: seriesPath.calculationMode,
        columns,
        rollupMetadata,
    });
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

export function getCreateNewPanelValueSummaryLabel(
    rollupMetadata: unknown,
    tableName: string,
    columnName: string,
    jsonKey?: string,
): ValueSummaryLabel | undefined {
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
