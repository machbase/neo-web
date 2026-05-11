import type { SeriesFetchColumnMap } from '../FetchContracts';
import type { TimeRangeNs } from '../../time/TimeTypes';
import { getIntervalMs } from '../../time/TimeUnitUtils';
import { ADMIN_ID } from '@/utils/constants';
import { toSqlValueExpressionForAggregator } from '@/utils/dashboardJsonValue';
import {
    buildAggregateOuterSql,
    buildAggregateSubSql,
    buildAverageOuterSql,
    buildAverageSubSql,
    buildCountOuterSql,
    buildCountSubSql,
    buildFirstLastOuterSql,
    buildFirstLastSubSql,
    buildNonRollupScaledTimeGroupKeySql,
    buildNonRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlPart,
    buildSourceWhereSqlPart,
    buildTruncatedTimeGroupKeySqlPart,
} from './parts/BuildSqlParts';

type RollupValue = number | string;

type RollupTableEntry = {
    VALUE?: RollupValue[] | undefined;
    EXT_TYPE?: RollupValue[] | undefined;
};

type ParsedRollupTableName = {
    databaseName: string;
    userName: string;
    tableName: string;
};

type RollupMetadataLookupKey = {
    userName: string;
    tableName: string;
};

type CalculationSqlContext = {
    timeGroupKeySqlInfo: ReturnType<typeof buildRollupTimeGroupKeySqlInfo>;
    sourceWhereSql: string;
};

