import type { SeriesFetchColumnMap } from '../FetchTypes';
import type { TimeRangeNs } from '../../time/types/TimeTypes';
import { shouldUseExtendedFirstLastRollup } from './parts/CalculationRollupEligibility';
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
    const subSql = buildAggregateSubSql(
        calculationMode,
        sourceTableName,
        sourceColumnMap.value,
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
    const subSql = buildAverageSubSql(
        sourceTableName,
        sourceColumnMap.value,
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
    const subSql = buildCountSubSql(
        sourceTableName,
        sourceColumnMap.value,
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
    const subSql = buildFirstLastSubSql(
        calculationMode,
        sourceTableName,
        sourceColumnMap.value,
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
