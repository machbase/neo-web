import { getTqlChart } from '@/api/repository/machiot';
import { jsonValueFieldToNumericSql } from '@/utils/dashboardJsonValue';
import { asRecord } from '../objectGuards';
import {
    isNumericBaseTimeSourceColumns,
    parseSqlIdentifierPath,
    validatePanelSeriesSourceColumns,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
    type SqlIdentifierPath,
    type ValidatedPanelSeriesSourceColumns,
} from '../seriesModel';
import type { AxisRange } from '../range/rangeModel';
import {
    buildSqlStringLiteral,
    buildTqlDoubleQuotedString,
    buildTimeRangeConditionSql,
} from './sql';

export type FftChartData = {
    [key: string]: unknown;
    chartID: string;
};

const FFT_CHART_REQUEST_FAILED_MESSAGE: string = 'Failed to fetch FFT chart.';

const FFT_2D_QUERY_TEMPLATE: string = `MAPKEY('fft')
GROUPBYKEY()
FFT({MinMaxHz})
CHART(
    size('100%', '100%'),
    theme("dark"),
    chartOption({
        xAxis: { type: "category", name: "Hz", data: column(0) },
        yAxis: { name: "Amplitude" },
        dataZoom: [{ type: "slider", start: 0, end: 10 }],
        backgroundColor: "#252525",
        tooltip: { trigger: "axis" },
        series: [{ type: "line", data: column(1) }]
    })
)`;

const FFT_3D_QUERY_TEMPLATE: string = `MAPKEY( roundTime(value(0), '{interval}ms') )
GROUPBYKEY()
FFT({MinMaxHz})
FLATTEN()
PUSHKEY('fft')
MAPVALUE(0, list(value(0), value(1), value(2)))
POPVALUE(1, 2)
CHART(
    plugins("gl"),
    size('100%', '100%'),
    chartOption({
        backgroundColor: "#252525",
        tooltip: { backgroundColor: "rgba(50,50,50,0.9)", borderColor: "#555", textStyle: { color: "#fff" } },
        xAxis3D: { type: "time", name: "time", nameTextStyle: { color: "#ccc" }, axisLabel: { color: "#aaa" }, axisLine: { lineStyle: { color: "#666" } }, splitLine: { lineStyle: { color: "#444" } }, axisPointer: { lineStyle: { color: "#888" } } },
        yAxis3D: { type: "value", name: "Hz", nameTextStyle: { color: "#ccc" }, axisLabel: { color: "#aaa" }, axisLine: { lineStyle: { color: "#666" } }, splitLine: { lineStyle: { color: "#444" } }, axisPointer: { lineStyle: { color: "#888" } } },
        zAxis3D: { type: "value", name: "Amp", nameTextStyle: { color: "#ccc" }, axisLabel: { color: "#aaa" }, axisLine: { lineStyle: { color: "#666" } }, splitLine: { lineStyle: { color: "#444" } }, axisPointer: { lineStyle: { color: "#888" } } },
        grid3D: { viewControl: {}, light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } } },
        visualMap: { show: true, min: 0, max: 80.0, inRange: { color: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"] } },
        series: [{ type: "bar3D", data: column(0), shading: "lambert" }]
    }),
    chartJSCode({ document.querySelector('.chart_container').firstChild.style.backgroundColor = '#252525'; })
)`;

async function fetchFftChartData(
    series: PanelSeriesDefinition,
    timeRange: AxisRange,
    minHz: number,
    maxHz: number,
    threeDimensionalIntervalMs?: number,
    signal?: AbortSignal,
): Promise<FftChartData> {
    const is3d: boolean = threeDimensionalIntervalMs !== undefined;
    const configuredColumns: PanelSeriesSourceColumns = series.sourceColumns;
    const sourceColumns: PanelSeriesSourceColumns = is3d
        ? {
              ...configuredColumns,
              name: configuredColumns.name.toLowerCase(),
              time: configuredColumns.time.toLowerCase(),
              value: configuredColumns.value.toLowerCase(),
          }
        : configuredColumns;
    const tableName: SqlIdentifierPath = parseSqlIdentifierPath(series.table, 'SQL table name');
    const columns: ValidatedPanelSeriesSourceColumns =
        validatePanelSeriesSourceColumns(sourceColumns);
    const sql: string = buildFftSql(tableName, series.sourceTagName, columns, timeRange);
    const chartTql: string = (is3d ? FFT_3D_QUERY_TEMPLATE : FFT_2D_QUERY_TEMPLATE)
        .replace('{MinMaxHz}', buildFftFrequencyArguments(minHz, maxHz))
        .replace('{interval}', String(threeDimensionalIntervalMs));

    return parseFftChartData(
        await getTqlChart(
            `SQL(${buildTqlDoubleQuotedString(sql)})\n${chartTql}`,
            undefined,
            signal,
        ),
    );
}

export const fftApi = { fetchFftChartData };

function buildFftFrequencyArguments(minHz: number, maxHz: number): string {
    return minHz === 0 && maxHz === 0 ? '' : `minHz(${minHz}), maxHz(${maxHz})`;
}

function buildFftSql(
    tableName: SqlIdentifierPath,
    tagName: string,
    columns: ValidatedPanelSeriesSourceColumns,
    timeRange: AxisRange,
): string {
    const usesNumericTime: boolean = isNumericBaseTimeSourceColumns(columns);
    const timeColumn: SqlIdentifierPath = columns.time;

    return [
        `SELECT ${timeColumn}, ${jsonValueFieldToNumericSql(columns.value, columns.jsonKey)}`,
        `FROM ${tableName}`,
        `WHERE ${columns.name} IN (${buildSqlStringLiteral(tagName)})`,
        `AND ${buildTimeRangeConditionSql(columns.time, timeRange, usesNumericTime)}`,
        `ORDER BY ${timeColumn}`,
    ].join(' ');
}

function parseFftChartData(value: unknown): FftChartData {
    const response: Record<string, unknown> | undefined = asRecord(value);
    const headers: Record<string, unknown> | undefined = asRecord(response?.headers);
    const data: Record<string, unknown> | undefined = asRecord(response?.data);
    if (
        response?.status !== 200 ||
        headers?.['x-chart-type'] !== 'echarts' ||
        typeof data?.chartID !== 'string'
    ) {
        throw new Error(FFT_CHART_REQUEST_FAILED_MESSAGE);
    }

    return {
        ...data,
        chartID: data.chartID,
    };
}
