import { buildArrayElementSql } from '@/utils/arrayValue';
import { jsonValueFieldToNumericSql, toSqlValueExpressionForAggregator } from '@/utils/dashboardJsonValue';
import type { ValidatedPanelSeriesSourceColumns } from '../seriesModel';

/** One projection shared by raw data, aggregation, boundary rows and FFT. */
export function seriesValueSql(columns: ValidatedPanelSeriesSourceColumns, aggregator?: string): string {
    if (columns.arrayIndex !== undefined) {
        return buildArrayElementSql(columns.value, columns.arrayIndex, columns.arrayMetadata);
    }
    return aggregator
        ? toSqlValueExpressionForAggregator(columns.value, aggregator, columns.jsonKey)
        : jsonValueFieldToNumericSql(columns.value, columns.jsonKey);
}
