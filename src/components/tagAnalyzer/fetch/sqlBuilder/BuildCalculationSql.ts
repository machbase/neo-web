import type { RollupTableMap, SeriesFetchColumnMap } from '../panelData/PanelDataFetchTypes';
import type { TimeRangeNs } from '../../domain/time/TimeTypes';
import { getIntervalMs } from '../../domain/time/TimeIntervalUtils';
import { toSqlValueExpressionForAggregator } from '@/utils/dashboardJsonValue';
import { getRollupMetadataLookupKey } from '../metadata/RollupMetadata';
import { asRecord } from '../../domain/ObjectGuards';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import {
    M_TIME_ALIAS,
    buildAggregateOuterSql,
    buildAggregateSubSql,
    buildAverageOuterSql,
    buildAverageSubSql,
    buildCountOuterSql,
    buildCountSubSql,
    buildDateBinTimeGroupKeySqlPart,
    buildFirstLastOuterSql,
    buildFirstLastSubSql,
    buildNonRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlPart,
    buildSourceWhereSqlPart,
} from './parts/BuildSqlParts';
import { buildSqlIdentifierPath } from './SqlTextUtils';

type RollupValue = number | string;

type RollupTableEntry = {
    VALUE?: RollupValue[] | undefined;
    EXT_TYPE?: RollupValue[] | undefined;
};

type TimeAxisSqlKind = 'numeric' | 'datetime';

type CalculationSqlContext = {
    timeGroupKeySqlInfo: ReturnType<typeof buildRollupTimeGroupKeySqlInfo>;
    sourceWhereSql: string;
    timeAxisKind: TimeAxisSqlKind;
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
        useRollup,
    );
    const timeGroupKeySql = buildAxisTimeGroupKeySql({
        sourceColumnMap,
        intervalUnit,
        intervalSize,
        useRollup,
        timeAxisKind: context.timeAxisKind,
        fetchTimeRange,
        requestedRowCount,
    });
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
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
        context.timeAxisKind === 'datetime',
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
        useRollup,
    );
    const timeGroupKeySql = buildAxisTimeGroupKeySql({
        sourceColumnMap,
        intervalUnit,
        intervalSize,
        useRollup,
        timeAxisKind: context.timeAxisKind,
        fetchTimeRange,
        requestedRowCount,
    });
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        'avg',
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
        context.timeAxisKind === 'datetime',
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
        useRollup,
    );
    const timeGroupKeySql = buildAxisTimeGroupKeySql({
        sourceColumnMap,
        intervalUnit,
        intervalSize,
        useRollup,
        timeAxisKind: context.timeAxisKind,
        fetchTimeRange,
        requestedRowCount,
    });
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        'cnt',
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
        context.timeAxisKind === 'datetime',
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
    rollupTableList: RollupTableMap,
): string {
    const context = buildCalculationSqlContext(
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        intervalUnit,
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
        : buildAxisTimeGroupKeySql({
              sourceColumnMap,
              intervalUnit,
              intervalSize,
              useRollup: false,
              timeAxisKind: context.timeAxisKind,
              fetchTimeRange,
              requestedRowCount,
          });
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
    );
    const subSql = buildFirstLastSubSql(
        calculationMode,
        sourceTableName,
        valueExpressionSql,
        context.sourceWhereSql,
        timeGroupKeySql,
        sourceColumnMap.time,
    );

    return buildFirstLastOuterSql(
        calculationMode,
        subSql,
        context.timeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
        context.timeAxisKind === 'datetime',
    );
}

function buildValueColumnExpressionForCalculation(
    sourceColumnMap: SeriesFetchColumnMap,
    calculationMode: string,
): string {
    return toSqlValueExpressionForAggregator(
        buildSqlIdentifierPath(sourceColumnMap.value, 'SQL value column'),
        calculationMode,
        sourceColumnMap.jsonKey,
    );
}