export function buildAggregateCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    const context = buildCalculationSqlContext(
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        intervalUnit,
        intervalSize,
        useRollup,
    );
    const timeGroupKeySql = useRollup
        ? buildRollupTimeGroupKeySqlPart(sourceColumnMap.time, intervalUnit, intervalSize)
        : buildTruncatedTimeGroupKeySqlPart(sourceColumnMap.time, intervalUnit, intervalSize);
    const valueExpressionSql = toSqlValueExpressionForAggregator(
        sourceColumnMap.value,
        calculationMode,
        sourceColumnMap.jsonKey,
    );
    const subSql = buildAggregateSubSql(
        calculationMode,
        sourceTableName,
        valueExpressionSql,
        context.sourceWhereSql,
        timeGroupKeySql,
    );

    return buildAggregateOuterSql(
        calculationMode,
        subSql,
        context.timeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

export function buildAverageCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    const context = buildCalculationSqlContext(
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        intervalUnit,
        intervalSize,
        useRollup,
    );
    const timeGroupKeySql = useRollup
        ? buildRollupTimeGroupKeySqlPart(sourceColumnMap.time, intervalUnit, intervalSize)
        : buildNonRollupScaledTimeGroupKeySql(
            sourceColumnMap.time,
            intervalSize,
            context.timeGroupKeySqlInfo.nonRollupBucketIntervalSeconds,
        );
    const valueExpressionSql = toSqlValueExpressionForAggregator(
        sourceColumnMap.value,
        'avg',
        sourceColumnMap.jsonKey,
    );
    const subSql = buildAverageSubSql(
        sourceTableName,
        valueExpressionSql,
        context.sourceWhereSql,
        timeGroupKeySql,
    );

    return buildAverageOuterSql(
        subSql,
        context.timeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

export function buildCountCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    const context = buildCalculationSqlContext(
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        intervalUnit,
        intervalSize,
        useRollup,
    );
    const timeGroupKeySql = useRollup
        ? buildRollupTimeGroupKeySqlPart(sourceColumnMap.time, intervalUnit, intervalSize)
        : buildNonRollupScaledTimeGroupKeySql(
            sourceColumnMap.time,
            intervalSize,
            context.timeGroupKeySqlInfo.nonRollupBucketIntervalSeconds,
        );
    const valueExpressionSql = toSqlValueExpressionForAggregator(
        sourceColumnMap.value,
        'cnt',
        sourceColumnMap.jsonKey,
    );
    const subSql = buildCountSubSql(
        sourceTableName,
        valueExpressionSql,
        context.sourceWhereSql,
        timeGroupKeySql,
    );

    return buildCountOuterSql(
        subSql,
        context.timeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

export function buildFirstLastCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupTableList: string[],
): string {
    const context = buildCalculationSqlContext(
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        intervalUnit,
        intervalSize,
        useRollup,
    );
    const timeGroupKeySql = shouldUseRollupTimeGroupKey(
        useRollup,
        rollupTableList,
        sourceTableName,
        intervalUnit,
        intervalSize,
    )
        ? buildRollupTimeGroupKeySqlPart(sourceColumnMap.time, intervalUnit, intervalSize)
        : buildTruncatedTimeGroupKeySqlPart(sourceColumnMap.time, intervalUnit, intervalSize);
    const valueExpressionSql = toSqlValueExpressionForAggregator(
        sourceColumnMap.value,
        calculationMode,
        sourceColumnMap.jsonKey,
    );
    const subSql = buildFirstLastSubSql(
        calculationMode,
        sourceTableName,
        valueExpressionSql,
        context.sourceWhereSql,
        timeGroupKeySql,
    );

    return buildFirstLastOuterSql(
        calculationMode,
        subSql,
        context.timeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

function buildCalculationSqlContext(
    sourceColumnMap: SeriesFetchColumnMap,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
): CalculationSqlContext {
    return {
        timeGroupKeySqlInfo: useRollup
            ? buildRollupTimeGroupKeySqlInfo(intervalUnit, intervalSize)
            : buildNonRollupTimeGroupKeySqlInfo(intervalUnit),
        sourceWhereSql: buildSourceWhereSqlPart(
            sourceColumnMap.name,
            tagNameList,
            sourceColumnMap.time,
            fetchTimeRange.startTime,
            fetchTimeRange.endTime,
        ),
    };
}

function shouldUseRollupTimeGroupKey(
    useRollup: boolean,
    rollupTableList: string[],
    sourceTableName: string,
    intervalUnit: string,
    intervalSize: number,
): boolean {
    return useRollup && shouldUseExtendedFirstLastRollup(
        rollupTableList,
        sourceTableName,
        intervalUnit,
        intervalSize,
    );
}

function shouldUseExtendedFirstLastRollup(
    rollupMetadata: unknown,
    tableName: string,
    intervalUnit: string,
    intervalSize: number,
): boolean {
    const sRequestedIntervalMs = getIntervalMs(intervalUnit, intervalSize);
    if (sRequestedIntervalMs <= 0) {
        return false;
    }

    const sRollupEntry = findRollupTableEntry(rollupMetadata, tableName);
    if (!sRollupEntry?.VALUE || !sRollupEntry.EXT_TYPE) {
        return false;
    }

    const sMatchingIntervalIndex = findMatchingRollupIntervalIndex(
        sRollupEntry.VALUE,
        sRequestedIntervalMs,
    );
    if (sMatchingIntervalIndex < 0) {
        return false;
    }

    return isExtendedRollupType(sRollupEntry.EXT_TYPE[sMatchingIntervalIndex]);
}

function findMatchingRollupIntervalIndex(
    rollupIntervals: RollupValue[],
    requestedIntervalMs: number,
): number {
    for (let index = 0; index < rollupIntervals.length; index++) {
        const sRollupIntervalMs = Number(rollupIntervals[index]);
        if (!Number.isFinite(sRollupIntervalMs) || sRollupIntervalMs <= 0) {
            continue;
        }

        if (requestedIntervalMs % sRollupIntervalMs !== 0) {
            continue;
        }

        return index;
    }

    return -1;
}

function isExtendedRollupType(value: unknown): boolean {
    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'string') {
        const sNumericValue = Number(value);
        if (!Number.isNaN(sNumericValue)) {
            return sNumericValue !== 0;
        }

        return value.length > 0;
    }

    return Boolean(value);
}

function findRollupTableEntry(
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