function buildCalculationSqlContext(
    sourceColumnMap: SeriesFetchColumnMap,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    intervalUnit: string,
    useRollup: boolean,
): CalculationSqlContext {
    const sUsesNumericBaseTime = isNumericBaseTimeSourceColumns(sourceColumnMap);

    return {
        timeGroupKeySqlInfo: sUsesNumericBaseTime
            ? {
                  outerTimeExpressionSql: M_TIME_ALIAS,
                  nonRollupBucketIntervalSeconds: 1,
              }
            : useRollup
              ? buildRollupTimeGroupKeySqlInfo()
              : buildNonRollupTimeGroupKeySqlInfo(intervalUnit),
        sourceWhereSql: buildSourceWhereSqlPart(
            sourceColumnMap.name,
            tagNameList,
            sourceColumnMap.time,
            fetchTimeRange.startTime,
            fetchTimeRange.endTime,
            !sUsesNumericBaseTime,
        ),
        timeAxisKind: sUsesNumericBaseTime ? 'numeric' : 'datetime',
    };
}

type BuildAxisTimeGroupKeySqlParams = {
    sourceColumnMap: SeriesFetchColumnMap;
    intervalUnit: string;
    intervalSize: number;
    useRollup: boolean;
    timeAxisKind: TimeAxisSqlKind;
    fetchTimeRange: TimeRangeNs;
    requestedRowCount: number;
};

function buildAxisTimeGroupKeySql({
    sourceColumnMap,
    intervalUnit,
    intervalSize,
    useRollup,
    timeAxisKind,
    fetchTimeRange,
    requestedRowCount,
}: BuildAxisTimeGroupKeySqlParams): string {
    return timeAxisKind === 'numeric'
        ? buildNumericTimeGroupKeySql(
              sourceColumnMap.time,
              intervalUnit,
              intervalSize,
              useRollup,
              fetchTimeRange,
              requestedRowCount,
          )
        : buildDateTimeGroupKeySql(
              sourceColumnMap.time,
              intervalUnit,
              intervalSize,
              useRollup,
          );
}

function buildDateTimeGroupKeySql(
    timeColumnName: string,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
): string {
    return useRollup
        ? buildRollupTimeGroupKeySqlPart(
              timeColumnName,
              intervalUnit,
              intervalSize,
          )
        : buildDateBinTimeGroupKeySqlPart(
              timeColumnName,
              intervalUnit,
              intervalSize,
          );
}

function buildNumericTimeGroupKeySql(
    timeColumnName: string,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
): string {
    return useRollup
        ? buildRollupTimeGroupKeySqlPart(
              timeColumnName,
              intervalUnit,
              intervalSize,
          )
        : buildNumericBaseTimeGroupKeySql(
              timeColumnName,
              fetchTimeRange,
              requestedRowCount,
          );
}
function buildNumericBaseTimeGroupKeySql(
    timeColumnName: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
): string {
    const sStartTime = getNumericBaseTimeRangeValue(fetchTimeRange.startTime);
    const sBucketSize = getNumericBaseTimeBucketSize(
        fetchTimeRange,
        requestedRowCount,
    );

    return sBucketSize > 0
        ? `(${buildSqlIdentifierPath(timeColumnName, 'SQL time column')} - ${sStartTime}) / (${sBucketSize}) * (${sBucketSize}) + ${sStartTime}`
        : buildSqlIdentifierPath(timeColumnName, 'SQL time column');
}

function getNumericBaseTimeBucketSize(
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
): number {
    const sStartTime = getNumericBaseTimeRangeValue(fetchTimeRange.startTime);
    const sEndTime = getNumericBaseTimeRangeValue(fetchTimeRange.endTime);
    const sRangeWidth = sEndTime - sStartTime;
    if (sRangeWidth <= 0 || requestedRowCount <= 0) {
        return 0;
    }

    const sBucketSize = Math.ceil(sRangeWidth / requestedRowCount);

    return Number.isFinite(sBucketSize) && sBucketSize > 1
        ? sBucketSize
        : 0;
}

function getNumericBaseTimeRangeValue(value: TimeRangeNs['startTime']): number {
    return typeof value === 'number' ? value : Number(value);
}

function shouldUseRollupTimeGroupKey(
    useRollup: boolean,
    rollupTableList: RollupTableMap,
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

    const sLookupKey = getRollupMetadataLookupKey(tableName);
    if (!sLookupKey) {
        return undefined;
    }

    const sUserEntry = asRecord(sRollupMetadataRecord[sLookupKey.userName]);
    if (!sUserEntry) {
        return undefined;
    }

    return asRollupTableEntry(sUserEntry[sLookupKey.tableName]);
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
